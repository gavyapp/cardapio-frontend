-- Gerenciar promoções pelo painel: save_promotion grava a promoção e os
-- produtos numa transação só, um produto fica em uma promoção de produto em
-- uso por vez, e promotion_order_counts conta os pedidos de cada promoção.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(22);

-- Dado: loja A com dono, Classic e Bacon; loja B com dono e Burger B
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
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Classic', 40),
  ('9a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Bacon', 30),
  ('9b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Burger B', 10);

-- Atalho: id de uma promoção da loja A pelo nome.
create function pg_temp.promo(p_name text)
returns uuid language sql as $$
  select id from public.promotions
  where store_id = '5a000000-0000-0000-0000-000000000001' and name = p_name
$$;

-- Dado: o dono da loja A logado
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

-- Criar
select lives_ok(
  $$ select public.save_promotion(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_name => 'Classic −20%', p_kind => 'product_discount',
       p_rule => '{"mode": "percent", "value": 20}', p_schedule => '{"type": "always"}',
       p_is_active => true,
       p_product_ids => array['9a000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'nova promoção de produto com o Classic → aceita');
select results_eq(
  $$ select p.name, p.is_active, pp.product_id from public.promotions p
       join public.promotion_products pp on pp.promotion_id = p.id
      where p.id = pg_temp.promo('Classic −20%') $$,
  $$ values ('Classic −20%', true, '9a000000-0000-0000-0000-000000000001'::uuid) $$,
  'promoção nova → gravada ligada e com o produto');

select throws_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'Sem produto',
       'product_discount', '{"mode": "percent", "value": 10}', '{"type": "always"}', true, '{}') $$,
  'P0001', 'Escolha pelo menos 1 produto.',
  'promoção de produto sem produto → recusada');
select throws_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'Entrega',
       'free_delivery', '{"min_subtotal": 50}', '{"type": "always"}', true,
       array['9a000000-0000-0000-0000-000000000002']::uuid[]) $$,
  'P0001', 'Só promoção de produto tem produtos.',
  'entrega grátis com produto → recusada');
select throws_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'De outra loja',
       'product_discount', '{"mode": "percent", "value": 10}', '{"type": "always"}', true,
       array['9b000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'P0001', 'Um dos produtos não existe mais. Recarregue a página.',
  'produto da loja B → recusado');
select throws_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'Errada',
       'order_discount', '{"min_subtotal": 50, "mode": "amount_off", "value": 60}', '{"type": "always"}', true, '{}') $$,
  '23514', null,
  'desconto maior que o mínimo → recusado pelo check do formato');

-- Conflito de produto
select throws_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'Outra do Classic',
       'product_discount', '{"mode": "amount_off", "value": 5}', '{"type": "always"}', true,
       array['9a000000-0000-0000-0000-000000000002', '9a000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'P0001', 'Classic já está em "Classic −20%".',
  'Classic em outra promoção ligada → recusado e nada gravado');
select is(
  (select count(*)::int from public.promotions where name = 'Outra do Classic'), 0,
  'promoção recusada → não fica gravada pela metade');

select lives_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'Próxima do Classic',
       'product_discount', '{"mode": "amount_off", "value": 5}', '{"type": "always"}', false,
       array['9a000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'Classic em promoção pausada → aceito');
select throws_ok(
  $$ update public.promotions set is_active = true where id = pg_temp.promo('Próxima do Classic') $$,
  'P0001', 'Classic já está em "Classic −20%".',
  'ligar a pausada com o Classic em uso → recusado');

select lives_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'Natal passado',
       'product_discount', '{"mode": "amount_off", "value": 5}',
       '{"type": "dates", "start": "2020-12-01", "end": "2020-12-24"}', true,
       array['9a000000-0000-0000-0000-000000000001']::uuid[]) $$,
  'Classic em promoção ligada mas encerrada → aceito');
select throws_ok(
  $$ update public.promotions set schedule = '{"type": "always"}'
      where id = pg_temp.promo('Natal passado') $$,
  'P0001', 'Classic já está em "Classic −20%".',
  'tirar a encerrada do passado com o Classic em uso → recusado');

update public.promotions set is_active = false where id = pg_temp.promo('Classic −20%');
select lives_ok(
  $$ update public.promotions set is_active = true where id = pg_temp.promo('Próxima do Classic') $$,
  'pausar a primeira e ligar a próxima → aceito');
update public.promotions set is_active = false where id = pg_temp.promo('Próxima do Classic');
update public.promotions set is_active = true, deleted_at = now() where id = pg_temp.promo('Classic −20%');
select lives_ok(
  $$ update public.promotions set is_active = true where id = pg_temp.promo('Próxima do Classic') $$,
  'promoção excluída não segura o produto → aceito');

-- Editar e trocar o tipo
select lives_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'Agora é entrega',
       'free_delivery', '{"min_subtotal": 70}', '{"type": "always"}', true, '{}',
       pg_temp.promo('Natal passado')) $$,
  'promoção de produto vira entrega grátis → aceito');
select results_eq(
  $$ select p.kind, (select count(*)::int from public.promotion_products pp where pp.promotion_id = p.id)
       from public.promotions p where p.id = pg_temp.promo('Agora é entrega') $$,
  $$ values ('free_delivery', 0) $$,
  'trocar o tipo → os produtos saem junto');
select lives_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'Próxima do Classic',
       'product_discount', '{"mode": "amount_off", "value": 5}', '{"type": "always"}', true,
       array['9a000000-0000-0000-0000-000000000002']::uuid[],
       pg_temp.promo('Próxima do Classic')) $$,
  'editar trocando Classic por Bacon → aceito');
select results_eq(
  $$ select product_id from public.promotion_products where promotion_id = pg_temp.promo('Próxima do Classic') $$,
  $$ values ('9a000000-0000-0000-0000-000000000002'::uuid) $$,
  'editar → fica só o produto novo');
select throws_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'Sumiu',
       'free_delivery', '{"min_subtotal": 0}', '{"type": "always"}', true, '{}',
       pg_temp.promo('Classic −20%')) $$,
  'P0001', 'Promoção não encontrada.',
  'editar promoção excluída → recusado');

-- Dado: dono da loja B logado
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;
select throws_ok(
  $$ select public.save_promotion('5a000000-0000-0000-0000-000000000001', 'Invasão',
       'free_delivery', '{"min_subtotal": 0}', '{"type": "always"}', true, '{}') $$,
  '42501', 'Sem permissão',
  'dono da loja B salvando na loja A → recusado');

-- Pedidos por promoção
-- Dado: na loja A, pedidos de hoje com a entrega grátis (um concluído, um
-- cancelado, um com as duas promoções) e um de 10 dias atrás
reset role;
insert into public.customers (id, store_id, phone, name) values
  ('c0000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '11999990001', 'Ana');
insert into public.orders (store_id, customer_id, number, mode, customer_name, customer_phone, payment_method,
                           subtotal, total, status, created_at, applied_promotions) values
  ('5a000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 9001, 'RETIRADA', 'Ana', '11999990001', 'PIX', 10, 10, 'CONCLUIDO', now(),
   jsonb_build_array(jsonb_build_object('id', pg_temp.promo('Agora é entrega'), 'kind', 'free_delivery', 'amount', 6))),
  ('5a000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 9002, 'RETIRADA', 'Bia', '11999990002', 'PIX', 10, 10, 'CANCELADO', now(),
   jsonb_build_array(jsonb_build_object('id', pg_temp.promo('Agora é entrega'), 'kind', 'free_delivery', 'amount', 6))),
  ('5a000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 9003, 'RETIRADA', 'Caio', '11999990003', 'PIX', 10, 10, 'RECEBIDO', now(),
   jsonb_build_array(jsonb_build_object('id', pg_temp.promo('Agora é entrega'), 'kind', 'free_delivery', 'amount', 6),
                     jsonb_build_object('id', pg_temp.promo('Próxima do Classic'), 'kind', 'product_discount', 'amount', 5))),
  ('5a000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 9004, 'RETIRADA', 'Davi', '11999990004', 'PIX', 10, 10, 'CONCLUIDO', now() - interval '10 days',
   jsonb_build_array(jsonb_build_object('id', pg_temp.promo('Próxima do Classic'), 'kind', 'product_discount', 'amount', 5)));

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;
select results_eq(
  $$ select promotion_id, order_count from public.promotion_order_counts(
       '5a000000-0000-0000-0000-000000000001', now() - interval '7 days') order by 2 desc $$,
  $$ values (pg_temp.promo('Agora é entrega'), 2), (pg_temp.promo('Próxima do Classic'), 1) $$,
  'últimos 7 dias → conta os pedidos de cada promoção, sem cancelado nem pedido antigo');

do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;
select is_empty(
  $$ select * from public.promotion_order_counts('5a000000-0000-0000-0000-000000000001', now() - interval '7 days') $$,
  'dono da loja B → não vê os pedidos da loja A');

select * from finish();
rollback;
