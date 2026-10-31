-- Testes da T04 (B1 a B7). Rodam com `npx supabase test db` (Supabase local)
-- e no CI da T05. Tudo dentro de uma transação desfeita no final.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(37);

-- -------------------------------------------------------------------------
-- Dados de teste
-- -------------------------------------------------------------------------
-- Usuários: dono e funcionário da loja A, dono da loja B.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local'),
  ('a0000000-0000-0000-0000-000000000002', 'staff-a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono-b@teste.local');
insert into public.profiles (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local'),
  ('a0000000-0000-0000-0000-000000000002', 'staff-a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono-b@teste.local')
on conflict (id) do nothing;

-- Loja A: aberta pelo botão, aceita PIX e dinheiro.
-- Loja H: só horários, sexta 18:00-02:00 (atravessa a meia-noite).
insert into public.stores (id, slug, name, is_open_override, settings) values
  ('5a000000-0000-0000-0000-000000000001', 't04-loja-a', 'Loja A', true, '{"payment_methods": ["PIX", "DINHEIRO"]}'),
  ('5b000000-0000-0000-0000-000000000001', 't04-loja-b', 'Loja B', false, '{}'),
  ('5c000000-0000-0000-0000-000000000001', 't04-loja-h', 'Loja H', null, '{}');
insert into public.store_users (store_id, user_id, role) values
  ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'OWNER'),
  ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'STAFF'),
  ('5b000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'OWNER');
insert into public.store_hours (store_id, weekday, opens_at, closes_at) values
  ('5c000000-0000-0000-0000-000000000001', 5, '18:00', '02:00');

insert into public.categories (id, store_id, name, is_available) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches', true),
  ('ca000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Desligada', false),
  ('cb000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Lanches B', true);
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 10),
  ('9a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000002', 'Escondido', 10),
  ('9b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Burger B', 10);
-- Grupo excluído com um complemento ainda ligado ao Burger.
insert into public.complement_groups (id, store_id, name, deleted_at) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Antigo', now());
insert into public.complements (id, store_id, complement_group_id, name, price) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Bacon', 3);
insert into public.product_complement_groups (store_id, product_id, complement_group_id) values
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001');

-- Pedido de R$ 10 na loja A, usado nos testes do painel.
create temporary table pedido on commit drop as
select public.create_order(
  '5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
  '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]'
) as r;
grant select on pedido to authenticated;

-- -------------------------------------------------------------------------
-- B1: loja fechada não recebe pedido
-- -------------------------------------------------------------------------
-- Horários em UTC; São Paulo é UTC-3. 30/10/2026 é sexta.
select ok(public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-30 23:00Z'), 'B1: sexta 20:00 está aberta');
select ok(public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-31 04:00Z'), 'B1: sábado 01:00 ainda é o turno de sexta');
select ok(not public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-31 06:00Z'), 'B1: sábado 03:00 está fechada');
select ok(not public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-30 20:00Z'), 'B1: sexta 17:00 está fechada');
select ok(not public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-29 23:00Z'), 'B1: quinta 20:00 está fechada');

update public.stores set is_open_override = false where id = '5c000000-0000-0000-0000-000000000001';
select ok(not public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-30 23:00Z'), 'B1: botão fechado vence o horário');
update public.stores set is_open_override = true where id = '5c000000-0000-0000-0000-000000000001';
select ok(public.is_store_open('5c000000-0000-0000-0000-000000000001', '2026-10-31 06:00Z'), 'B1: botão aberto vence o horário');
update public.stores set active = false where id = '5c000000-0000-0000-0000-000000000001';
select ok(not public.is_store_open('5c000000-0000-0000-0000-000000000001'), 'B1: loja inativa está fechada');

select throws_ok(
  $$ select public.create_order('5b000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9b000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Loja fechada', 'B1: create_order recusa loja fechada');

-- -------------------------------------------------------------------------
-- B6: validações do pedido
-- -------------------------------------------------------------------------
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000002"}]') $$,
  'Produto indisponível%', 'B6: recusa produto de categoria desligada');
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001",
          "complements": [{"complement_id": "7a000000-0000-0000-0000-000000000001"}]}]') $$,
  'Complemento indisponível%', 'B6: recusa complemento de grupo excluído');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'CARTAO',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Forma de pagamento não aceita pela loja', 'B6: recusa forma de pagamento que a loja não aceita');
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'DINHEIRO',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]', null, 5) $$,
  'Troco deve ser maior ou igual ao total%', 'B6: recusa troco menor que o total');
select lives_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'DINHEIRO',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]', null, 10) $$,
  'B6: aceita troco igual ao total');
select is((select (r ->> 'total')::numeric from pedido), 10.00, 'B6: pedido válido sai com o total certo');

-- -------------------------------------------------------------------------
-- B7: products.is_suggested
-- -------------------------------------------------------------------------
select has_column('public', 'products', 'is_suggested', 'B7: products tem is_suggested');
select col_not_null('public', 'products', 'is_suggested', 'B7: is_suggested não aceita nulo');
select col_default_is('public', 'products', 'is_suggested', 'false', 'B7: is_suggested começa false');

-- -------------------------------------------------------------------------
-- B5: funções internas fora da API
-- -------------------------------------------------------------------------
select hasnt_function('public', 'is_store_member', 'B5: is_store_member saiu do public');
select hasnt_function('public', 'auth_store_ids', 'B5: auth_store_ids saiu do public');
select hasnt_function('public', 'handle_new_auth_user', 'B5: handle_new_auth_user saiu do public');
select ok(not has_function_privilege('anon', 'public.update_order_status(uuid, public.order_status, text, boolean)', 'execute'),
  'B5: anônimo não chama update_order_status');
select ok(not has_function_privilege('anon', 'public.mark_order_read(uuid)', 'execute'),
  'B5: anônimo não chama mark_order_read');
select ok(not has_function_privilege('anon', 'private.is_store_member(uuid)', 'execute'),
  'B5: anônimo não chama is_store_member');
select ok(has_function_privilege('anon', 'public.create_order(uuid, public.order_mode, text, text, public.payment_method, jsonb, jsonb, numeric, text)', 'execute')
      and has_function_privilege('anon', 'public.get_order_by_token(text)', 'execute'),
  'B5: create_order e get_order_by_token continuam públicas');
select ok((select proconfig::text like '%search_path%' from pg_proc where oid = 'public.set_updated_at()'::regprocedure),
  'B5: set_updated_at tem search_path fixo');

-- -------------------------------------------------------------------------
-- Daqui em diante como funcionário (STAFF) da loja A, logado.
-- -------------------------------------------------------------------------
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated"}', true);
end $$;

-- B2: evento grava o status anterior
select lives_ok(
  $$ select public.update_order_status((select (r ->> 'id')::uuid from pedido), 'EM_PREPARO') $$,
  'B2: staff aceita o pedido');
select results_eq(
  $$ select from_status::text, to_status::text from public.order_events
     where order_id = (select (r ->> 'id')::uuid from pedido) and to_status = 'EM_PREPARO' $$,
  $$ values ('RECEBIDO', 'EM_PREPARO') $$,
  'B2: evento sai de RECEBIDO para EM_PREPARO');
select is(
  (public.update_order_status((select (r ->> 'id')::uuid from pedido), 'EM_PREPARO', null, true)).is_paid,
  true, 'B2: marca como pago sem mudar o status');

-- B3: sem UPDATE direto em orders
select throws_ok(
  $$ update public.orders set total = 0 where id = (select (r ->> 'id')::uuid from pedido) $$,
  '42501', null, 'B3: membro não altera pedido direto na tabela');
select throws_ok(
  $$ insert into public.order_events (store_id, order_id, to_status)
     select '5a000000-0000-0000-0000-000000000001', (r ->> 'id')::uuid, 'CONCLUIDO' from pedido $$,
  '42501', null, 'B3: membro não grava evento direto');

-- B4: colunas de stores restritas
select lives_ok(
  $$ update public.stores set name = 'Loja A Nova', is_open_override = false where id = '5a000000-0000-0000-0000-000000000001' $$,
  'B4: membro edita nome e botão de aberto');
select throws_ok(
  $$ update public.stores set slug = 'outro-slug' where id = '5a000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'B4: membro não muda slug');
select throws_ok(
  $$ update public.stores set active = false, plan = 'free', next_order_number = 1 where id = '5a000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'B4: membro não muda active, plan nem next_order_number');
select throws_ok(
  $$ delete from public.stores where id = '5a000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'B4: membro não exclui a loja');

-- store_users: leitura sem recursão
select is((select count(*)::int from public.store_users), 2, 'store_users: membro lê a equipe da própria loja');
select throws_ok(
  $$ insert into public.store_users (store_id, user_id, role)
     values ('5a000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'OWNER') $$,
  '42501', null, 'store_users: staff não adiciona membro');

select * from finish();
rollback;
