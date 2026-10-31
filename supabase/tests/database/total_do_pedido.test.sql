-- Valores e numeração no create_order: pedido mínimo, taxa de entrega,
-- entrega grátis acima de um valor, número do pedido por loja e cadastro
-- do cliente pelo telefone.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

-- Dado: loja aberta com pedido mínimo de R$ 15, entrega de R$ 5 e entrega
-- grátis a partir de R$ 30, vendendo Burger de R$ 10
insert into public.stores (id, slug, name, is_open_override, settings) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true,
   '{"min_order": 15, "delivery_fee": 5, "free_delivery_above": 30}');
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 10);
-- Dado: loja B aberta, sem configurações, com o mesmo Burger
insert into public.stores (id, slug, name, is_open_override) values
  ('5b000000-0000-0000-0000-000000000001', 'teste-loja-b', 'Loja B', true);
insert into public.categories (id, store_id, name) values
  ('cb000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price) values
  ('9b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Burger', 10);

-- Atalho: pede N Burgers na loja A, por entrega ou retirada
create function pg_temp.pedir(p_qtd int, p_modo text, p_telefone text default '11999990000', p_nome text default 'Cliente')
returns jsonb language sql as $$
  select public.create_order('5a000000-0000-0000-0000-000000000001', p_modo::public.order_mode, p_nome, p_telefone, 'PIX',
    jsonb_build_array(jsonb_build_object('product_id', '9a000000-0000-0000-0000-000000000001', 'quantity', p_qtd)),
    case when p_modo = 'ENTREGA' then '{"street": "Rua A", "number": "1"}'::jsonb end)
$$;

select throws_like($$ select pg_temp.pedir(1, 'RETIRADA') $$,
  'Pedido mínimo é R$ 15%', 'R$ 10 com mínimo de R$ 15 → recusado');
select results_eq(
  $$ select o ->> 'subtotal', o ->> 'delivery_fee', o ->> 'total' from (select pg_temp.pedir(2, 'ENTREGA') o) t $$,
  $$ values ('20.00', '5.00', '25.00') $$,
  'entrega de R$ 20 → taxa R$ 5, total R$ 25');
select results_eq(
  $$ select o ->> 'delivery_fee', o ->> 'total' from (select pg_temp.pedir(3, 'ENTREGA') o) t $$,
  $$ values ('0.00', '30.00') $$,
  'entrega de R$ 30, no limite da grátis → sem taxa, total R$ 30');
select results_eq(
  $$ select o ->> 'delivery_fee', o ->> 'total' from (select pg_temp.pedir(2, 'RETIRADA') o) t $$,
  $$ values ('0.00', '20.00') $$,
  'retirada de R$ 20 → sem taxa, total R$ 20');

-- Os três pedidos aceitos acima foram 1, 2 e 3
select is((pg_temp.pedir(2, 'RETIRADA') ->> 'number')::int, 4,
  'quarto pedido da loja A → número 4');
select is((public.create_order('5b000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9b000000-0000-0000-0000-000000000001"}]') ->> 'number')::int, 1,
  'primeiro pedido da loja B → número 1 (contagem separada por loja)');

-- Mesmo telefone na loja A com outro nome
select lives_ok($$ select pg_temp.pedir(2, 'RETIRADA', '11999990000', 'Cliente Novo Nome') $$,
  'mesmo telefone com nome novo → pedido aceito');
select results_eq(
  $$ select name from public.customers where store_id = '5a000000-0000-0000-0000-000000000001' $$,
  $$ values ('Cliente Novo Nome') $$,
  'mesmo telefone em vários pedidos → um cliente só, com o último nome');

select * from finish();
rollback;
