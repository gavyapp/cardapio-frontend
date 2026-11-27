-- Cálculo das promoções (ADR 0006): quando cada promoção vale, no fuso de
-- São Paulo, o preço promocional que live_promotions mostra e o que o
-- create_order grava (preço do item, taxa, desconto e applied_promotions).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(31);

-- Dado: loja A com Classic R$ 40, Bacon R$ 30, Suco R$ 10 e Fritas R$ 12 e
-- as promoções:
--   Terça do Classic  20% no Classic, às terças, o dia todo
--   Happy hour        R$ 5 a menos no Bacon, seg a sex, das 18:00 às 20:00
--   Natal             Suco a R$ 8, de 01/12 a 24/12
--   Suco caro         Suco a R$ 15, sempre (não baixa o preço)
--   Desligada         50% nas Fritas, sempre, desligada
--   Excluída          50% nas Fritas, sempre, excluída
-- O painel e o banco não deixam um produto em duas promoções ligadas; aqui o
-- trigger que recusa fica desligado (lojas A e B) para testar o que o
-- cálculo faz se isso acontecer.
insert into public.stores (id, slug, name, is_open_override) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true);
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Classic', 40),
  ('9a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Bacon', 30),
  ('9a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Suco', 10),
  ('9a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Fritas', 12);
insert into public.promotions (id, store_id, name, kind, rule, schedule, is_active, deleted_at) values
  ('a1000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Terça do Classic', 'product_discount',
   '{"mode": "percent", "value": 20}', '{"type": "weekly", "weekdays": [2]}', true, null),
  ('a1000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Happy hour', 'product_discount',
   '{"mode": "amount_off", "value": 5}', '{"type": "weekly", "weekdays": [1, 2, 3, 4, 5], "from": "18:00", "to": "20:00"}', true, null),
  ('a1000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', 'Natal', 'product_discount',
   '{"mode": "fixed_price", "value": 8}', '{"type": "dates", "start": "2026-12-01", "end": "2026-12-24"}', true, null),
  ('a1000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', 'Suco caro', 'product_discount',
   '{"mode": "fixed_price", "value": 15}', '{"type": "always"}', true, null),
  ('a1000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000001', 'Desligada', 'product_discount',
   '{"mode": "percent", "value": 50}', '{"type": "always"}', false, null),
  ('a1000000-0000-0000-0000-000000000006', '5a000000-0000-0000-0000-000000000001', 'Excluída', 'product_discount',
   '{"mode": "percent", "value": 50}', '{"type": "always"}', true, now());
alter table public.promotion_products disable trigger promotion_products_are_unique;
insert into public.promotion_products (store_id, promotion_id, product_id) values
  ('5a000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', '9a000000-0000-0000-0000-000000000002'),
  ('5a000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000003'),
  ('5a000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000003'),
  ('5a000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', '9a000000-0000-0000-0000-000000000004'),
  ('5a000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', '9a000000-0000-0000-0000-000000000004');

-- Atalho: preço promocional de um produto da loja A num momento (null = sem
-- promoção). Horários em UTC; São Paulo é UTC-3.
create function pg_temp.preco_a(p_at timestamptz, p_nome text)
returns numeric language sql as $$
  select (e ->> 'price')::numeric
  from jsonb_array_elements(public.live_promotions('5a000000-0000-0000-0000-000000000001', p_at) -> 'products') e
  join public.products p on p.id = (e ->> 'product_id')::uuid
  where p.name = p_nome
$$;

-- Vigência: dia da semana
select is(pg_temp.preco_a('2026-11-24 15:00+00', 'Classic'), 32.00,
  'terça 12:00 → Classic com 20% de desconto');
select is(pg_temp.preco_a('2026-11-25 15:00+00', 'Classic'), null,
  'quarta 12:00 → Classic sem desconto');
select is(pg_temp.preco_a('2026-11-25 02:00+00', 'Classic'), 32.00,
  'terça 23:00 em São Paulo (quarta em UTC) → vale o dia de São Paulo');

-- Vigência: horário
select is(pg_temp.preco_a('2026-11-24 20:59+00', 'Bacon'), null,
  '17:59 → Happy hour ainda não vale');
select is(pg_temp.preco_a('2026-11-24 21:00+00', 'Bacon'), 25.00,
  '18:00 → Happy hour vale (início entra)');
select is(pg_temp.preco_a('2026-11-24 23:00+00', 'Bacon'), null,
  '20:00 → Happy hour não vale mais (fim não entra)');
select is(pg_temp.preco_a('2026-11-28 21:30+00', 'Bacon'), null,
  'sábado 18:30 → Happy hour não vale (fora dos dias)');

-- Vigência: entre datas
select is(pg_temp.preco_a('2026-11-30 15:00+00', 'Suco'), null,
  '30/11 → Natal ainda não começou');
select is(pg_temp.preco_a('2026-12-25 02:59+00', 'Suco'), 8.00,
  '24/12 23:59 → Natal ainda vale (último dia inteiro)');
select is(pg_temp.preco_a('2026-12-25 03:00+00', 'Suco'), null,
  '25/12 00:00 → Natal acabou');

-- Desligada, excluída e desconto que não baixa o preço
select is(pg_temp.preco_a('2026-11-24 15:00+00', 'Fritas'), null,
  'promoção desligada ou excluída → Fritas sem desconto');
select is(pg_temp.preco_a('2026-11-24 15:00+00', 'Suco'), null,
  'Suco a R$ 15 sendo R$ 10 → promoção ignorada, preço cheio');

-- Dado: loja B aberta, entrega de R$ 6, com Classic R$ 39,90 (complemento
-- Bacon extra R$ 5), Bacon R$ 30, Suco R$ 10 e Água R$ 5, e as promoções
-- sempre ligadas:
--   15% no Classic, R$ 5 a menos no Bacon
--   Suco a R$ 8 e Suco com 30% (dois descontos no mesmo produto)
--   Água A e Água B, R$ 1 a menos cada (empate; a A foi criada antes)
--   Entrega grátis a partir de R$ 60
--   R$ 15 off acima de R$ 100, 10% off acima de R$ 80, e 50% off acima de
--   R$ 10 desligada
insert into public.stores (id, slug, name, is_open_override, settings) values
  ('5b000000-0000-0000-0000-000000000001', 'teste-loja-b', 'Loja B', true, '{"delivery_fee": 6}');
insert into public.categories (id, store_id, name) values
  ('cb000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price) values
  ('9b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Classic', 39.90),
  ('9b000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Bacon', 30),
  ('9b000000-0000-0000-0000-000000000003', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Suco', 10),
  ('9b000000-0000-0000-0000-000000000004', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Água', 5);
insert into public.complement_groups (id, store_id, name, min_select, max_select) values
  ('cf000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Adicionais', 0, 3);
insert into public.complements (id, store_id, complement_group_id, name, price) values
  ('c0000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cf000000-0000-0000-0000-000000000001', 'Bacon extra', 5);
insert into public.product_complement_groups (store_id, product_id, complement_group_id) values
  ('5b000000-0000-0000-0000-000000000001', '9b000000-0000-0000-0000-000000000001', 'cf000000-0000-0000-0000-000000000001');
insert into public.promotions (id, store_id, name, kind, rule, schedule, is_active, created_at) values
  ('b1000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Classic 15%', 'product_discount',
   '{"mode": "percent", "value": 15}', '{"type": "always"}', true, '2026-11-01'),
  ('b1000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000001', 'Bacon R$ 5 off', 'product_discount',
   '{"mode": "amount_off", "value": 5}', '{"type": "always"}', true, '2026-11-01'),
  ('b1000000-0000-0000-0000-000000000003', '5b000000-0000-0000-0000-000000000001', 'Suco a R$ 8', 'product_discount',
   '{"mode": "fixed_price", "value": 8}', '{"type": "always"}', true, '2026-11-01'),
  ('b1000000-0000-0000-0000-000000000004', '5b000000-0000-0000-0000-000000000001', 'Suco 30%', 'product_discount',
   '{"mode": "percent", "value": 30}', '{"type": "always"}', true, '2026-11-02'),
  ('b1000000-0000-0000-0000-000000000005', '5b000000-0000-0000-0000-000000000001', 'Água B', 'product_discount',
   '{"mode": "amount_off", "value": 1}', '{"type": "always"}', true, '2026-11-02'),
  ('b1000000-0000-0000-0000-000000000006', '5b000000-0000-0000-0000-000000000001', 'Água A', 'product_discount',
   '{"mode": "amount_off", "value": 1}', '{"type": "always"}', true, '2026-11-01'),
  ('b1000000-0000-0000-0000-000000000007', '5b000000-0000-0000-0000-000000000001', 'Entrega grátis acima de R$ 60', 'free_delivery',
   '{"min_subtotal": 60}', '{"type": "always"}', true, '2026-11-01'),
  ('b1000000-0000-0000-0000-000000000008', '5b000000-0000-0000-0000-000000000001', 'R$ 15 off acima de R$ 100', 'order_discount',
   '{"min_subtotal": 100, "mode": "amount_off", "value": 15}', '{"type": "always"}', true, '2026-11-01'),
  ('b1000000-0000-0000-0000-000000000009', '5b000000-0000-0000-0000-000000000001', '10% acima de R$ 80', 'order_discount',
   '{"min_subtotal": 80, "mode": "percent", "value": 10}', '{"type": "always"}', true, '2026-11-01'),
  ('b1000000-0000-0000-0000-000000000010', '5b000000-0000-0000-0000-000000000001', 'Metade desligada', 'order_discount',
   '{"min_subtotal": 10, "mode": "percent", "value": 50}', '{"type": "always"}', false, '2026-11-01');
insert into public.promotion_products (store_id, promotion_id, product_id) values
  ('5b000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '9b000000-0000-0000-0000-000000000001'),
  ('5b000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', '9b000000-0000-0000-0000-000000000002'),
  ('5b000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', '9b000000-0000-0000-0000-000000000003'),
  ('5b000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', '9b000000-0000-0000-0000-000000000003'),
  ('5b000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000005', '9b000000-0000-0000-0000-000000000004'),
  ('5b000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000006', '9b000000-0000-0000-0000-000000000004');
alter table public.promotion_products enable trigger promotion_products_are_unique;

-- Atalho: pedido na loja B com os itens [nome, quantidade, com Bacon extra]
create function pg_temp.pedido_b(p_modo text, p_itens jsonb)
returns jsonb language sql as $$
  select public.create_order('5b000000-0000-0000-0000-000000000001', p_modo::public.order_mode, 'Cliente', '11999990000', 'PIX',
    (select jsonb_agg(jsonb_build_object(
       'product_id', p.id,
       'quantity', (i ->> 1)::int,
       'complements', case when (i ->> 2)::boolean
         then '[{"complement_id": "c0000000-0000-0000-0000-000000000001"}]'::jsonb else '[]'::jsonb end))
     from jsonb_array_elements(p_itens) i
     join public.products p on p.store_id = '5b000000-0000-0000-0000-000000000001' and p.name = i ->> 0),
    case when p_modo = 'ENTREGA' then '{"street": "Rua A", "number": "1"}'::jsonb end)
$$;

-- O que o cardápio mostra
create function pg_temp.preco_b(p_nome text)
returns table (price numeric, promotion_name text) language sql as $$
  select (e ->> 'price')::numeric, e ->> 'promotion_name'
  from jsonb_array_elements(public.live_promotions('5b000000-0000-0000-0000-000000000001') -> 'products') e
  join public.products p on p.id = (e ->> 'product_id')::uuid
  where p.name = p_nome
$$;

select results_eq($$ select * from pg_temp.preco_b('Classic') $$, $$ values (33.92, 'Classic 15%') $$,
  'Classic R$ 39,90 com 15% → R$ 33,92 (33,915 arredonda para cima)');
select results_eq($$ select * from pg_temp.preco_b('Suco') $$, $$ values (7.00, 'Suco 30%') $$,
  'Suco a R$ 8 e com 30% → vale o menor preço, R$ 7');
select results_eq($$ select * from pg_temp.preco_b('Água') $$, $$ values (4.00, 'Água A') $$,
  'Água com dois descontos iguais → vale a promoção criada primeiro');
select is(public.live_promotions('5b000000-0000-0000-0000-000000000001') -> 'free_delivery',
  '{"id": "b1000000-0000-0000-0000-000000000007", "name": "Entrega grátis acima de R$ 60", "min_subtotal": 60}'::jsonb,
  'loja B → mostra a entrega grátis a partir de R$ 60');
select is((select array_agg(e ->> 'name' order by e ->> 'name')
           from jsonb_array_elements(public.live_promotions('5b000000-0000-0000-0000-000000000001') -> 'order_discounts') e),
  array['10% acima de R$ 80', 'R$ 15 off acima de R$ 100'],
  'loja B → mostra os descontos no pedido ligados, sem o desligado');

-- Pedido 1: entrega, Classic com Bacon extra (33,92 + 5) e Bacon (25)
select results_eq(
  $$ select o ->> 'subtotal', o ->> 'delivery_fee', o ->> 'discount', o ->> 'total'
     from (select pg_temp.pedido_b('ENTREGA', '[["Classic", 1, true], ["Bacon", 1, false]]') o) t $$,
  $$ values ('63.92', '0.00', '0.00', '63.92') $$,
  'entrega de R$ 63,92 com produtos em promoção → subtotal com desconto e entrega grátis');
select results_eq(
  $$ select i.name, i.unit_price, i.total from public.order_items i
     join public.orders o on o.id = i.order_id
     where o.store_id = '5b000000-0000-0000-0000-000000000001' and o.number = 1 order by i.name $$,
  $$ values ('Bacon', 25.00, 25.00), ('Classic', 33.92, 38.92) $$,
  'pedido 1 → itens gravados com o preço promocional, complemento com preço cheio');
select is(
  (select applied_promotions from public.orders where store_id = '5b000000-0000-0000-0000-000000000001' and number = 1),
  '[{"id": "b1000000-0000-0000-0000-000000000002", "name": "Bacon R$ 5 off", "kind": "product_discount", "amount": 5.00},
    {"id": "b1000000-0000-0000-0000-000000000001", "name": "Classic 15%", "kind": "product_discount", "amount": 5.98},
    {"id": "b1000000-0000-0000-0000-000000000007", "name": "Entrega grátis acima de R$ 60", "kind": "free_delivery", "amount": 6}]'::jsonb,
  'pedido 1 → applied_promotions com a economia de cada promoção e a taxa que deixou de cobrar');
select is(
  public.get_order_by_token((select public_token from public.orders where store_id = '5b000000-0000-0000-0000-000000000001' and number = 1)) -> 'applied_promotions',
  (select applied_promotions from public.orders where store_id = '5b000000-0000-0000-0000-000000000001' and number = 1),
  'pedido 1 consultado pelo link → traz applied_promotions, para a tela mostrar a taxa riscada');

-- Pedido 2: retirada, 3 Classic (101,76)
select results_eq(
  $$ select o ->> 'subtotal', o ->> 'delivery_fee', o ->> 'discount', o ->> 'total'
     from (select pg_temp.pedido_b('RETIRADA', '[["Classic", 3, false]]') o) t $$,
  $$ values ('101.76', '0.00', '15.00', '86.76') $$,
  'retirada de R$ 101,76 → R$ 15 off vence os 10% (R$ 10,18)');
select is(
  (select array_agg(e ->> 'kind' order by e ->> 'kind')
   from public.orders o, jsonb_array_elements(o.applied_promotions) e
   where o.store_id = '5b000000-0000-0000-0000-000000000001' and o.number = 2),
  array['order_discount', 'product_discount'],
  'retirada acima do mínimo da entrega grátis → sem entrega grátis em applied_promotions');

-- Pedido 3: retirada, 2 Classic e 2 Suco (67,84 + 14)
select results_eq(
  $$ select o ->> 'subtotal', o ->> 'discount', o ->> 'total'
     from (select pg_temp.pedido_b('RETIRADA', '[["Classic", 2, false], ["Suco", 2, false]]') o) t $$,
  $$ values ('81.84', '8.18', '73.66') $$,
  'retirada de R$ 81,84 → só os 10% valem, R$ 8,18 (8,184 arredondado)');

-- Pedido 4: entrega, 1 Suco
select results_eq(
  $$ select o ->> 'subtotal', o ->> 'delivery_fee', o ->> 'discount', o ->> 'total'
     from (select pg_temp.pedido_b('ENTREGA', '[["Suco", 1, false]]') o) t $$,
  $$ values ('7.00', '6.00', '0.00', '13.00') $$,
  'entrega de R$ 7 → paga a taxa e não tem desconto no pedido (o desligado não vale)');

-- Pedido 5: o pedido grava o mesmo preço que o cardápio mostra
select is(
  (pg_temp.pedido_b('RETIRADA', '[["Água", 2, false]]') ->> 'subtotal')::numeric,
  (select price * 2 from pg_temp.preco_b('Água')),
  'duas Águas → subtotal igual ao preço do cardápio vezes 2');

-- Promoção que deixou de valer não entra no pedido
update public.promotions set is_active = false where id = 'b1000000-0000-0000-0000-000000000002';
select is(
  (pg_temp.pedido_b('RETIRADA', '[["Bacon", 1, false]]') ->> 'subtotal')::numeric, 30.00,
  'Bacon depois de desligar a promoção → preço cheio');
select is(
  (select count(*)::int from jsonb_array_elements(public.live_promotions('5b000000-0000-0000-0000-000000000001') -> 'products') e
   where e ->> 'product_id' = '9b000000-0000-0000-0000-000000000002'), 0,
  'Bacon depois de desligar a promoção → cardápio sem preço promocional');

-- Loja inativa não mostra promoção
update public.stores set active = false where id = '5b000000-0000-0000-0000-000000000001';
select is(public.live_promotions('5b000000-0000-0000-0000-000000000001'),
  '{"products": [], "free_delivery": null, "order_discounts": []}'::jsonb,
  'loja inativa → sem promoções');

-- Quem pode chamar
select ok(has_function_privilege('anon', 'public.live_promotions(uuid, timestamptz)', 'execute'),
  'anônimo chama live_promotions → permitido');
select ok(not has_function_privilege('anon', 'private.live_product_prices(uuid, timestamptz)', 'execute'),
  'anônimo chama live_product_prices → sem permissão');

select * from finish();
rollback;
