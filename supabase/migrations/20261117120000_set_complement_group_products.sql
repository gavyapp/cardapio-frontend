-- Escolher, pela tela de Complementos, em quais produtos um grupo é usado.
--
-- Antes, ligar um grupo a vários produtos exigia abrir e salvar um produto
-- por vez. Esta função recebe a lista completa dos produtos do grupo e
-- ajusta os vínculos numa transação só: sai de quem não está na lista, entra
-- em quem está e ainda não tinha o grupo. Ou tudo grava, ou nada muda.
--
-- Nos produtos que já tinham o grupo nada muda, nem a posição dele. Num
-- produto novo o grupo entra por último, depois dos grupos que o produto já
-- tem, para não mudar a ordem que o cliente vê.
--
-- Roda com o papel de quem chama (security invoker), como save_product e
-- save_complement_group: o RLS continua valendo em cada comando, e a
-- checagem de membro só troca o "0 linhas alteradas" silencioso por um erro
-- claro.

create or replace function public.set_complement_group_products(
  p_store_id uuid,
  p_group_id uuid,
  p_product_ids uuid[]
)
 returns void
 language plpgsql
 set search_path to ''
as $function$
declare
  v_product_ids uuid[] := coalesce(p_product_ids, '{}');
begin
  if not private.is_store_member(p_store_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.complement_groups
    where id = p_group_id and store_id = p_store_id and deleted_at is null
  ) then
    raise exception 'Este grupo não existe mais. Recarregue a página.'
      using errcode = 'P0001';
  end if;

  if cardinality(v_product_ids) <> (select count(distinct p) from unnest(v_product_ids) p) then
    raise exception 'Produto repetido.' using errcode = 'P0001';
  end if;
  if cardinality(v_product_ids) <> (
    select count(*) from public.products
    where id = any(v_product_ids) and store_id = p_store_id and deleted_at is null
  ) then
    raise exception 'Um dos produtos não existe mais. Recarregue a página.'
      using errcode = 'P0001';
  end if;

  -- Sai dos produtos que não estão mais na lista.
  delete from public.product_complement_groups
  where store_id = p_store_id
    and complement_group_id = p_group_id
    and product_id <> all (v_product_ids);

  -- Entra nos produtos novos, por último entre os grupos de cada um.
  insert into public.product_complement_groups (store_id, product_id, complement_group_id, sort_order)
  select p_store_id, p.id, p_group_id,
         coalesce((
           select max(other.sort_order) + 1
           from public.product_complement_groups other
           where other.product_id = p.id
         ), 0)
  from unnest(v_product_ids) as p(id)
  where not exists (
    select 1 from public.product_complement_groups linked
    where linked.product_id = p.id and linked.complement_group_id = p_group_id
  );
end;
$function$;

revoke all on function public.set_complement_group_products(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.set_complement_group_products(uuid, uuid, uuid[]) to authenticated, service_role;
