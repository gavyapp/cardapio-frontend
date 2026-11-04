-- Grupos de complementos editados pelo lojista: regras de mínimo e máximo,
-- opção pausada ou excluída fora do cardápio e isolamento entre lojas.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

-- Dado: lojas A e B com dono; a loja A tem o grupo "Adicionais" com Bacon,
-- Cheddar (pausado) e Ovo (excluído)
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
insert into public.complement_groups (id, store_id, name, min_select, max_select) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Adicionais', 0, 3);
insert into public.complements (store_id, complement_group_id, name, price, is_available, deleted_at) values
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Bacon', 6, true, null),
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Cheddar', 4, false, null),
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Ovo', 3, true, now());

-- Dado: o dono da loja A logado
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

select throws_ok(
  $$ update public.complement_groups set min_select = 4 where id = '6a000000-0000-0000-0000-000000000001' $$,
  '23514', null,
  'mínimo maior que o máximo → recusado');
select throws_ok(
  $$ update public.complement_groups set max_select = 0 where id = '6a000000-0000-0000-0000-000000000001' $$,
  '23514', null,
  'máximo 0 → recusado');
select lives_ok(
  $$ update public.complement_groups set min_select = 1, max_select = 1, allow_repeat = true
      where id = '6a000000-0000-0000-0000-000000000001' $$,
  'grupo vira obrigatório (mínimo 1) → permitido');
select throws_ok(
  $$ insert into public.complements (store_id, complement_group_id, name, price)
     values ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Grátis?', -1) $$,
  '23514', null,
  'opção com preço adicional negativo → recusada');

-- Dado: o dono da loja B logado
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "b0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

update public.complements set is_available = false
 where store_id = '5a000000-0000-0000-0000-000000000001' and name = 'Bacon';
select is(
  (select is_available from public.complements where store_id = '5a000000-0000-0000-0000-000000000001' and name = 'Bacon'),
  true,
  'dono B pausa opção da loja A → opção continua disponível');

-- Dado: visitante sem login
reset role;
set local role anon;
do $$ begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end $$;

select results_eq(
  $$ select name from public.complements where store_id = '5a000000-0000-0000-0000-000000000001' order by name $$,
  $$ values ('Bacon'), ('Cheddar') $$,
  'visitante lista opções → excluída não aparece');
select results_eq(
  $$ select name from public.complements where store_id = '5a000000-0000-0000-0000-000000000001' and is_available order by name $$,
  $$ values ('Bacon') $$,
  'visitante filtra disponíveis → pausada fica de fora');

select * from finish();
rollback;
