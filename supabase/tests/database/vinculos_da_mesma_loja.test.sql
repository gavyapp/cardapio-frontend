-- Vínculos do catálogo só entre linhas da mesma loja: produto → categoria,
-- opção → grupo e produto ↔ grupo. Vale mesmo para quem grava direto pela
-- API, sem passar pelo painel.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

-- Dado: lojas A e B, cada uma com dono, categoria, grupo de complementos e
-- um produto
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
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches A'),
  ('cb000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Lanches B');
insert into public.complement_groups (id, store_id, name) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Adicionais A'),
  ('6b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Adicionais B');
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger A', 10),
  ('9b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Burger B', 10);

-- Dado: o dono da loja A logado
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

select throws_ok(
  $$ insert into public.products (store_id, category_id, name, price)
     values ('5a000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Intruso', 1) $$,
  '23503', null, 'dono A cria produto na categoria da loja B → recusado');
select throws_ok(
  $$ update public.products set category_id = 'cb000000-0000-0000-0000-000000000001'
      where id = '9a000000-0000-0000-0000-000000000001' $$,
  '23503', null, 'dono A move o próprio produto para a categoria da loja B → recusado');
select throws_ok(
  $$ insert into public.complements (store_id, complement_group_id, name)
     values ('5a000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Bacon') $$,
  '23503', null, 'dono A cria opção no grupo da loja B → recusado');
select throws_ok(
  $$ insert into public.product_complement_groups (store_id, product_id, complement_group_id)
     values ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001') $$,
  '23503', null, 'dono A liga o próprio produto ao grupo da loja B → recusado');
select throws_ok(
  $$ insert into public.product_complement_groups (store_id, product_id, complement_group_id)
     values ('5a000000-0000-0000-0000-000000000001', '9b000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001') $$,
  '23503', null, 'dono A liga o próprio grupo ao produto da loja B → recusado');
select lives_ok(
  $$ insert into public.products (store_id, category_id, name, price)
       values ('5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Cheddar', 12);
     insert into public.complements (store_id, complement_group_id, name)
       values ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Bacon');
     insert into public.product_complement_groups (store_id, product_id, complement_group_id)
       values ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001') $$,
  'dono A liga produto, categoria, grupo e opção da própria loja → aceito');

select * from finish();
rollback;
