-- Vínculos do catálogo só entre linhas da mesma loja.
--
-- As chaves estrangeiras apontavam só para o id. O RLS confere o store_id
-- da linha gravada, não o da linha apontada, então um lojista logado podia,
-- pela API, criar um produto da loja dele numa categoria de outra loja, ou
-- ligar um grupo dele a um produto de outra loja. Isso aparecia no cardápio
-- da outra loja.
--
-- Agora a chave estrangeira inclui o store_id: a linha apontada precisa ter o
-- mesmo id E a mesma loja. As chaves antigas saem para a API (PostgREST) não
-- ver duas relações entre as mesmas tabelas.

-- Alvos das chaves compostas. O id já é único sozinho; o par (store_id, id)
-- precisa de uma constraint própria para servir de referência.
alter table public.categories
  add constraint categories_store_id_id_key unique (store_id, id);
alter table public.products
  add constraint products_store_id_id_key unique (store_id, id);
alter table public.complement_groups
  add constraint complement_groups_store_id_id_key unique (store_id, id);

-- Produto → categoria
alter table public.products
  drop constraint products_category_id_fkey,
  add constraint products_category_id_fkey
    foreign key (store_id, category_id)
    references public.categories (store_id, id) on delete restrict;

-- Opção → grupo
alter table public.complements
  drop constraint complements_complement_group_id_fkey,
  add constraint complements_complement_group_id_fkey
    foreign key (store_id, complement_group_id)
    references public.complement_groups (store_id, id) on delete cascade;

-- Produto ↔ grupo
alter table public.product_complement_groups
  drop constraint product_complement_groups_product_id_fkey,
  add constraint product_complement_groups_product_id_fkey
    foreign key (store_id, product_id)
    references public.products (store_id, id) on delete cascade,
  drop constraint product_complement_groups_complement_group_id_fkey,
  add constraint product_complement_groups_complement_group_id_fkey
    foreign key (store_id, complement_group_id)
    references public.complement_groups (store_id, id) on delete cascade;
