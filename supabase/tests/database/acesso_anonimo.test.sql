-- O que o visitante sem login (anon) pode fazer: ver o cardápio das lojas
-- ativas, fazer pedido e acompanhar o pedido pelo token. Pedidos, clientes,
-- equipe e perfis ficam fechados, e o cardápio não pode ser alterado.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

-- Dado: loja ativa e aberta com um Burger, um pedido já feito, um dono, e
-- uma loja desativada
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local');
insert into public.profiles (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local')
on conflict (id) do nothing;
insert into public.stores (id, slug, name, is_open_override, active) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true, true),
  ('5d000000-0000-0000-0000-000000000001', 'teste-loja-desativada', 'Loja D', true, false);
insert into public.store_users (store_id, user_id, role) values
  ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'OWNER');
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 10);

create temporary table pedido on commit drop as
select o ->> 'id' as id, o ->> 'public_token' as token
from (select public.create_order(
  '5a000000-0000-0000-0000-000000000001', 'ENTREGA', 'Cliente', '11999990000', 'PIX',
  '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]',
  '{"street": "Rua A", "number": "1"}') as o) t;
grant select on pedido to anon;

-- Dado: visitante sem login
set local role anon;
do $$ begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end $$;

-- Cardápio
select results_eq(
  $$ select slug from public.stores where slug like 'teste-%' $$,
  $$ values ('teste-loja-a') $$,
  'visitante lista lojas → só a ativa');
select is((select count(*)::int from public.categories where store_id = '5a000000-0000-0000-0000-000000000001'), 1,
  'visitante lê categorias da loja → vê');
select is((select count(*)::int from public.products where store_id = '5a000000-0000-0000-0000-000000000001'), 1,
  'visitante lê produtos da loja → vê');
select ok(public.is_store_open('5a000000-0000-0000-0000-000000000001'),
  'visitante consulta se a loja está aberta → aberta');

-- Dados fechados
select is((select count(*)::int from public.orders), 0, 'visitante lê pedidos → nenhum');
select is((select count(*)::int from public.order_items), 0, 'visitante lê itens de pedido → nenhum');
select is((select count(*)::int from public.order_events), 0, 'visitante lê histórico de status → nenhum');
select is((select count(*)::int from public.customers), 0, 'visitante lê clientes → nenhum');
select is((select count(*)::int from public.store_users), 0, 'visitante lê equipe das lojas → ninguém');
select is((select count(*)::int from public.profiles), 0, 'visitante lê perfis → nenhum');
select is((select count(*)::int from public.push_subscriptions), 0, 'visitante lê assinaturas de notificação → nenhuma');

-- Escrita direta
update public.products set price = 1 where id = '9a000000-0000-0000-0000-000000000001';
select is((select price from public.products where id = '9a000000-0000-0000-0000-000000000001'), 10.00,
  'visitante muda preço de produto → preço mantido');
select throws_ok(
  $$ insert into public.categories (store_id, name) values ('5a000000-0000-0000-0000-000000000001', 'Intrusa') $$,
  '42501', null, 'visitante cria categoria → negado');
select throws_ok(
  $$ insert into public.customers (store_id, phone, name) values ('5a000000-0000-0000-0000-000000000001', '11900000000', 'X') $$,
  '42501', null, 'visitante cria cliente direto na tabela → negado');
select throws_ok(
  $$ insert into public.orders (store_id, number, mode, customer_name, customer_phone, payment_method, subtotal, total)
     values ('5a000000-0000-0000-0000-000000000001', 99, 'RETIRADA', 'X', '1', 'PIX', 0, 0) $$,
  '42501', null, 'visitante cria pedido direto na tabela → negado');

-- Funções
select throws_ok(
  $$ select public.update_order_status((select id::uuid from pedido), 'EM_PREPARO') $$,
  '42501', null, 'visitante muda status de pedido → negado');
select throws_ok(
  $$ select public.mark_order_read((select id::uuid from pedido)) $$,
  '42501', null, 'visitante marca pedido como lido → negado');
select lives_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Outro', '11999990001', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$,
  'visitante faz pedido pela função → aceito');
select is(
  public.get_order_by_token((select token from pedido)) ->> 'id', (select id from pedido),
  'visitante consulta pedido pelo token certo → recebe o pedido');
select is(
  public.get_order_by_token('token-que-nao-existe'), null,
  'visitante consulta token inexistente → nada');
select ok(
  not (public.get_order_by_token((select token from pedido)) ? 'customer_phone'),
  'pedido consultado pelo token → sem o telefone do cliente');

select * from finish();
rollback;
