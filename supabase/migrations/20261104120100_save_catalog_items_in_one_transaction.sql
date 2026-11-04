-- Salvar produto e salvar grupo de complementos numa transação só.
--
-- O painel gravava cada parte numa chamada separada à API (produto, depois
-- apagar e recriar os vínculos com grupos; grupo, depois cada opção). Uma
-- falha no meio deixava metade gravada, por exemplo um produto sem o grupo
-- obrigatório. O corpo de uma função roda numa transação: ou tudo grava, ou
-- nada muda.
--
-- As duas funções rodam com o papel de quem chama (security invoker), então
-- o RLS continua valendo em cada comando. A checagem de membro no começo só
-- troca o "0 linhas alteradas" silencioso do RLS por um erro claro.

create or replace function public.save_product(
  p_store_id uuid,
  p_category_id uuid,
  p_name text,
  p_price numeric,
  p_badges text[],
  p_is_available boolean,
  p_is_suggested boolean,
  p_group_ids uuid[],
  p_description text default null,
  p_image_url text default null,
  -- Sem id: produto novo.
  p_product_id uuid default null
)
 returns uuid
 language plpgsql
 set search_path to ''
as $function$
declare
  v_product_id uuid := p_product_id;
  v_group_ids uuid[] := coalesce(p_group_ids, '{}');
  v_current_category uuid;
begin
  if not private.is_store_member(p_store_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.categories
    where id = p_category_id and store_id = p_store_id and deleted_at is null
  ) then
    raise exception 'Escolha uma categoria da loja.' using errcode = 'P0001';
  end if;

  if cardinality(v_group_ids) <> (select count(distinct g) from unnest(v_group_ids) g) then
    raise exception 'Grupo de complementos repetido.' using errcode = 'P0001';
  end if;
  if cardinality(v_group_ids) <> (
    select count(*) from public.complement_groups
    where id = any(v_group_ids) and store_id = p_store_id and deleted_at is null
  ) then
    raise exception 'Um dos grupos de complementos não existe mais. Recarregue a página.'
      using errcode = 'P0001';
  end if;

  if v_product_id is null then
    -- Produto novo vai para o fim da categoria.
    insert into public.products (
      store_id, category_id, name, description, price, image_url, badges,
      is_available, is_suggested, sort_order
    )
    values (
      p_store_id, p_category_id, p_name, p_description, p_price, p_image_url, p_badges,
      p_is_available, p_is_suggested,
      (select coalesce(max(sort_order) + 1, 0) from public.products
        where store_id = p_store_id and category_id = p_category_id and deleted_at is null)
    )
    returning id into v_product_id;
  else
    select category_id into v_current_category
    from public.products
    where id = v_product_id and store_id = p_store_id and deleted_at is null
    for update;
    if not found then
      raise exception 'Produto não encontrado.' using errcode = 'P0001';
    end if;

    -- Produto que mudou de categoria vai para o fim da nova.
    update public.products
       set category_id = p_category_id,
           name = p_name,
           description = p_description,
           price = p_price,
           image_url = p_image_url,
           badges = p_badges,
           is_available = p_is_available,
           is_suggested = p_is_suggested,
           sort_order = case
             when v_current_category = p_category_id then sort_order
             else (select coalesce(max(other.sort_order) + 1, 0) from public.products other
                    where other.store_id = p_store_id
                      and other.category_id = p_category_id
                      and other.deleted_at is null)
           end
     where id = v_product_id;
  end if;

  -- Grupos ligados, na ordem em que o cliente vê.
  delete from public.product_complement_groups
  where store_id = p_store_id and product_id = v_product_id;

  insert into public.product_complement_groups (store_id, product_id, complement_group_id, sort_order)
  select p_store_id, v_product_id, g.id, (g.ord - 1)::int
  from unnest(v_group_ids) with ordinality as g(id, ord);

  return v_product_id;
end;
$function$;

create or replace function public.save_complement_group(
  p_store_id uuid,
  p_name text,
  p_min_select integer,
  p_max_select integer,
  p_allow_repeat boolean,
  -- Lista na ordem em que o cliente vê: [{id?, name, price, is_available}].
  -- Opção sem id, ou com id que não é deste grupo, é criada.
  p_options jsonb,
  -- Sem id: grupo novo.
  p_group_id uuid default null
)
 returns uuid
 language plpgsql
 set search_path to ''
as $function$
declare
  v_group_id uuid := p_group_id;
begin
  if not private.is_store_member(p_store_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  if jsonb_typeof(p_options) is distinct from 'array' then
    raise exception 'Opções inválidas.' using errcode = 'P0001';
  end if;

  if v_group_id is null then
    -- Grupo novo vai para o fim da lista.
    insert into public.complement_groups (
      store_id, name, min_select, max_select, allow_repeat, sort_order
    )
    values (
      p_store_id, p_name, p_min_select, p_max_select, p_allow_repeat,
      (select coalesce(max(sort_order) + 1, 0) from public.complement_groups
        where store_id = p_store_id and deleted_at is null)
    )
    returning id into v_group_id;
  else
    update public.complement_groups
       set name = p_name,
           min_select = p_min_select,
           max_select = p_max_select,
           allow_repeat = p_allow_repeat
     where id = v_group_id and store_id = p_store_id and deleted_at is null;
    if not found then
      raise exception 'Grupo não encontrado.' using errcode = 'P0001';
    end if;
  end if;

  -- Opção que saiu da lista: exclusão lógica (pedidos antigos guardam nome
  -- e preço por conta própria).
  update public.complements
     set deleted_at = now()
   where store_id = p_store_id
     and complement_group_id = v_group_id
     and deleted_at is null
     and id not in (
       select (option ->> 'id')::uuid
       from jsonb_array_elements(p_options) as option
       where option ->> 'id' is not null
     );

  -- Opção que continua: novos valores e posição.
  update public.complements c
     set name = o.value ->> 'name',
         price = (o.value ->> 'price')::numeric,
         is_available = (o.value ->> 'is_available')::boolean,
         sort_order = (o.ord - 1)::int
    from jsonb_array_elements(p_options) with ordinality as o(value, ord)
   where c.id = (o.value ->> 'id')::uuid
     and c.store_id = p_store_id
     and c.complement_group_id = v_group_id
     and c.deleted_at is null;

  -- Opção nova.
  insert into public.complements (
    store_id, complement_group_id, name, price, is_available, sort_order
  )
  select p_store_id, v_group_id, o.value ->> 'name', (o.value ->> 'price')::numeric,
         (o.value ->> 'is_available')::boolean, (o.ord - 1)::int
  from jsonb_array_elements(p_options) with ordinality as o(value, ord)
  where not exists (
    select 1 from public.complements c
    where c.id = (o.value ->> 'id')::uuid
      and c.store_id = p_store_id
      and c.complement_group_id = v_group_id
      and c.deleted_at is null
  );

  return v_group_id;
end;
$function$;

-- Só usuário logado; o RLS e a checagem de membro limitam à própria loja.
revoke all on function public.save_product(uuid, uuid, text, numeric, text[], boolean, boolean, uuid[], text, text, uuid) from public, anon;
grant execute on function public.save_product(uuid, uuid, text, numeric, text[], boolean, boolean, uuid[], text, text, uuid) to authenticated, service_role;

revoke all on function public.save_complement_group(uuid, text, integer, integer, boolean, jsonb, uuid) from public, anon;
grant execute on function public.save_complement_group(uuid, text, integer, integer, boolean, jsonb, uuid) to authenticated, service_role;
