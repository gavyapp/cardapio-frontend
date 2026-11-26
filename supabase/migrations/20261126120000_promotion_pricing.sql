-- Cálculo das promoções (ADR 0006, "Como o desconto se aplica").
--
-- live_promotions devolve o que vale agora numa loja, para o cardápio, e o
-- create_order usa as mesmas funções, então o pedido grava o que o cliente
-- viu. Como no protótipo:
--   - desconto em produtos entra no preço do item (order_items.unit_price);
--   - desconto no pedido vai em orders.discount, sobre o subtotal já com o
--     desconto dos produtos, sem a taxa de entrega;
--   - entrega grátis zera orders.delivery_fee;
--   - orders.applied_promotions lista cada promoção usada e quanto ela
--     economizou: [{"id", "name", "kind", "amount"}].
--
-- A entrega grátis de stores.settings.free_delivery_above vira promoção.

-- Promoção vigente em p_at, no fuso de São Paulo. Só olha o período;
-- ligada e não excluída fica com quem chama.
create function private.promotion_is_live(p_schedule jsonb, p_at timestamptz)
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$
  with agora as (
    select (p_at at time zone 'America/Sao_Paulo') as local
  )
  select case p_schedule ->> 'type'
    when 'always' then true
    when 'weekly' then
      (p_schedule -> 'weekdays') @> to_jsonb(extract(dow from a.local)::int)
      and (
        not p_schedule ? 'from'
        or (a.local::time >= (p_schedule ->> 'from')::time
            and a.local::time < (p_schedule ->> 'to')::time)
      )
    when 'dates' then
      a.local::date between (p_schedule ->> 'start')::date
                        and (p_schedule ->> 'end')::date
    else false
  end
  from agora a;
$function$;

-- Preço de um produto com a regra de uma promoção product_discount,
-- arredondado para centavos (meio para cima). Null quando o resultado não
-- fica entre 0 e o preço cheio: aí o produto segue com o preço cheio.
create function private.promotional_price(p_price numeric, p_rule jsonb)
 returns numeric
 language sql
 immutable
 set search_path to ''
as $function$
  select case when v > 0 and v < p_price then v end
  from (
    select round(case p_rule ->> 'mode'
      when 'percent' then p_price * (1 - (p_rule ->> 'value')::numeric / 100)
      when 'amount_off' then p_price - (p_rule ->> 'value')::numeric
      when 'fixed_price' then (p_rule ->> 'value')::numeric
    end, 2) as v
  ) t;
$function$;

-- Desconto de uma promoção order_discount num subtotal; 0 se o subtotal não
-- alcança o mínimo.
create function private.order_discount_amount(p_rule jsonb, p_subtotal numeric)
 returns numeric
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when p_subtotal < (p_rule ->> 'min_subtotal')::numeric then 0
    when p_rule ->> 'mode' = 'percent'
      then round(p_subtotal * (p_rule ->> 'value')::numeric / 100, 2)
    else least((p_rule ->> 'value')::numeric, p_subtotal)
  end;
$function$;

-- Promoções ligadas, não excluídas e vigentes da loja em p_at.
create function private.live_store_promotions(p_store_id uuid, p_at timestamptz)
 returns setof public.promotions
 language sql
 stable
 set search_path to ''
as $function$
  select p.*
  from public.promotions p
  where p.store_id = p_store_id
    and p.is_active
    and p.deleted_at is null
    and private.promotion_is_live(p.schedule, p_at);
$function$;

-- Preço promocional de cada produto da loja em p_at. Se duas promoções
-- valem para o mesmo produto, fica o menor preço; empate, a criada primeiro.
create function private.live_product_prices(p_store_id uuid, p_at timestamptz)
 returns table (product_id uuid, price numeric, promotion_id uuid, promotion_name text)
 language sql
 stable
 set search_path to ''
as $function$
  select distinct on (pr.id)
    pr.id, private.promotional_price(pr.price, p.rule), p.id, p.name
  from private.live_store_promotions(p_store_id, p_at) p
  join public.promotion_products pp on pp.promotion_id = p.id
  join public.products pr on pr.id = pp.product_id and pr.deleted_at is null
  where p.kind = 'product_discount'
    and private.promotional_price(pr.price, p.rule) is not null
  order by pr.id, private.promotional_price(pr.price, p.rule), p.created_at, p.id;
$function$;

revoke all on function private.promotion_is_live(jsonb, timestamptz) from public, anon, authenticated;
revoke all on function private.promotional_price(numeric, jsonb) from public, anon, authenticated;
revoke all on function private.order_discount_amount(jsonb, numeric) from public, anon, authenticated;
revoke all on function private.live_store_promotions(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.live_product_prices(uuid, timestamptz) from public, anon, authenticated;

-- O que vale agora na loja, para o cardápio:
--   {
--     "products": [{"product_id", "price", "promotion_id", "promotion_name"}],
--     "free_delivery": {"id", "name", "min_subtotal"} | null,
--     "order_discounts": [{"id", "name", "min_subtotal", "mode", "value"}]
--   }
-- free_delivery é a de menor mínimo. Loja inexistente, inativa ou excluída
-- volta sem promoções.
create function public.live_promotions(p_store_id uuid, p_at timestamptz default now())
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  with loja as (
    select id from public.stores
    where id = p_store_id and active and deleted_at is null
  ),
  vigentes as (
    select p.* from loja l, private.live_store_promotions(l.id, p_at) p
  )
  select jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', pp.product_id,
        'price', pp.price,
        'promotion_id', pp.promotion_id,
        'promotion_name', pp.promotion_name
      ) order by pp.product_id)
      from loja l, private.live_product_prices(l.id, p_at) pp
    ), '[]'::jsonb),
    'free_delivery', (
      select jsonb_build_object(
        'id', v.id,
        'name', v.name,
        'min_subtotal', (v.rule ->> 'min_subtotal')::numeric
      )
      from vigentes v
      where v.kind = 'free_delivery'
      order by (v.rule ->> 'min_subtotal')::numeric, v.created_at, v.id
      limit 1
    ),
    'order_discounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'name', v.name,
        'min_subtotal', (v.rule ->> 'min_subtotal')::numeric,
        'mode', v.rule ->> 'mode',
        'value', (v.rule ->> 'value')::numeric
      ) order by v.created_at, v.id)
      from vigentes v
      where v.kind = 'order_discount'
    ), '[]'::jsonb)
  );
$function$;

revoke all on function public.live_promotions(uuid, timestamptz) from public;
grant execute on function public.live_promotions(uuid, timestamptz) to anon, authenticated, service_role;

-- create_order com as promoções. O resto é o mesmo da versão anterior
-- (20261117130000).
create or replace function public.create_order(p_store_id uuid, p_mode order_mode, p_customer_name text, p_customer_phone text, p_payment_method payment_method, p_items jsonb, p_address jsonb DEFAULT NULL::jsonb, p_change_for numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_store        public.stores%rowtype;
  v_customer_id  uuid;
  v_order_id     uuid;
  v_number       integer;
  v_token        text;
  v_subtotal     numeric(10,2) := 0;
  v_delivery_fee numeric(10,2) := 0;
  v_discount     numeric(10,2) := 0;
  v_total        numeric(10,2);
  v_min_order    numeric(10,2);
  v_zone         jsonb;
  v_address      jsonb := p_address;

  -- Promoções: preços promocionais por produto, economia por promoção de
  -- produto e a lista gravada em applied_promotions.
  v_prices       jsonb;
  v_price        jsonb;
  v_unit_price   numeric(10,2);
  v_savings      jsonb := '{}'::jsonb;
  v_applied      jsonb := '[]'::jsonb;
  v_promo        record;

  v_item         jsonb;
  v_comp         jsonb;
  v_product      public.products%rowtype;
  v_complement   public.complements%rowtype;
  v_group        public.complement_groups%rowtype;
  v_item_id      uuid;
  v_qty          smallint;
  v_comp_qty     smallint;
  v_item_total   numeric(10,2);
  v_group_counts jsonb;
  v_group_rec    record;
  v_count        integer;
begin
  -- Loja
  select * into v_store
  from public.stores
  where id = p_store_id and active and deleted_at is null;
  if not found then
    raise exception 'Loja indisponível' using errcode = 'P0001', hint = 'store_unavailable';
  end if;

  -- Loja fechada não recebe pedido
  if not public.is_store_open(p_store_id) then
    raise exception 'Loja fechada' using errcode = 'P0001', hint = 'store_closed';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido sem itens' using errcode = 'P0001', hint = 'invalid_request';
  end if;
  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Nome e telefone são obrigatórios' using errcode = 'P0001', hint = 'invalid_request';
  end if;
  if p_mode = 'ENTREGA' and p_address is null then
    raise exception 'Endereço é obrigatório para entrega' using errcode = 'P0001', hint = 'invalid_request';
  end if;
  -- Forma de pagamento aceita pela loja (sem a chave, aceita todas)
  if jsonb_typeof(v_store.settings -> 'payment_methods') = 'array'
     and not (v_store.settings -> 'payment_methods') ? p_payment_method::text then
    raise exception 'Forma de pagamento não aceita pela loja' using errcode = 'P0001', hint = 'payment_not_accepted';
  end if;
  if p_payment_method <> 'DINHEIRO' and p_change_for is not null then
    p_change_for := null;
  end if;

  -- Bairro do pedido: o que a loja cadastrou em settings.delivery_zones com
  -- o id que veio no endereço. O nome gravado no pedido é o do cadastro.
  if p_mode = 'ENTREGA' and jsonb_typeof(v_store.settings -> 'delivery_zones') = 'array' then
    select z into v_zone
    from jsonb_array_elements(v_store.settings -> 'delivery_zones') z
    where z ->> 'id' = p_address ->> 'zone_id'
    limit 1;
    if v_zone is not null then
      v_address := p_address || jsonb_build_object('district', v_zone ->> 'name');
    end if;
  end if;

  -- Preços promocionais de agora, os mesmos que o cardápio mostra.
  select coalesce(jsonb_object_agg(pp.product_id::text, jsonb_build_object(
           'price', pp.price, 'id', pp.promotion_id, 'name', pp.promotion_name)), '{}'::jsonb)
    into v_prices
  from private.live_product_prices(p_store_id, now()) pp;

  -- Cliente (upsert por loja + telefone)
  insert into public.customers (store_id, phone, name, last_address)
  values (p_store_id, p_customer_phone, p_customer_name,
          case when p_mode = 'ENTREGA' then v_address else null end)
  on conflict (store_id, phone) do update
    set name         = excluded.name,
        last_address = coalesce(excluded.last_address, public.customers.last_address),
        deleted_at   = null
  returning id into v_customer_id;

  -- Pedido (número e total são preenchidos ao final)
  v_number := public.next_order_number(p_store_id);

  insert into public.orders (
    store_id, customer_id, number, status, mode,
    customer_name, customer_phone, address,
    payment_method, change_for, subtotal, delivery_fee, discount, total, notes
  ) values (
    p_store_id, v_customer_id, v_number, 'RECEBIDO', p_mode,
    p_customer_name, p_customer_phone,
    case when p_mode = 'ENTREGA' then v_address else null end,
    p_payment_method, p_change_for, 0, 0, 0, 0, p_notes
  )
  returning id, public_token into v_order_id, v_token;

  -- Itens
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 1);
    if v_qty < 1 then
      raise exception 'Quantidade inválida' using errcode = 'P0001', hint = 'invalid_request';
    end if;

    -- Categoria desligada ou excluída também deixa o produto indisponível
    select p.* into v_product
    from public.products p
    join public.categories cat on cat.id = p.category_id
    where p.id = (v_item ->> 'product_id')::uuid
      and p.store_id = p_store_id
      and p.is_available
      and p.deleted_at is null
      and cat.is_available
      and cat.deleted_at is null;
    if not found then
      raise exception 'Produto indisponível: %', v_item ->> 'product_id' using errcode = 'P0001', hint = 'item_unavailable', detail = v_item ->> 'product_id';
    end if;

    -- Preço com o desconto de produto, se houver; a economia fica anotada
    -- na promoção.
    v_price := v_prices -> v_product.id::text;
    v_unit_price := coalesce((v_price ->> 'price')::numeric, v_product.price);
    if v_price is not null then
      v_savings := jsonb_set(
        v_savings,
        array[v_price ->> 'id'],
        jsonb_build_object(
          'name', v_price ->> 'name',
          'amount', coalesce((v_savings -> (v_price ->> 'id') ->> 'amount')::numeric, 0)
                    + (v_product.price - v_unit_price) * v_qty
        )
      );
    end if;

    v_item_total := v_unit_price * v_qty;

    insert into public.order_items (store_id, order_id, product_id, name, unit_price, quantity, notes, total)
    values (p_store_id, v_order_id, v_product.id, v_product.name, v_unit_price, v_qty,
            v_item ->> 'notes', 0)
    returning id into v_item_id;

    -- Complementos do item
    v_group_counts := '{}'::jsonb;
    for v_comp in select * from jsonb_array_elements(coalesce(v_item -> 'complements', '[]'::jsonb)) loop
      v_comp_qty := coalesce((v_comp ->> 'quantity')::int, 1);
      if v_comp_qty < 1 then
        raise exception 'Quantidade de complemento inválida' using errcode = 'P0001', hint = 'invalid_request';
      end if;

      select c.* into v_complement
      from public.complements c
      join public.product_complement_groups pcg
        on pcg.complement_group_id = c.complement_group_id
       and pcg.product_id = v_product.id
      -- Grupo excluído não oferece complemento
      join public.complement_groups g
        on g.id = c.complement_group_id
       and g.deleted_at is null
      where c.id = (v_comp ->> 'complement_id')::uuid
        and c.store_id = p_store_id
        and c.is_available
        and c.deleted_at is null;
      if not found then
        raise exception 'Complemento indisponível para o produto %: %', v_product.name, v_comp ->> 'complement_id'
          using errcode = 'P0001', hint = 'invalid_complement', detail = v_product.id::text;
      end if;

      select * into v_group from public.complement_groups where id = v_complement.complement_group_id;

      if v_comp_qty > 1 and not v_group.allow_repeat then
        raise exception 'O grupo % não permite repetir item', v_group.name using errcode = 'P0001', hint = 'invalid_complement', detail = v_product.id::text;
      end if;

      -- acumula contagem por grupo para validar min/max
      v_group_counts := jsonb_set(
        v_group_counts,
        array[v_group.id::text],
        to_jsonb(coalesce((v_group_counts ->> v_group.id::text)::int, 0) + v_comp_qty)
      );

      insert into public.order_item_complements
        (store_id, order_item_id, complement_id, group_name, name, price, quantity)
      values
        (p_store_id, v_item_id, v_complement.id, v_group.name, v_complement.name, v_complement.price, v_comp_qty);

      v_item_total := v_item_total + (v_complement.price * v_comp_qty * v_qty);
    end loop;

    -- valida min/max de todos os grupos vinculados ao produto
    for v_group_rec in
      select g.id, g.name, g.min_select, g.max_select
      from public.product_complement_groups pcg
      join public.complement_groups g on g.id = pcg.complement_group_id
      where pcg.product_id = v_product.id and g.deleted_at is null
    loop
      v_count := coalesce((v_group_counts ->> v_group_rec.id::text)::int, 0);
      if v_count < v_group_rec.min_select then
        raise exception 'Escolha pelo menos % em %', v_group_rec.min_select, v_group_rec.name
          using errcode = 'P0001', hint = 'invalid_complement', detail = v_product.id::text;
      end if;
      if v_count > v_group_rec.max_select then
        raise exception 'Escolha no máximo % em %', v_group_rec.max_select, v_group_rec.name
          using errcode = 'P0001', hint = 'invalid_complement', detail = v_product.id::text;
      end if;
    end loop;

    update public.order_items set total = v_item_total where id = v_item_id;
    v_subtotal := v_subtotal + v_item_total;
  end loop;

  -- Promoções de produto usadas, na ordem do nome.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.key, 'name', s.value ->> 'name', 'kind', 'product_discount',
           'amount', (s.value ->> 'amount')::numeric) order by s.value ->> 'name', s.key), '[]'::jsonb)
    into v_applied
  from jsonb_each(v_savings) s;

  -- Pedido mínimo e taxa de entrega
  v_min_order := coalesce((v_store.settings ->> 'min_order')::numeric, 0);

  if v_subtotal < v_min_order then
    raise exception 'Pedido mínimo é R$ %', v_min_order using errcode = 'P0001', hint = 'minimum_order';
  end if;

  if p_mode = 'ENTREGA' then
    v_delivery_fee := coalesce((v_store.settings ->> 'delivery_fee')::numeric, 0);
    -- Bairro cadastrado tem taxa própria; os outros locais ficam com a de cima.
    if v_zone is not null then
      v_delivery_fee := coalesce((v_zone ->> 'fee')::numeric, v_delivery_fee);
    end if;

    -- Entrega grátis: a de menor mínimo entre as que o subtotal alcança.
    select p.id, p.name into v_promo
    from private.live_store_promotions(p_store_id, now()) p
    where p.kind = 'free_delivery'
      and v_subtotal >= (p.rule ->> 'min_subtotal')::numeric
    order by (p.rule ->> 'min_subtotal')::numeric, p.created_at, p.id
    limit 1;
    if found and v_delivery_fee > 0 then
      v_applied := v_applied || jsonb_build_array(jsonb_build_object(
        'id', v_promo.id, 'name', v_promo.name, 'kind', 'free_delivery',
        'amount', v_delivery_fee));
      v_delivery_fee := 0;
    end if;
  end if;

  -- Desconto no pedido: o maior entre os vigentes que o subtotal alcança.
  select p.id, p.name, private.order_discount_amount(p.rule, v_subtotal) as amount
    into v_promo
  from private.live_store_promotions(p_store_id, now()) p
  where p.kind = 'order_discount'
    and private.order_discount_amount(p.rule, v_subtotal) > 0
  order by 3 desc, p.created_at, p.id
  limit 1;
  if found then
    v_discount := v_promo.amount;
    v_applied := v_applied || jsonb_build_array(jsonb_build_object(
      'id', v_promo.id, 'name', v_promo.name, 'kind', 'order_discount',
      'amount', v_discount));
  end if;

  v_total := v_subtotal + v_delivery_fee - v_discount;

  -- Troco para menos que o total não fecha a conta
  if p_change_for is not null and p_change_for < v_total then
    raise exception 'Troco deve ser maior ou igual ao total (R$ %)', v_total using errcode = 'P0001', hint = 'invalid_change';
  end if;

  update public.orders
     set subtotal           = v_subtotal,
         delivery_fee       = v_delivery_fee,
         discount           = v_discount,
         total              = v_total,
         applied_promotions = v_applied
   where id = v_order_id;

  insert into public.order_events (store_id, order_id, user_id, from_status, to_status)
  values (p_store_id, v_order_id, null, null, 'RECEBIDO');

  return jsonb_build_object(
    'id', v_order_id,
    'number', v_number,
    'public_token', v_token,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'discount', v_discount,
    'total', v_total,
    'applied_promotions', v_applied
  );
end;
$function$;

-- Entrega grátis das configurações vira promoção "Sempre", ligada, com o
-- mesmo mínimo, e a chave sai de stores.settings.
insert into public.promotions (store_id, name, kind, rule, schedule, is_active)
select s.id,
       case when v.min = 0 then 'Entrega grátis'
            else 'Entrega grátis acima de R$ ' ||
                 case when v.min = trunc(v.min) then trunc(v.min)::text
                      else replace(to_char(v.min, 'FM999999990.00'), '.', ',') end
       end,
       'free_delivery',
       jsonb_build_object('min_subtotal', v.min),
       '{"type": "always"}'::jsonb,
       true
from public.stores s
cross join lateral (
  select round((s.settings ->> 'free_delivery_above')::numeric, 2) as min
) v
where jsonb_typeof(s.settings -> 'free_delivery_above') = 'number';

update public.stores
   set settings = settings - 'free_delivery_above'
 where settings ? 'free_delivery_above';
