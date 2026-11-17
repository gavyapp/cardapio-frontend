-- Escolher os produtos de um grupo de complementos
-- (set_complement_group_products): recebe a lista completa e ajusta os
-- vínculos numa transação só, sem mexer em quem já tinha o grupo.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

-- Dado: loja A com dono, os grupos "Extras" e "Ponto", e três produtos:
-- Burger (já com Ponto e Extras, nessa ordem), Batata (só com Extras) e
-- Suco (sem grupo); loja B com dono, um grupo e um produto
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono-b@teste.local');
insert into public.profiles (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono-b@teste.local')
on conflict (id) do nothing;
insert into public.stores (id, slug, name) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A'),
  ('5b000000-0000-0000-0000-000000000001', 'teste-loja-b', 'Loja B');
insert into public.store_users (store_id, user_id, role) values
  ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'OWNER'),
  ('5b000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'OWNER');
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches'),
  ('cb000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Lanches B');
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 20),
  ('9a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Batata', 8),
  ('9a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Suco', 6),
  ('9b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Burger B', 20);
insert into public.complement_groups (id, store_id, name, max_select, sort_order) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Extras', 3, 0),
  ('6a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Ponto', 1, 1),
  ('6b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Extras B', 1, 0);
insert into public.product_complement_groups (store_id, product_id, complement_group_id, sort_order) values
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 0),
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 1),
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000001', 0);

-- Dado: o dono da loja A logado
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

-- Extras passa a valer para Burger e Suco: sai da Batata, entra no Suco
select lives_ok(
  $$ select public.set_complement_group_products(
       '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001',
       array['9a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000003']::uuid[]) $$,
  'Extras em Burger e Suco → aceito');
select results_eq(
  $$ select p.name from public.product_complement_groups l join public.products p on p.id = l.product_id
      where l.complement_group_id = '6a000000-0000-0000-0000-000000000001' order by p.name $$,
  $$ values ('Burger'), ('Suco') $$,
  'lista nova → o grupo fica só nos produtos da lista');
select is(
  (select sort_order from public.product_complement_groups
    where product_id = '9a000000-0000-0000-0000-000000000001' and complement_group_id = '6a000000-0000-0000-0000-000000000001'),
  1, 'produto que já tinha o grupo → posição mantida');
select is(
  (select count(*)::int from public.product_complement_groups
    where product_id = '9a000000-0000-0000-0000-000000000001' and complement_group_id = '6a000000-0000-0000-0000-000000000002'),
  1, 'outro grupo do mesmo produto → continua ligado');

-- Ponto entra na Batata e no Burger (que já tinha) e no Suco, que já tem Extras
select lives_ok(
  $$ select public.set_complement_group_products(
       '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002',
       array['9a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000003']::uuid[]) $$,
  'Ponto em Burger e Suco → aceito');
select is(
  (select sort_order from public.product_complement_groups
    where product_id = '9a000000-0000-0000-0000-000000000003' and complement_group_id = '6a000000-0000-0000-0000-000000000002'),
  1, 'grupo novo num produto que já tem outro → entra por último');

-- Lista vazia: o grupo sai de todos os produtos
select lives_ok(
  $$ select public.set_complement_group_products(
       '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', '{}'::uuid[]) $$,
  'Ponto sem nenhum produto → aceito');
select is(
  (select count(*)::int from public.product_complement_groups where complement_group_id = '6a000000-0000-0000-0000-000000000002'),
  0, 'lista vazia → grupo não fica em nenhum produto');

-- Recusas: nada muda quando a lista tem produto de outra loja
select throws_ok(
  $$ select public.set_complement_group_products(
       '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001',
       array['9a000000-0000-0000-0000-000000000002', '9b000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'P0001', null, 'lista com produto de outra loja → recusado');
select results_eq(
  $$ select p.name from public.product_complement_groups l join public.products p on p.id = l.product_id
      where l.complement_group_id = '6a000000-0000-0000-0000-000000000001' order by p.name $$,
  $$ values ('Burger'), ('Suco') $$,
  'lista recusada → vínculos como estavam');
select throws_ok(
  $$ select public.set_complement_group_products(
       '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001',
       array['9b000000-0000-0000-0000-000000000001']::uuid[]) $$,
  '42501', null, 'dono da loja A mexe em grupo da loja B → sem permissão');

select * from finish();
rollback;
