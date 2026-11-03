-- Exclusão de categoria: é lógica (deleted_at) e fica bloqueada enquanto a
-- categoria tiver produto não excluído.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

-- Dado: loja A com dono, categoria "Lanches" com um Burger ativo, categoria
-- "Antigos" só com um produto já excluído e categoria "Vazia" sem produtos
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local');
insert into public.profiles (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'dono-a@teste.local')
on conflict (id) do nothing;
insert into public.stores (id, slug, name) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A');
insert into public.store_users (store_id, user_id, role) values
  ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'OWNER');
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches'),
  ('ca000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Antigos'),
  ('ca000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', 'Vazia');
insert into public.products (store_id, category_id, name, price, deleted_at) values
  ('5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 10, null),
  ('5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000002', 'Burger antigo', 10, now());

-- Dado: o dono da loja A logado
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

select throws_ok(
  $$ update public.categories set deleted_at = now() where id = 'ca000000-0000-0000-0000-000000000001' $$,
  'P0001', 'A categoria tem produtos. Mova ou exclua os produtos antes de excluir a categoria.',
  'excluir categoria com produto ativo → bloqueado');
select lives_ok(
  $$ update public.categories set name = 'Burgers', is_available = false, sort_order = 3
      where id = 'ca000000-0000-0000-0000-000000000001' $$,
  'renomear, desligar e reordenar categoria com produtos → permitido');
select lives_ok(
  $$ update public.categories set deleted_at = now() where id = 'ca000000-0000-0000-0000-000000000002' $$,
  'excluir categoria só com produtos já excluídos → permitido');
select lives_ok(
  $$ update public.categories set deleted_at = now() where id = 'ca000000-0000-0000-0000-000000000003' $$,
  'excluir categoria vazia → permitido');

-- Dado: visitante sem login
reset role;
set local role anon;
do $$ begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end $$;

select results_eq(
  $$ select name from public.categories where store_id = '5a000000-0000-0000-0000-000000000001' $$,
  $$ values ('Burgers') $$,
  'visitante lista categorias → excluídas não aparecem');

select * from finish();
rollback;
