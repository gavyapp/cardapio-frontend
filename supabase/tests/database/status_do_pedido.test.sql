-- Mudança de status pelo painel: update_order_status grava o status anterior
-- no evento e marca como pago; pedido e eventos não mudam direto na tabela.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

-- Dado: pedido novo (RECEBIDO) numa loja com um funcionário logado
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000002', 'staff-a@teste.local');
insert into public.profiles (id, email) values
  ('a0000000-0000-0000-0000-000000000002', 'staff-a@teste.local')
on conflict (id) do nothing;
insert into public.stores (id, slug, name, is_open_override) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true);
insert into public.store_users (store_id, user_id, role) values
  ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'STAFF');
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 10);

create temporary table pedido on commit drop as
select (public.create_order(
  '5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
  '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]'
) ->> 'id')::uuid as id;
grant select on pedido to authenticated;

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated"}', true);
end $$;

select lives_ok(
  $$ select public.update_order_status((select id from pedido), 'EM_PREPARO') $$,
  'funcionário aceita o pedido → sem erro');
select results_eq(
  $$ select from_status::text, to_status::text from public.order_events
     where order_id = (select id from pedido) and to_status = 'EM_PREPARO' $$,
  $$ values ('RECEBIDO', 'EM_PREPARO') $$,
  'pedido aceito → evento de RECEBIDO para EM_PREPARO');
select is(
  (public.update_order_status((select id from pedido), 'EM_PREPARO', null, true)).is_paid,
  true, 'marcar como pago no mesmo status → pago, status mantido');

select throws_ok(
  $$ update public.orders set total = 0 where id = (select id from pedido) $$,
  '42501', null, 'UPDATE direto em orders → negado');
select throws_ok(
  $$ insert into public.order_events (store_id, order_id, to_status)
     select '5a000000-0000-0000-0000-000000000001', id, 'CONCLUIDO' from pedido $$,
  '42501', null, 'INSERT direto em order_events → negado');

select * from finish();
rollback;
