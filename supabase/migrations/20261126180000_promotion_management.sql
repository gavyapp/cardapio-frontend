-- Tela de promoções do painel (ADR 0006, "Liga e desliga").
--
-- - Um produto fica em uma promoção de produto por vez: duas promoções de
--   produto ligadas, não excluídas e não encerradas não dividem produto. O
--   banco recusa, venha da tela ou direto da API.
-- - save_promotion grava a promoção e os produtos numa transação só.
-- - promotion_order_counts conta os pedidos recentes de cada promoção, para
--   a coluna "Pedidos (7 dias)".

-- Promoção que já passou: só "entre datas", depois do último dia, no fuso
-- de São Paulo. As outras voltam a valer no próximo dia ou horário.
create function private.promotion_is_over(p_schedule jsonb, p_at timestamptz)
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$
  select p_schedule ->> 'type' = 'dates'
    and (p_at at time zone 'America/Sao_Paulo')::date > (p_schedule ->> 'end')::date;
$function$;

revoke all on function private.promotion_is_over(jsonb, timestamptz) from public, anon, authenticated;

-- Recusa produto que já está em outra promoção de produto em uso (ligada,
-- não excluída e não encerrada) quando esta também está em uso. Promoção
-- pausada pode repetir produto: é assim que se prepara a próxima.
create function private.promotion_products_are_unique()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_promotion_id uuid;
  -- Só o produto que entrou; null confere todos os produtos da promoção.
  v_product_id   uuid;
  v_product      text;
  v_other        text;
begin
  if tg_table_name = 'promotion_products' then
    v_promotion_id := new.promotion_id;
    v_product_id := new.product_id;
  else
    v_promotion_id := new.id;
  end if;

  select pr.name, other.name into v_product, v_other
  from public.promotions p
  join public.promotion_products pp on pp.promotion_id = p.id
  join public.promotion_products opp
    on opp.product_id = pp.product_id and opp.promotion_id <> p.id
  join public.promotions other on other.id = opp.promotion_id
  join public.products pr on pr.id = pp.product_id
  where p.id = v_promotion_id
    and (v_product_id is null or pp.product_id = v_product_id)
    and p.kind = 'product_discount'
    and p.is_active and p.deleted_at is null
    and not private.promotion_is_over(p.schedule, now())
    and other.kind = 'product_discount'
    and other.is_active and other.deleted_at is null
    and not private.promotion_is_over(other.schedule, now())
  order by pr.name, other.created_at
  limit 1;

  if found then
    raise exception '% já está em "%".', v_product, v_other
      using errcode = 'P0001', hint = 'promotion_product_conflict';
  end if;
  return new;
end;
$function$;

revoke all on function private.promotion_products_are_unique() from public, anon, authenticated;

create trigger promotion_products_are_unique
  after insert or update of product_id, promotion_id on public.promotion_products
  for each row execute function private.promotion_products_are_unique();

-- Ligar, voltar da exclusão ou mudar o período pode pôr a promoção em uso.
create trigger promotions_products_are_unique
  after update of is_active, deleted_at, schedule on public.promotions
  for each row
  when (new.is_active and new.deleted_at is null)
  execute function private.promotion_products_are_unique();

-- Cria ou atualiza uma promoção com os produtos dela. Trocar o tipo apaga os
-- produtos antes (o trigger de promotion_products recusa produto em
-- promoção de outro tipo). Roda com o papel de quem chama: o RLS vale em
-- cada comando, e a checagem de membro só troca o "0 linhas" por um erro
-- claro. Devolve o id.
create function public.save_promotion(
  p_store_id uuid,
  p_name text,
  p_kind text,
  p_rule jsonb,
  p_schedule jsonb,
  p_is_active boolean,
  -- Produtos da promoção de produto; vazio nos outros tipos.
  p_product_ids uuid[],
  -- Sem id: promoção nova.
  p_promotion_id uuid default null
)
 returns uuid
 language plpgsql
 set search_path to ''
as $function$
declare
  v_promotion_id uuid := p_promotion_id;
  v_product_ids  uuid[] := coalesce(p_product_ids, '{}');
begin
  if not private.is_store_member(p_store_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  if p_kind = 'product_discount' and cardinality(v_product_ids) = 0 then
    raise exception 'Escolha pelo menos 1 produto.' using errcode = 'P0001';
  end if;
  if p_kind <> 'product_discount' and cardinality(v_product_ids) > 0 then
    raise exception 'Só promoção de produto tem produtos.' using errcode = 'P0001';
  end if;
  if cardinality(v_product_ids) <> (select count(distinct p) from unnest(v_product_ids) p) then
    raise exception 'Produto repetido na promoção.' using errcode = 'P0001';
  end if;
  if cardinality(v_product_ids) <> (
    select count(*) from public.products
    where id = any(v_product_ids) and store_id = p_store_id and deleted_at is null
  ) then
    raise exception 'Um dos produtos não existe mais. Recarregue a página.'
      using errcode = 'P0001';
  end if;

  if v_promotion_id is null then
    insert into public.promotions (store_id, name, kind, rule, schedule, is_active)
    values (p_store_id, p_name, p_kind, p_rule, p_schedule, p_is_active)
    returning id into v_promotion_id;
  else
    perform 1 from public.promotions
    where id = v_promotion_id and store_id = p_store_id and deleted_at is null
    for update;
    if not found then
      raise exception 'Promoção não encontrada.' using errcode = 'P0001';
    end if;

    delete from public.promotion_products
    where store_id = p_store_id and promotion_id = v_promotion_id;

    update public.promotions
       set name = p_name,
           kind = p_kind,
           rule = p_rule,
           schedule = p_schedule,
           is_active = p_is_active
     where id = v_promotion_id;
  end if;

  insert into public.promotion_products (store_id, promotion_id, product_id)
  select p_store_id, v_promotion_id, p from unnest(v_product_ids) p;

  return v_promotion_id;
end;
$function$;

revoke all on function public.save_promotion(uuid, text, text, jsonb, jsonb, boolean, uuid[], uuid) from public, anon;
grant execute on function public.save_promotion(uuid, text, text, jsonb, jsonb, boolean, uuid[], uuid) to authenticated, service_role;

-- Pedidos da loja desde p_since com cada promoção (applied_promotions),
-- sem os cancelados e recusados. Promoção sem pedido não aparece. Roda com
-- o papel de quem chama: só membros leem os pedidos da loja.
create function public.promotion_order_counts(p_store_id uuid, p_since timestamptz)
 returns table (promotion_id uuid, order_count integer)
 language sql
 stable
 set search_path to ''
as $function$
  select (a ->> 'id')::uuid, count(distinct o.id)::int
  from public.orders o
  cross join lateral jsonb_array_elements(o.applied_promotions) a
  where o.store_id = p_store_id
    and o.created_at >= p_since
    and o.status not in ('CANCELADO', 'REJEITADO')
  group by 1;
$function$;

revoke all on function public.promotion_order_counts(uuid, timestamptz) from public, anon;
grant execute on function public.promotion_order_counts(uuid, timestamptz) to authenticated, service_role;
