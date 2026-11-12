-- Recusas do create_order levam no HINT um código estável (loja fechada,
-- item indisponível, complemento inválido, pedido mínimo...) e, nas recusas
-- de item, o id do produto no DETAIL, para a rota de criação de pedido
-- responder o motivo sem depender do texto da mensagem.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

-- Atalho: roda o comando e devolve "código|detalhe" da recusa (HINT e
-- DETAIL), ou null se não houve erro
create function pg_temp.recusa(p_sql text)
returns text language plpgsql as $$
declare
  v_hint   text;
  v_detail text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint, v_detail = pg_exception_detail;
  return v_hint || '|' || coalesce(v_detail, '');
end $$;

-- Dado: loja A aberta, com pedido mínimo de R$ 15 e só PIX e dinheiro; um
-- Burger de R$ 20 com os grupos "Ponto" (escolha 1, obrigatório) e
-- "Adicionais" (até 2, sem repetir); uma Batata de R$ 8; e um produto esgotado
insert into public.stores (id, slug, name, is_open_override, settings) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true,
   '{"min_order": 15, "payment_methods": ["PIX", "DINHEIRO"]}');
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price, is_available) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 20, true),
  ('9a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Batata', 8, true),
  ('9a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Esgotado', 10, false);
insert into public.complement_groups (id, store_id, name, min_select, max_select, allow_repeat) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Ponto', 1, 1, false),
  ('6a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Adicionais', 0, 2, false);
insert into public.complements (id, store_id, complement_group_id, name, price, is_available) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Mal passado', 0, true),
  ('7a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Ao ponto', 0, true),
  ('7a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 'Bacon', 3, true),
  ('7a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 'Ovo', 2, false);
insert into public.product_complement_groups (store_id, product_id, complement_group_id) values
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002');
-- Dado: loja F fechada manualmente e loja D desativada
insert into public.stores (id, slug, name, is_open_override, active) values
  ('5f000000-0000-0000-0000-000000000001', 'teste-loja-fechada', 'Loja F', false, true),
  ('5d000000-0000-0000-0000-000000000001', 'teste-loja-desativada', 'Loja D', true, false);

select is(pg_temp.recusa($$ select public.create_order('5d000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$),
  'store_unavailable|', 'loja desativada → store_unavailable');

select is(pg_temp.recusa($$ select public.create_order('5f000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$),
  'store_closed|', 'loja fechada → store_closed');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX', '[]') $$),
  'invalid_request|', 'pedido sem itens → invalid_request');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', '', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000002", "quantity": 2}]') $$),
  'invalid_request|', 'sem nome → invalid_request');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'ENTREGA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000002", "quantity": 2}]') $$),
  'invalid_request|', 'entrega sem endereço → invalid_request');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'CARTAO',
    '[{"product_id": "9a000000-0000-0000-0000-000000000002", "quantity": 2}]') $$),
  'payment_not_accepted|', 'cartão numa loja que não aceita → payment_not_accepted');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000002", "quantity": 0}]') $$),
  'invalid_request|', 'quantidade zero → invalid_request');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000003"}]') $$),
  'item_unavailable|9a000000-0000-0000-0000-000000000003',
  'produto esgotado → item_unavailable com o id do produto');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000001", "complements": [
       {"complement_id": "7a000000-0000-0000-0000-000000000001"},
       {"complement_id": "7a000000-0000-0000-0000-000000000004"}]}]') $$),
  'invalid_complement|9a000000-0000-0000-0000-000000000001',
  'complemento indisponível → invalid_complement com o id do produto');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000001", "complements": [
       {"complement_id": "7a000000-0000-0000-0000-000000000001"},
       {"complement_id": "7a000000-0000-0000-0000-000000000003", "quantity": 2}]}]') $$),
  'invalid_complement|9a000000-0000-0000-0000-000000000001',
  'repetir complemento em grupo que não permite → invalid_complement');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$),
  'invalid_complement|9a000000-0000-0000-0000-000000000001',
  'grupo obrigatório sem escolha → invalid_complement');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000001", "complements": [
       {"complement_id": "7a000000-0000-0000-0000-000000000001"},
       {"complement_id": "7a000000-0000-0000-0000-000000000002"}]}]') $$),
  'invalid_complement|9a000000-0000-0000-0000-000000000001',
  'grupo acima do máximo → invalid_complement');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000002"}]') $$),
  'minimum_order|', 'Batata de R$ 8 com mínimo de R$ 15 → minimum_order');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'DINHEIRO',
    '[{"product_id": "9a000000-0000-0000-0000-000000000002", "quantity": 2}]', null, 10) $$),
  'invalid_change|', 'troco para R$ 10 num pedido de R$ 16 → invalid_change');

-- A mensagem continua a mesma de antes do código
select throws_ok(
  $$ select public.create_order('5f000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Loja fechada', 'loja fechada → mesma mensagem de antes');

select is(pg_temp.recusa($$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000002", "quantity": 2}]') $$),
  null, 'pedido válido → sem recusa');

select * from finish();
rollback;
