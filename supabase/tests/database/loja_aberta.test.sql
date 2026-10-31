-- Loja aberta ou fechada: is_store_open (horários, turno após a meia-noite,
-- botão do painel, loja inativa) e create_order recusando loja fechada.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

-- Loja H: só horários, sexta 18:00-02:00 (atravessa a meia-noite).
-- Loja F: fechada pelo botão do painel.
insert into public.stores (id, slug, name, is_open_override) values
  ('5c000000-0000-0000-0000-000000000001', 'teste-loja-horario', 'Loja H', null),
  ('5f000000-0000-0000-0000-000000000001', 'teste-loja-fechada', 'Loja F', false);
insert into public.store_hours (store_id, weekday, opens_at, closes_at) values
  ('5c000000-0000-0000-0000-000000000001', 5, '18:00', '02:00');
insert into public.categories (id, store_id, name) values
  ('cf000000-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price) values
  ('9f000000-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001', 'cf000000-0000-0000-0000-000000000001', 'Burger', 10);

-- Horários em UTC; São Paulo é UTC-3. 30/10/2026 é sexta.
select ok(public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-30 23:00Z'), 'sexta 20:00 está aberta');
select ok(public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-31 04:00Z'), 'sábado 01:00 ainda é o turno de sexta');
select ok(not public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-31 06:00Z'), 'sábado 03:00 está fechada');
select ok(not public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-30 20:00Z'), 'sexta 17:00 está fechada');
select ok(not public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-29 23:00Z'), 'quinta 20:00 está fechada');

update public.stores set is_open_override = false where id = '5c000000-0000-0000-0000-000000000001';
select ok(not public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-30 23:00Z'), 'botão fechado vence o horário');
update public.stores set is_open_override = true where id = '5c000000-0000-0000-0000-000000000001';
select ok(public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-31 06:00Z'), 'botão aberto vence o horário');
update public.stores set active = false where id = '5c000000-0000-0000-0000-000000000001';
select ok(not public.is_store_open('5c000000-0000-0000-0000-000000000001'), 'loja inativa está fechada');

select throws_ok(
  $$ select public.create_order('5f000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9f000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Loja fechada', 'create_order recusa loja fechada');

select * from finish();
rollback;
