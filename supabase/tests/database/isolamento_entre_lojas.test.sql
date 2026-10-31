-- Isolamento entre lojas: o dono de uma loja não lê nem altera os dados de
-- outra loja (pedidos, clientes, equipe, cardápio e configurações).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(19);

-- Dado: lojas A e B abertas, cada uma com seu dono, um Burger de R$ 10 e um
-- pedido de cliente próprio
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono-b@teste.local');
insert into public.profiles (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono-b@teste.local')
on conflict (id) do nothing;
insert into public.stores (id, slug, name, is_open_override) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true),
  ('5b000000-0000-0000-0000-000000000001', 'teste-loja-b', 'Loja B', true);
insert into public.store_users (store_id, user_id, role) values
  ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'OWNER'),
  ('5b000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'OWNER');
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches A'),
  ('cb000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Lanches B');
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger A', 10),
  ('9b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Burger B', 10);

create temporary table pedidos on commit drop as
select 'A' as loja, (public.create_order(
  '5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente A', '11999990001', 'PIX',
  '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') ->> 'id')::uuid as id
union all
select 'B', (public.create_order(
  '5b000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente B', '11999990002', 'PIX',
  '[{"product_id": "9b000000-0000-0000-0000-000000000001"}]') ->> 'id')::uuid;
grant select on pedidos to authenticated;

-- Dado: o dono da loja A logado
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

-- Leitura
select results_eq(
  $$ select store_id from public.orders $$,
  $$ values ('5a000000-0000-0000-0000-000000000001'::uuid) $$,
  'dono A lista pedidos → só o pedido da loja A');
select results_eq(
  $$ select name from public.customers $$,
  $$ values ('Cliente A') $$,
  'dono A lista clientes → só o cliente da loja A');
select is((select count(*)::int from public.order_items where store_id = '5b000000-0000-0000-0000-000000000001'), 0,
  'dono A lê itens de pedido da loja B → nenhum');
select is((select count(*)::int from public.order_events where store_id = '5b000000-0000-0000-0000-000000000001'), 0,
  'dono A lê histórico de status da loja B → nenhum');
select is((select count(*)::int from public.store_users where store_id = '5b000000-0000-0000-0000-000000000001'), 0,
  'dono A lê a equipe da loja B → ninguém');
select is((select count(*)::int from public.profiles), 1,
  'dono A lê perfis → só o próprio');

-- Pedidos da loja B
select throws_ok(
  $$ select public.update_order_status((select id from pedidos where loja = 'B'), 'EM_PREPARO') $$,
  '42501', 'Sem permissão', 'dono A muda status de pedido da loja B → negado');
select lives_ok(
  $$ select public.mark_order_read((select id from pedidos where loja = 'B')) $$,
  'dono A marca como lido pedido da loja B → sem erro, mas sem efeito (conferido abaixo)');
select throws_ok(
  $$ delete from public.orders where id = (select id from pedidos where loja = 'B') $$,
  '42501', null, 'dono A exclui pedido da loja B → negado');

-- Cardápio e configurações da loja B (o cardápio é público, então dá para
-- conferir o resultado com o mesmo usuário)
update public.products set price = 1 where id = '9b000000-0000-0000-0000-000000000001';
select is((select price from public.products where id = '9b000000-0000-0000-0000-000000000001'), 10.00,
  'dono A muda preço de produto da loja B → preço mantido');
delete from public.products where id = '9b000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.products where id = '9b000000-0000-0000-0000-000000000001'), 1,
  'dono A exclui produto da loja B → produto mantido');
update public.stores set name = 'Invadida', is_open_override = false where id = '5b000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select name, is_open_override from public.stores where id = '5b000000-0000-0000-0000-000000000001' $$,
  $$ values ('Loja B', true) $$,
  'dono A muda nome e botão de aberto da loja B → loja B mantida');
select throws_ok(
  $$ insert into public.categories (store_id, name) values ('5b000000-0000-0000-0000-000000000001', 'Intrusa') $$,
  '42501', null, 'dono A cria categoria na loja B → negado');
select throws_ok(
  $$ update public.products set store_id = '5b000000-0000-0000-0000-000000000001'
     where id = '9a000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'dono A move produto da loja A para a loja B → negado');
select throws_ok(
  $$ insert into public.store_users (store_id, user_id, role)
     values ('5b000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'OWNER') $$,
  '42501', null, 'dono A se adiciona à equipe da loja B → negado');
select throws_ok(
  $$ insert into public.push_subscriptions (store_id, user_id, endpoint, keys)
     values ('5b000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'https://push.teste.local/1', '{}') $$,
  '42501', null, 'dono A assina notificações da loja B → negado');

-- Clientes da loja B
update public.customers set name = 'Alterado' where store_id = '5b000000-0000-0000-0000-000000000001';

-- Conferência como o banco (sem RLS)
reset role;
select is(
  (select read_at from public.orders where id = (select id from pedidos where loja = 'B')), null,
  'pedido da loja B marcado como lido pelo dono A → continua não lido');
select is(
  (select name from public.customers where store_id = '5b000000-0000-0000-0000-000000000001'), 'Cliente B',
  'dono A renomeia cliente da loja B → nome mantido');
select is(
  (select status::text from public.orders where id = (select id from pedidos where loja = 'B')), 'RECEBIDO',
  'depois de tudo → pedido da loja B continua RECEBIDO');

select * from finish();
rollback;
