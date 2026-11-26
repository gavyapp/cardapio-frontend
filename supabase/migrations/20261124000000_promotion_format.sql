-- Formato das promoções (ADR 0006).
--
-- Três tipos, em promotions.kind:
--   product_discount  desconto nos produtos ligados em promotion_products
--   free_delivery     entrega grátis a partir de um subtotal
--   order_discount    desconto no pedido a partir de um subtotal
--
-- rule diz o desconto de cada tipo e schedule diz quando a promoção vale.
-- Os checks abaixo recusam qualquer JSON fora do formato, mesmo gravado
-- direto pela API. O preço de cada produto não entra no check: uma promoção
-- que não baixa o preço de um produto simplesmente não vale para ele.

-- Regra do desconto, conforme o tipo.
--   product_discount  {"mode": "percent" | "amount_off" | "fixed_price", "value": n}
--   free_delivery     {"min_subtotal": n}   0 = qualquer pedido
--   order_discount    {"min_subtotal": n, "mode": "percent" | "amount_off", "value": n}
-- Valores em reais com até 2 casas; percentual maior que 0 e menor que 100.
create function private.promotion_rule_is_valid(p_kind text, p_rule jsonb)
 returns boolean
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  v_keys  text[];
  v_mode  text;
  v_value numeric;
  v_min   numeric;
begin
  if p_rule is null or jsonb_typeof(p_rule) <> 'object' then
    return false;
  end if;

  select coalesce(array_agg(k order by k), '{}') into v_keys
  from jsonb_object_keys(p_rule) k;

  -- Valor em reais: número, sem passar de 2 casas.
  if p_rule ? 'value' then
    if jsonb_typeof(p_rule -> 'value') <> 'number' then
      return false;
    end if;
    v_value := (p_rule ->> 'value')::numeric;
    if v_value <= 0 or v_value <> round(v_value, 2) then
      return false;
    end if;
  end if;

  if p_rule ? 'min_subtotal' then
    if jsonb_typeof(p_rule -> 'min_subtotal') <> 'number' then
      return false;
    end if;
    v_min := (p_rule ->> 'min_subtotal')::numeric;
    if v_min < 0 or v_min <> round(v_min, 2) then
      return false;
    end if;
  end if;

  v_mode := p_rule ->> 'mode';

  case p_kind
    when 'product_discount' then
      return v_keys = array['mode', 'value']
        and v_mode in ('percent', 'amount_off', 'fixed_price')
        and (v_mode <> 'percent' or v_value < 100);

    when 'free_delivery' then
      return v_keys = array['min_subtotal'];

    when 'order_discount' then
      return v_keys = array['min_subtotal', 'mode', 'value']
        and v_min > 0
        and v_mode in ('percent', 'amount_off')
        and (v_mode <> 'percent' or v_value < 100)
        -- Desconto fixo menor que o mínimo: o pedido nunca fica de graça.
        and (v_mode <> 'amount_off' or v_value < v_min);

    else
      return false;
  end case;
end;
$function$;

-- Quando a promoção vale, no fuso de São Paulo.
--   {"type": "always"}
--   {"type": "weekly", "weekdays": [0..6]}                       dia todo
--   {"type": "weekly", "weekdays": [...], "from": "HH:MM", "to": "HH:MM"}
--   {"type": "dates", "start": "AAAA-MM-DD", "end": "AAAA-MM-DD"}
-- weekdays: 0 = domingo ... 6 = sábado, sem repetir, pelo menos um.
-- from antes de to, sem atravessar a meia-noite. start até end, dias
-- inteiros, start <= end.
create function private.promotion_schedule_is_valid(p_schedule jsonb)
 returns boolean
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  v_keys  text[];
  v_days  jsonb;
  v_hour  constant text := '^([01][0-9]|2[0-3]):[0-5][0-9]$';
  v_date  constant text := '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
  v_start date;
  v_end   date;
begin
  if p_schedule is null or jsonb_typeof(p_schedule) <> 'object' then
    return false;
  end if;

  select coalesce(array_agg(k order by k), '{}') into v_keys
  from jsonb_object_keys(p_schedule) k;

  case p_schedule ->> 'type'
    when 'always' then
      return v_keys = array['type'];

    when 'weekly' then
      if not (v_keys = array['type', 'weekdays']
              or v_keys = array['from', 'to', 'type', 'weekdays']) then
        return false;
      end if;

      v_days := p_schedule -> 'weekdays';
      if jsonb_typeof(v_days) <> 'array' or jsonb_array_length(v_days) = 0 then
        return false;
      end if;
      -- Cada dia é um inteiro de 0 a 6, sem repetir.
      if exists (
        select 1 from jsonb_array_elements(v_days) d
        where jsonb_typeof(d) <> 'number'
           or d::text !~ '^[0-6]$'
      ) or (select count(distinct d) from jsonb_array_elements(v_days) d)
           <> jsonb_array_length(v_days) then
        return false;
      end if;

      if p_schedule ? 'from' then
        return jsonb_typeof(p_schedule -> 'from') = 'string'
          and jsonb_typeof(p_schedule -> 'to') = 'string'
          and p_schedule ->> 'from' ~ v_hour
          and p_schedule ->> 'to' ~ v_hour
          and p_schedule ->> 'from' < p_schedule ->> 'to';
      end if;
      return true;

    when 'dates' then
      if v_keys <> array['end', 'start', 'type']
         or jsonb_typeof(p_schedule -> 'start') <> 'string'
         or jsonb_typeof(p_schedule -> 'end') <> 'string'
         or p_schedule ->> 'start' !~ v_date
         or p_schedule ->> 'end' !~ v_date then
        return false;
      end if;
      -- make_date recusa datas que não existem (2026-02-30).
      begin
        v_start := make_date(
          substr(p_schedule ->> 'start', 1, 4)::int,
          substr(p_schedule ->> 'start', 6, 2)::int,
          substr(p_schedule ->> 'start', 9, 2)::int);
        v_end := make_date(
          substr(p_schedule ->> 'end', 1, 4)::int,
          substr(p_schedule ->> 'end', 6, 2)::int,
          substr(p_schedule ->> 'end', 9, 2)::int);
      exception when others then
        return false;
      end;
      return v_start <= v_end;

    else
      return false;
  end case;
end;
$function$;

-- Os checks rodam com o papel de quem grava.
revoke all on function private.promotion_rule_is_valid(text, jsonb) from public, anon;
grant execute on function private.promotion_rule_is_valid(text, jsonb) to authenticated, service_role;
revoke all on function private.promotion_schedule_is_valid(jsonb) from public, anon;
grant execute on function private.promotion_schedule_is_valid(jsonb) to authenticated, service_role;

-- O padrão {} não é um formato válido: rule e schedule passam a ser
-- obrigatórios na gravação.
alter table public.promotions
  alter column rule drop default,
  alter column schedule drop default;

alter table public.promotions
  add constraint promotions_kind_check
    check (kind in ('product_discount', 'free_delivery', 'order_discount')),
  add constraint promotions_rule_check
    check (private.promotion_rule_is_valid(kind, rule)),
  add constraint promotions_schedule_check
    check (private.promotion_schedule_is_valid(schedule)),
  -- Alvo da chave composta de promotion_products.
  add constraint promotions_store_id_id_key unique (store_id, id);

-- Produtos de cada promoção do tipo product_discount. A chave inclui o
-- store_id: promoção e produto precisam ser da mesma loja.
create table public.promotion_products (
  store_id uuid not null,
  promotion_id uuid not null,
  product_id uuid not null,
  created_at timestamp with time zone default now() not null,
  constraint promotion_products_pkey primary key (promotion_id, product_id),
  constraint promotion_products_promotion_id_fkey
    foreign key (store_id, promotion_id)
    references public.promotions (store_id, id) on delete cascade,
  constraint promotion_products_product_id_fkey
    foreign key (store_id, product_id)
    references public.products (store_id, id) on delete cascade
);

create index promotion_products_store_product_idx
  on public.promotion_products using btree (store_id, product_id);

-- Só promoção de produto tem produtos. Trocar o tipo de uma promoção que
-- ainda tem produtos também é recusado: quem troca apaga os produtos antes,
-- na mesma transação.
create function private.promotion_products_need_product_kind()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if tg_table_name = 'promotion_products' then
    if not exists (
      select 1 from public.promotions p
      where p.id = new.promotion_id and p.kind = 'product_discount'
    ) then
      raise exception 'só promoção de produto tem produtos'
        using errcode = 'check_violation', hint = 'promotion_kind_without_products';
    end if;
  elsif new.kind <> 'product_discount' and exists (
    select 1 from public.promotion_products pp where pp.promotion_id = new.id
  ) then
    raise exception 'a promoção ainda tem produtos'
      using errcode = 'check_violation', hint = 'promotion_kind_without_products';
  end if;
  return new;
end;
$function$;

revoke all on function private.promotion_products_need_product_kind() from public, anon, authenticated;

create trigger promotion_products_need_product_kind
  before insert or update of promotion_id on public.promotion_products
  for each row execute function private.promotion_products_need_product_kind();

create trigger promotions_kind_keeps_products
  before update of kind on public.promotions
  for each row when (old.kind is distinct from new.kind)
  execute function private.promotion_products_need_product_kind();

alter table public.promotion_products enable row level security;

-- O cardápio lê os produtos das promoções ligadas, como lê as promoções.
create policy "public read active promotion_products" on public.promotion_products
  for select to public using (exists (
    select 1 from public.promotions p
    where p.id = promotion_products.promotion_id
      and p.is_active and p.deleted_at is null
  ));
create policy "members manage promotion_products" on public.promotion_products
  for all to authenticated
  using (private.is_store_member(store_id))
  with check (private.is_store_member(store_id));
