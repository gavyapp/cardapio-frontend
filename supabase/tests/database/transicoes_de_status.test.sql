-- Caminhos do pedido no painel (update_order_status): quais mudanças de
-- status valem, quais são recusadas, motivo obrigatório para rejeitar ou
-- cancelar e "a caminho" só para entrega. Cada recusa leva no HINT o
-- código que o painel usa (invalid_transition, reason_required).
--
-- RECEBIDO   → EM_PREPARO, REJEITADO
-- EM_PREPARO → PRONTO, A_CAMINHO, CANCELADO
-- PRONTO     → CONCLUIDO, A_CAMINHO, CANCELADO
-- A_CAMINHO  → CONCLUIDO, CANCELADO
-- CONCLUIDO, REJEITADO e CANCELADO são finais.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

-- Dado: loja aberta com um funcionário e quatro pedidos novos: dois de
-- entrega e dois de retirada
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

create temporary table pedidos on commit drop as
select nome, (public.create_order(
  '5a000000-0000-0000-0000-000000000001', modo::public.order_mode, 'Cliente', '11999990000', 'PIX',
  '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]',
  case when modo = 'ENTREGA' then '{"street": "Rua A", "number": "1"}'::jsonb end) ->> 'id')::uuid as id
from (values ('entrega', 'ENTREGA'), ('entrega2', 'ENTREGA'), ('retirada', 'RETIRADA'), ('retirada2', 'RETIRADA')) v(nome, modo);
grant select on pedidos to authenticated;

-- Atalho: muda o status do pedido pelo nome e devolve o status novo
create function pg_temp.mudar(p_nome text, p_status text, p_motivo text default null)
returns text language sql as $$
  select (public.update_order_status((select id from pedidos where nome = p_nome), p_status::public.order_status, p_motivo)).status::text
$$;

-- Atalho: roda o comando e devolve o código da recusa (HINT), ou null se
-- não houve erro
create function pg_temp.codigo_da_recusa(p_sql text)
returns text language plpgsql as $$
declare
  v_hint text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return v_hint;
end $$;

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000002", "role": "authenticated"}', true);
end $$;

-- Pulos e mudanças inválidas a partir de RECEBIDO
select throws_like($$ select pg_temp.mudar('retirada', 'PRONTO') $$,
  'Transição inválida%', 'RECEBIDO → PRONTO → recusado (precisa aceitar antes)');
select throws_like($$ select pg_temp.mudar('retirada', 'CONCLUIDO') $$,
  'Transição inválida%', 'RECEBIDO → CONCLUIDO → recusado');
select throws_like($$ select pg_temp.mudar('retirada', 'CANCELADO', 'cliente desistiu') $$,
  'Transição inválida%', 'RECEBIDO → CANCELADO → recusado (pedido novo é rejeitado, não cancelado)');
select throws_like($$ select pg_temp.mudar('retirada', 'REJEITADO') $$,
  'Informe o motivo', 'RECEBIDO → REJEITADO sem motivo → recusado');
select is(pg_temp.codigo_da_recusa($$ select pg_temp.mudar('retirada', 'PRONTO') $$),
  'invalid_transition', 'RECEBIDO → PRONTO → código invalid_transition');
select is(pg_temp.codigo_da_recusa($$ select pg_temp.mudar('retirada', 'REJEITADO', ' ') $$),
  'reason_required', 'RECEBIDO → REJEITADO sem motivo → código reason_required');

-- Caminho completo da retirada
select is(pg_temp.mudar('retirada', 'EM_PREPARO'), 'EM_PREPARO', 'retirada RECEBIDO → EM_PREPARO → aceito');
select throws_like($$ select pg_temp.mudar('retirada', 'A_CAMINHO') $$,
  'Pedido de retirada não sai para entrega', 'retirada EM_PREPARO → A_CAMINHO → recusado');
select is(pg_temp.codigo_da_recusa($$ select pg_temp.mudar('retirada', 'A_CAMINHO') $$),
  'invalid_transition', 'retirada EM_PREPARO → A_CAMINHO → código invalid_transition');
select throws_like($$ select pg_temp.mudar('retirada', 'RECEBIDO') $$,
  'Transição inválida%', 'EM_PREPARO → RECEBIDO → recusado (não volta)');
select is(pg_temp.mudar('retirada', 'PRONTO'), 'PRONTO', 'retirada EM_PREPARO → PRONTO → aceito');
select is(pg_temp.mudar('retirada', 'CONCLUIDO'), 'CONCLUIDO', 'retirada PRONTO → CONCLUIDO → aceito');
select throws_like($$ select pg_temp.mudar('retirada', 'EM_PREPARO') $$,
  'Transição inválida%', 'CONCLUIDO → EM_PREPARO → recusado (status final)');

-- Caminho completo da entrega
select is(pg_temp.mudar('entrega', 'EM_PREPARO'), 'EM_PREPARO', 'entrega RECEBIDO → EM_PREPARO → aceito');
select is(pg_temp.mudar('entrega', 'A_CAMINHO'), 'A_CAMINHO', 'entrega EM_PREPARO → A_CAMINHO → aceito');
select throws_like($$ select pg_temp.mudar('entrega', 'PRONTO') $$,
  'Transição inválida%', 'A_CAMINHO → PRONTO → recusado (não volta)');
select is(pg_temp.mudar('entrega', 'CONCLUIDO'), 'CONCLUIDO', 'entrega A_CAMINHO → CONCLUIDO → aceito');

-- Cancelamento e rejeição
select is(pg_temp.mudar('entrega2', 'EM_PREPARO'), 'EM_PREPARO', 'segundo pedido de entrega aceito → EM_PREPARO');
select throws_like($$ select pg_temp.mudar('entrega2', 'CANCELADO', '   ') $$,
  'Informe o motivo', 'EM_PREPARO → CANCELADO com motivo em branco → recusado');
select is(pg_temp.mudar('entrega2', 'CANCELADO', 'sem entregador'), 'CANCELADO', 'EM_PREPARO → CANCELADO com motivo → aceito');
select is(pg_temp.mudar('retirada2', 'REJEITADO', 'acabou o pão'), 'REJEITADO', 'RECEBIDO → REJEITADO com motivo → aceito');

select * from finish();
rollback;
