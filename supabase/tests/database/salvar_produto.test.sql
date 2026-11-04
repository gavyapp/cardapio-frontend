-- Salvar produto (save_product): cria ou altera o produto e troca os grupos
-- de complementos ligados numa transação só. Erro em qualquer parte não
-- deixa nada gravado.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

-- Dado: loja A com dono, categorias "Lanches" (vazia) e "Bebidas" (com um
-- Suco), grupos "Ponto" e "Adicionais"; loja B com dono, categoria e grupo
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
insert into public.categories (id, store_id, name, sort_order) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches', 0),
  ('ca000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Bebidas', 1),
  ('cb000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Lanches B', 0);
insert into public.complement_groups (id, store_id, name) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Ponto'),
  ('6a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Adicionais'),
  ('6b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Adicionais B');
insert into public.products (id, store_id, category_id, name, price, sort_order) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000002', 'Suco', 8, 0),
  ('9b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Burger B', 10, 0);

-- Dado: o dono da loja A logado
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

-- Produto novo
select lives_ok(
  $$ select public.save_product(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_category_id => 'ca000000-0000-0000-0000-000000000001',
       p_name => 'Burger', p_price => 25, p_badges => '{novo}',
       p_is_available => false, p_is_suggested => false,
       p_group_ids => array['6a000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000001']::uuid[],
       p_description => 'Pão e carne') $$,
  'cria Burger esgotado com Adicionais e Ponto → aceito');
select results_eq(
  $$ select category_id, price, badges, description, sort_order from public.products where name = 'Burger' $$,
  $$ values ('ca000000-0000-0000-0000-000000000001'::uuid, 25::numeric, '{novo}'::text[], 'Pão e carne', 0) $$,
  'produto novo → gravado com os campos e no fim da categoria vazia');
select results_eq(
  $$ select l.complement_group_id from public.product_complement_groups l
       join public.products p on p.id = l.product_id
      where p.name = 'Burger' order by l.sort_order $$,
  $$ values ('6a000000-0000-0000-0000-000000000002'::uuid), ('6a000000-0000-0000-0000-000000000001'::uuid) $$,
  'produto novo → grupos ligados na ordem enviada');

-- Alteração com troca de categoria
select lives_ok(
  $$ select public.save_product(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_category_id => 'ca000000-0000-0000-0000-000000000002',
       p_name => 'Burger da casa', p_price => 27, p_badges => '{}',
       p_is_available => true, p_is_suggested => true,
       p_group_ids => array['6a000000-0000-0000-0000-000000000001']::uuid[],
       p_product_id => (select id from public.products where name = 'Burger')) $$,
  'altera Burger para Bebidas, disponível e sugerido, só com Ponto → aceito');
select results_eq(
  $$ select name, category_id, price, is_available, is_suggested, description, sort_order
       from public.products where name = 'Burger da casa' $$,
  $$ values ('Burger da casa', 'ca000000-0000-0000-0000-000000000002'::uuid, 27::numeric, true, true, null::text, 1) $$,
  'produto que mudou de categoria → campos novos e no fim da nova categoria');
select results_eq(
  $$ select l.complement_group_id from public.product_complement_groups l
       join public.products p on p.id = l.product_id
      where p.name = 'Burger da casa' $$,
  $$ values ('6a000000-0000-0000-0000-000000000001'::uuid) $$,
  'grupos alterados → só os enviados continuam ligados');
select lives_ok(
  $$ select public.save_product(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_category_id => 'ca000000-0000-0000-0000-000000000002',
       p_name => 'Burger da casa', p_price => 28, p_badges => '{}',
       p_is_available => true, p_is_suggested => true,
       p_group_ids => array['6a000000-0000-0000-0000-000000000001']::uuid[],
       p_product_id => (select id from public.products where name = 'Burger da casa')) $$,
  'altera só o preço → aceito');
select is(
  (select sort_order from public.products where name = 'Burger da casa'), 1,
  'produto que ficou na mesma categoria → mantém a posição');

-- Recusas
select throws_ok(
  $$ select public.save_product(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_category_id => 'cb000000-0000-0000-0000-000000000001',
       p_name => 'Intruso', p_price => 1, p_badges => '{}',
       p_is_available => true, p_is_suggested => false, p_group_ids => '{}') $$,
  'P0001', 'Escolha uma categoria da loja.',
  'categoria da loja B → recusado');
select throws_ok(
  $$ select public.save_product(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_category_id => 'ca000000-0000-0000-0000-000000000001',
       p_name => 'Intruso', p_price => 1, p_badges => '{}',
       p_is_available => true, p_is_suggested => false,
       p_group_ids => array['6b000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'P0001', 'Um dos grupos de complementos não existe mais. Recarregue a página.',
  'grupo da loja B → recusado');
select throws_ok(
  $$ select public.save_product(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_category_id => 'ca000000-0000-0000-0000-000000000001',
       p_name => 'Intruso', p_price => 1, p_badges => '{}',
       p_is_available => true, p_is_suggested => false,
       p_group_ids => array['6a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'P0001', 'Grupo de complementos repetido.',
  'mesmo grupo duas vezes → recusado');
select throws_ok(
  $$ select public.save_product(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_category_id => 'ca000000-0000-0000-0000-000000000001',
       p_name => 'Burger B roubado', p_price => 1, p_badges => '{}',
       p_is_available => true, p_is_suggested => false, p_group_ids => '{}',
       p_product_id => '9b000000-0000-0000-0000-000000000001') $$,
  'P0001', 'Produto não encontrado.',
  'id de produto da loja B → recusado');
select throws_ok(
  $$ select public.save_product(
       p_store_id => '5b000000-0000-0000-0000-000000000001',
       p_category_id => 'cb000000-0000-0000-0000-000000000001',
       p_name => 'Intruso', p_price => 1, p_badges => '{}',
       p_is_available => true, p_is_suggested => false, p_group_ids => '{}') $$,
  '42501', 'Sem permissão',
  'dono A salva produto na loja B → negado');

-- Tudo ou nada
select throws_ok(
  $$ select public.save_product(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_category_id => 'ca000000-0000-0000-0000-000000000002',
       p_name => 'Nome que não fica', p_price => -1, p_badges => '{}',
       p_is_available => true, p_is_suggested => false,
       p_group_ids => array['6a000000-0000-0000-0000-000000000002']::uuid[],
       p_product_id => (select id from public.products where name = 'Burger da casa')) $$,
  '23514', null,
  'alteração com preço negativo → recusada');
select is(
  (select price from public.products where name = 'Burger da casa'), 28::numeric,
  'depois da alteração recusada → produto continua como estava');
select results_eq(
  $$ select l.complement_group_id from public.product_complement_groups l
       join public.products p on p.id = l.product_id
      where p.name = 'Burger da casa' $$,
  $$ values ('6a000000-0000-0000-0000-000000000001'::uuid) $$,
  'depois da alteração recusada → grupos continuam como estavam');

select * from finish();
rollback;
