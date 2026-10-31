-- O que um membro (STAFF) pode fazer na própria loja: editar só as colunas
-- do painel em stores e ler a equipe em store_users sem poder alterá-la.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

-- Dado: loja A com dono e funcionário, loja B com outro dono, e o
-- funcionário da loja A logado
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local'),
  ('a0000000-0000-0000-0000-000000000002', 'staff-a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono-b@teste.local');
insert into public.profiles (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local'),
  ('a0000000-0000-0000-0000-000000000002', 'staff-a@teste.local'),
  ('b0000000-0000-0000-0000-000000000001', 'dono-b@teste.local')
on conflict (id) do nothing;
insert into public.stores (id, slug, name) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A'),
  ('5b000000-0000-0000-0000-000000000001', 'teste-loja-b', 'Loja B');
insert into public.store_users (store_id, user_id, role) values
  ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'OWNER'),
  ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'STAFF'),
  ('5b000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'OWNER');

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated"}', true);
end $$;

select lives_ok(
  $$ update public.stores set name = 'Loja A Nova', is_open_override = false where id = '5a000000-0000-0000-0000-000000000001' $$,
  'funcionário edita nome e botão de aberto → aceito');
select throws_ok(
  $$ update public.stores set slug = 'outro-slug' where id = '5a000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'funcionário muda o slug → negado');
select throws_ok(
  $$ update public.stores set active = false, plan = 'free', next_order_number = 1 where id = '5a000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'funcionário muda active, plan e next_order_number → negado');
select throws_ok(
  $$ delete from public.stores where id = '5a000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'funcionário exclui a loja → negado');

select is((select count(*)::int from public.store_users), 2, 'funcionário lê store_users → só os 2 da loja A');
select throws_ok(
  $$ insert into public.store_users (store_id, user_id, role)
     values ('5a000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'OWNER') $$,
  '42501', null, 'funcionário adiciona membro → negado');

select * from finish();
rollback;
