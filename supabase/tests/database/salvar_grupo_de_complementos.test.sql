-- Salvar grupo de complementos (save_complement_group): cria ou altera o
-- grupo e as opções numa transação só. Opção que sai da lista é excluída
-- (lógica), opção com id do grupo é alterada e o resto vira opção nova.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

-- Dado: loja A com dono, grupo "Adicionais" (Bacon, Cheddar, Ovo) e grupo
-- "Molhos" (Catupiry); loja B com dono e um grupo
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
insert into public.complement_groups (id, store_id, name, max_select, sort_order) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Adicionais', 3, 0),
  ('6a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Molhos', 1, 1),
  ('6b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Adicionais B', 1, 0);
insert into public.complements (id, store_id, complement_group_id, name, price, sort_order) values
  ('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Bacon', 4, 0),
  ('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Cheddar', 3, 1),
  ('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Ovo', 2, 2),
  ('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 'Catupiry', 3, 0);

-- Dado: o dono da loja A logado
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

-- Alteração: Cheddar muda, Bacon e Ovo saem, Cebola entra e o id do
-- Catupiry (de outro grupo) é tratado como opção nova
select lives_ok(
  $$ select public.save_complement_group(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_name => 'Extras', p_min_select => 0, p_max_select => 2, p_allow_repeat => false,
       p_options => '[
         {"id": "0a000000-0000-0000-0000-000000000002", "name": "Cheddar duplo", "price": 5, "is_available": false},
         {"name": "Cebola", "price": 1.5, "is_available": true},
         {"id": "0a000000-0000-0000-0000-000000000004", "name": "Catupiry", "price": 3, "is_available": true}
       ]',
       p_group_id => '6a000000-0000-0000-0000-000000000001') $$,
  'altera Adicionais para Extras com 3 opções → aceito');
select results_eq(
  $$ select name, min_select::int, max_select::int from public.complement_groups
      where id = '6a000000-0000-0000-0000-000000000001' $$,
  $$ values ('Extras', 0, 2) $$,
  'grupo alterado → nome e regras novas');
select results_eq(
  $$ select name, price, is_available from public.complements
      where complement_group_id = '6a000000-0000-0000-0000-000000000001' and deleted_at is null
      order by sort_order $$,
  $$ values ('Cheddar duplo', 5::numeric, false), ('Cebola', 1.5::numeric, true), ('Catupiry', 3::numeric, true) $$,
  'opções do grupo → as enviadas, na ordem enviada');
select is(
  (select name from public.complements where id = '0a000000-0000-0000-0000-000000000002'), 'Cheddar duplo',
  'opção enviada com id do grupo → alterada no mesmo registro');
select is(
  (select count(*)::int from public.complements
    where id in ('0a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000003')
      and deleted_at is not null), 2,
  'opções que saíram da lista → excluídas (lógica)');
select results_eq(
  $$ select complement_group_id, deleted_at is null from public.complements
      where id = '0a000000-0000-0000-0000-000000000004' $$,
  $$ values ('6a000000-0000-0000-0000-000000000002'::uuid, true) $$,
  'id de opção de outro grupo → a original continua no grupo dela');

-- Grupo novo
select lives_ok(
  $$ select public.save_complement_group(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_name => 'Ponto da carne', p_min_select => 1, p_max_select => 1, p_allow_repeat => false,
       p_options => '[{"name": "Mal passado", "price": 0, "is_available": true},
                      {"name": "Ao ponto", "price": 0, "is_available": true}]') $$,
  'cria Ponto da carne com 2 opções → aceito');
select results_eq(
  $$ select g.sort_order, count(c.id)::int from public.complement_groups g
       join public.complements c on c.complement_group_id = g.id
      where g.name = 'Ponto da carne' group by g.sort_order $$,
  $$ values (2, 2) $$,
  'grupo novo → no fim da lista, com as opções');

-- Recusas
select throws_ok(
  $$ select public.save_complement_group(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_name => 'Roubado', p_min_select => 0, p_max_select => 1, p_allow_repeat => false,
       p_options => '[]', p_group_id => '6b000000-0000-0000-0000-000000000001') $$,
  'P0001', 'Grupo não encontrado.',
  'id de grupo da loja B → recusado');
select throws_ok(
  $$ select public.save_complement_group(
       p_store_id => '5b000000-0000-0000-0000-000000000001',
       p_name => 'Intruso', p_min_select => 0, p_max_select => 1, p_allow_repeat => false,
       p_options => '[]') $$,
  '42501', 'Sem permissão',
  'dono A salva grupo na loja B → negado');

-- Tudo ou nada: o grupo muda antes das opções, e a opção inválida desfaz tudo
select throws_ok(
  $$ select public.save_complement_group(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_name => 'Nome que não fica', p_min_select => 0, p_max_select => 1, p_allow_repeat => false,
       p_options => '[{"id": "0a000000-0000-0000-0000-000000000002", "name": "Cheddar", "price": -1, "is_available": true}]',
       p_group_id => '6a000000-0000-0000-0000-000000000001') $$,
  '23514', null,
  'alteração com preço de opção negativo → recusada');
select is(
  (select name from public.complement_groups where id = '6a000000-0000-0000-0000-000000000001'), 'Extras',
  'depois da alteração recusada → grupo continua com o nome anterior');
select is(
  (select count(*)::int from public.complements
    where complement_group_id = '6a000000-0000-0000-0000-000000000001' and deleted_at is null), 3,
  'depois da alteração recusada → as 3 opções continuam');

select * from finish();
rollback;
