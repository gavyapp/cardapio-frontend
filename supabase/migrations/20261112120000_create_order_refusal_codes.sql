-- Recusas do create_order com código estável no HINT, para a rota de criação
-- de pedido responder o motivo sem depender do texto da mensagem (mesmo
-- padrão do update_order_status):
--   store_unavailable    → loja inexistente, inativa ou excluída
--   store_closed         → loja fechada
--   invalid_request      → pedido sem itens, sem nome ou telefone, entrega
--                          sem endereço, quantidade inválida
--   payment_not_accepted → forma de pagamento que a loja não aceita
--   item_unavailable     → produto que saiu do cardápio ou esgotou
--   invalid_complement   → complemento indisponível, repetido onde não pode,
--                          ou grupo fora do mínimo e do máximo
--   minimum_order        → subtotal abaixo do pedido mínimo
--   invalid_change       → troco menor que o total
-- Nas recusas de item (item_unavailable e invalid_complement) o DETAIL leva
-- o id do produto, para o carrinho marcar o item certo. As mensagens e todo
-- o resto da função continuam iguais.

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
  v_free_above   numeric(10,2);

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

  -- Cliente (upsert por loja + telefone)
  insert into public.customers (store_id, phone, name, last_address)
  values (p_store_id, p_customer_phone, p_customer_name,
          case when p_mode = 'ENTREGA' then p_address else null end)
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
    case when p_mode = 'ENTREGA' then p_address else null end,
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

    v_item_total := v_product.price * v_qty;

    insert into public.order_items (store_id, order_id, product_id, name, unit_price, quantity, notes, total)
    values (p_store_id, v_order_id, v_product.id, v_product.name, v_product.price, v_qty,
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

  -- Pedido mínimo, taxa de entrega e total
  v_min_order  := coalesce((v_store.settings ->> 'min_order')::numeric, 0);
  v_free_above := (v_store.settings ->> 'free_delivery_above')::numeric;

  if v_subtotal < v_min_order then
    raise exception 'Pedido mínimo é R$ %', v_min_order using errcode = 'P0001', hint = 'minimum_order';
  end if;

  if p_mode = 'ENTREGA' then
    v_delivery_fee := coalesce((v_store.settings ->> 'delivery_fee')::numeric, 0);
    if v_free_above is not null and v_subtotal >= v_free_above then
      v_delivery_fee := 0;
    end if;
  end if;

  -- Promoções: regras ainda não definidas; desconto fica 0 no MVP.
  v_total := v_subtotal + v_delivery_fee - v_discount;

  -- Troco para menos que o total não fecha a conta
  if p_change_for is not null and p_change_for < v_total then
    raise exception 'Troco deve ser maior ou igual ao total (R$ %)', v_total using errcode = 'P0001', hint = 'invalid_change';
  end if;

  update public.orders
     set subtotal     = v_subtotal,
         delivery_fee = v_delivery_fee,
         discount     = v_discount,
         total        = v_total
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
    'total', v_total
  );
end;
$function$;
