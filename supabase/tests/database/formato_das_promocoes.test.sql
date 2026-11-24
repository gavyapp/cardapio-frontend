-- Formato das promoções: tipo, regra e período (ADR 0006) e os produtos de
-- cada promoção. Vale para qualquer gravação, mesmo direto pela API.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(45);

-- Dado: lojas A e B, cada uma com dono, categoria e um produto
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
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger A', 42),
  ('9b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Burger B', 42);

-- Dado: o dono da loja A logado
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

-- Formatos aceitos, um de cada tipo, modo e período
select lives_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule, id) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 12.5}', '{"type": "always"}', '7a000000-0000-0000-0000-000000000001') $$,
  'desconto de 12,5% em produtos, sempre → aceito');
select lives_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "amount_off", "value": 5}', '{"type": "weekly", "weekdays": [5, 6, 0]}') $$,
  'R$ 5 a menos, sexta a domingo o dia todo → aceito');
select lives_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "fixed_price", "value": 37}', '{"type": "weekly", "weekdays": [1, 2, 3, 4, 5], "from": "18:00", "to": "20:00"}') $$,
  'novo preço R$ 37, dias úteis das 18h às 20h → aceito');
select lives_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule, id) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'free_delivery', '{"min_subtotal": 70}', '{"type": "dates", "start": "2026-12-01", "end": "2026-12-24"}', '7a000000-0000-0000-0000-000000000002') $$,
  'entrega grátis acima de R$ 70, entre datas → aceito');
select lives_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'free_delivery', '{"min_subtotal": 0}', '{"type": "always"}') $$,
  'entrega grátis em qualquer pedido → aceito');
select lives_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'order_discount', '{"min_subtotal": 100, "mode": "amount_off", "value": 10}', '{"type": "always"}') $$,
  'R$ 10 de desconto em pedidos acima de R$ 100 → aceito');
select lives_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'order_discount', '{"min_subtotal": 80, "mode": "percent", "value": 10}', '{"type": "dates", "start": "2026-12-24", "end": "2026-12-24"}') $$,
  '10% em pedidos acima de R$ 80, num dia só → aceito');

-- Tipo e regra fora do formato
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'coupon', '{"mode": "percent", "value": 10}', '{"type": "always"}') $$,
  '23514', null, 'tipo cupom → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 100}', '{"type": "always"}') $$,
  '23514', null, 'desconto em produtos com 100% de desconto → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 0}', '{"type": "always"}') $$,
  '23514', null, 'desconto em produtos com 0% de desconto → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "amount_off", "value": -5}', '{"type": "always"}') $$,
  '23514', null, 'desconto em produtos com valor a menos negativo → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "fixed_price", "value": 0}', '{"type": "always"}') $$,
  '23514', null, 'desconto em produtos com novo preço zero → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "amount_off", "value": 1.234}', '{"type": "always"}') $$,
  '23514', null, 'desconto em produtos com valor com 3 casas → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "amount_off", "value": "5"}', '{"type": "always"}') $$,
  '23514', null, 'desconto em produtos com valor como texto → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "half_price", "value": 5}', '{"type": "always"}') $$,
  '23514', null, 'desconto em produtos com modo desconhecido → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10, "min_subtotal": 50}', '{"type": "always"}') $$,
  '23514', null, 'desconto em produtos com chave a mais → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{}', '{"type": "always"}') $$,
  '23514', null, 'desconto em produtos com regra vazia → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'free_delivery', '{"min_subtotal": -1}', '{"type": "always"}') $$,
  '23514', null, 'entrega grátis com mínimo negativo → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'free_delivery', '{}', '{"type": "always"}') $$,
  '23514', null, 'entrega grátis sem mínimo → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'order_discount', '{"min_subtotal": 0, "mode": "percent", "value": 10}', '{"type": "always"}') $$,
  '23514', null, 'desconto no pedido com mínimo zero → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'order_discount', '{"min_subtotal": 50, "mode": "amount_off", "value": 50}', '{"type": "always"}') $$,
  '23514', null, 'desconto no pedido igual ao mínimo → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'order_discount', '{"min_subtotal": 50, "mode": "fixed_price", "value": 30}', '{"type": "always"}') $$,
  '23514', null, 'desconto no pedido com novo preço → recusado');

-- Período fora do formato
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{}') $$,
  '23514', null, 'período vazio → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "monthly"}') $$,
  '23514', null, 'tipo de período desconhecido → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "always", "weekdays": [1]}') $$,
  '23514', null, 'sempre com dias → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "weekly", "weekdays": []}') $$,
  '23514', null, 'semana sem dias → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "weekly", "weekdays": [7]}') $$,
  '23514', null, 'dia 7 → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "weekly", "weekdays": [1, 1]}') $$,
  '23514', null, 'dia repetido → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "weekly", "weekdays": ["1"]}') $$,
  '23514', null, 'dia como texto → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "weekly", "weekdays": [1], "from": "18:00"}') $$,
  '23514', null, 'só a hora de início → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "weekly", "weekdays": [1], "from": "20:00", "to": "18:00"}') $$,
  '23514', null, 'início depois do fim → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "weekly", "weekdays": [1], "from": "22:00", "to": "24:00"}') $$,
  '23514', null, 'hora 24:00 → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "weekly", "weekdays": [1], "from": "8:00", "to": "11:00"}') $$,
  '23514', null, 'hora sem zero à esquerda → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "dates", "start": "2026-12-24", "end": "2026-12-01"}') $$,
  '23514', null, 'início depois do fim nas datas → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "dates", "start": "2026-02-30", "end": "2026-03-01"}') $$,
  '23514', null, 'data que não existe → recusado');
select throws_ok(
  $$ insert into public.promotions (store_id, name, kind, rule, schedule) values ('5a000000-0000-0000-0000-000000000001', 'Teste', 'product_discount', '{"mode": "percent", "value": 10}', '{"type": "dates", "start": "2026-12-01"}') $$,
  '23514', null, 'datas sem fim → recusado');

-- Dado: a promoção de 12,5% em produtos já gravada
select throws_ok(
  $$ update public.promotions set rule = '{"mode": "percent", "value": 150}'
      where id = '7a000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'promoção existente alterada para 150% → recusado');

-- Produtos da promoção
select lives_ok(
  $$ insert into public.promotion_products (store_id, promotion_id, product_id)
     values ('5a000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001') $$,
  'produto da loja A na promoção de produto da loja A → aceito');
select throws_ok(
  $$ insert into public.promotion_products (store_id, promotion_id, product_id)
     values ('5a000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '9b000000-0000-0000-0000-000000000001') $$,
  '23503', null, 'produto da loja B na promoção da loja A → recusado');
select throws_ok(
  $$ insert into public.promotion_products (store_id, promotion_id, product_id)
     values ('5a000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000002', '9a000000-0000-0000-0000-000000000001') $$,
  '23514', null, 'produto na promoção de entrega grátis → recusado');
select throws_ok(
  $$ update public.promotions set kind = 'free_delivery', rule = '{"min_subtotal": 0}'
      where id = '7a000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'promoção com produtos virando entrega grátis → recusado');
select lives_ok(
  $$ delete from public.promotion_products where promotion_id = '7a000000-0000-0000-0000-000000000001';
     update public.promotions set kind = 'free_delivery', rule = '{"min_subtotal": 0}'
      where id = '7a000000-0000-0000-0000-000000000001';
     update public.promotions set kind = 'product_discount', rule = '{"mode": "percent", "value": 12.5}'
      where id = '7a000000-0000-0000-0000-000000000001';
     insert into public.promotion_products (store_id, promotion_id, product_id)
      values ('5a000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001') $$,
  'tira os produtos, troca o tipo e volta → aceito');

-- Dado: o dono da loja B logado
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

select throws_ok(
  $$ insert into public.promotion_products (store_id, promotion_id, product_id)
     values ('5a000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'dono B liga produto na promoção da loja A → recusado');

-- Dado: visitante sem login, com a promoção de produto ainda desligada
reset role;
set local role anon;
select is(
  (select count(*)::int from public.promotion_products),
  0, 'visitante, promoção desligada → não vê os produtos dela');

reset role;
update public.promotions set is_active = true
 where id = '7a000000-0000-0000-0000-000000000001';
set local role anon;
select is(
  (select count(*)::int from public.promotion_products),
  1, 'visitante, promoção ligada → vê os produtos dela');

select * from finish();
rollback;
