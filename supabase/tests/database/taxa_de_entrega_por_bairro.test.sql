-- Taxa de entrega por bairro: o create_order cobra a taxa do bairro que a
-- loja cadastrou (settings.delivery_zones) e a taxa de outros locais
-- (settings.delivery_fee) no resto.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

-- Dado: loja A aberta, com outros locais a R$ 8, entrega grátis acima de
-- R$ 100 e os bairros Centro (R$ 4) e Vila Nova (R$ 6); um Burger de R$ 20
insert into public.stores (id, slug, name, is_open_override, settings) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true,
   '{"delivery_fee": 8, "delivery_zones": [
      {"id": "2a000000-0000-4000-8000-000000000001", "name": "Centro", "fee": 4},
      {"id": "2a000000-0000-4000-8000-000000000002", "name": "Vila Nova", "fee": 6}
    ]}');
insert into public.promotions (store_id, name, kind, rule, schedule, is_active) values
  ('5a000000-0000-0000-0000-000000000001', 'Entrega grátis acima de R$ 100', 'free_delivery',
   '{"min_subtotal": 100}', '{"type": "always"}', true);
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price, is_available) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 20, true);
-- Dado: loja S aberta, só com a taxa única de R$ 5, e um Suco de R$ 10
insert into public.stores (id, slug, name, is_open_override, settings) values
  ('5c000000-0000-0000-0000-000000000001', 'teste-loja-s', 'Loja S', true, '{"delivery_fee": 5}');
insert into public.categories (id, store_id, name) values
  ('cc000000-0000-0000-0000-000000000001', '5c000000-0000-0000-0000-000000000001', 'Bebidas');
insert into public.products (id, store_id, category_id, name, price, is_available) values
  ('9c000000-0000-0000-0000-000000000001', '5c000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', 'Suco', 10, true);

-- Atalho: pedido de entrega na loja A, com o endereço e a quantidade dados
create function pg_temp.pedido_a(p_address jsonb, p_quantity int default 1)
returns jsonb language sql as $$
  select public.create_order('5a000000-0000-0000-0000-000000000001', 'ENTREGA', 'Cliente', '11999990000', 'PIX',
    jsonb_build_array(jsonb_build_object('product_id', '9a000000-0000-0000-0000-000000000001', 'quantity', p_quantity)),
    p_address)
$$;

select is(
  (pg_temp.pedido_a('{"street": "Rua A", "number": "1", "district": "Centro", "zone_id": "2a000000-0000-4000-8000-000000000001"}') ->> 'delivery_fee')::numeric,
  4::numeric, 'entrega no Centro → taxa do Centro');

select is(
  (pg_temp.pedido_a('{"street": "Rua A", "number": "1", "district": "Vila Nova", "zone_id": "2a000000-0000-4000-8000-000000000002"}') ->> 'total')::numeric,
  26::numeric, 'entrega na Vila Nova → total com a taxa da Vila Nova');

select is(
  (pg_temp.pedido_a('{"street": "Rua A", "number": "1", "district": "Interior"}') ->> 'delivery_fee')::numeric,
  8::numeric, 'bairro que a loja não cadastrou → taxa de outros locais');

select is(
  (pg_temp.pedido_a('{"street": "Rua A", "number": "1", "district": "Centro", "zone_id": "2a000000-0000-4000-8000-00000000ffff"}') ->> 'delivery_fee')::numeric,
  8::numeric, 'bairro que não existe mais na lista → taxa de outros locais');

select is(
  (pg_temp.pedido_a('{"street": "Rua A", "number": "1", "district": "Centro", "zone_id": "2a000000-0000-4000-8000-000000000001"}', 5) ->> 'delivery_fee')::numeric,
  0::numeric, 'subtotal alcança a entrega grátis → sem taxa, mesmo com bairro');

-- O nome do bairro gravado é o do cadastro, não o que o navegador mandou
select lives_ok(
  $$ select pg_temp.pedido_a('{"street": "Rua B", "number": "2", "district": "nome inventado", "zone_id": "2a000000-0000-4000-8000-000000000001"}') $$,
  'endereço com nome de bairro diferente do cadastro → aceito');
select is(
  (select address ->> 'district' from public.orders where address ->> 'street' = 'Rua B'),
  'Centro', 'bairro cadastrado → pedido guarda o nome do cadastro');
select is(
  (select address ->> 'district' from public.orders where address ->> 'district' = 'Interior' limit 1),
  'Interior', 'outro bairro → pedido guarda o nome que o cliente digitou');

-- Retirada não cobra taxa
select is(
  (public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
     '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') ->> 'delivery_fee')::numeric,
  0::numeric, 'retirada em loja com bairros → sem taxa');

-- Loja sem bairros cadastrados segue com a taxa única
select is(
  (public.create_order('5c000000-0000-0000-0000-000000000001', 'ENTREGA', 'Cliente', '11999990000', 'PIX',
     '[{"product_id": "9c000000-0000-0000-0000-000000000001"}]',
     '{"street": "Rua A", "number": "1", "district": "Centro", "zone_id": "2a000000-0000-4000-8000-000000000001"}') ->> 'delivery_fee')::numeric,
  5::numeric, 'loja sem bairros cadastrados → taxa única para todos');

select * from finish();
rollback;
