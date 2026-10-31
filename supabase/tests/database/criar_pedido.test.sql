-- Validações do create_order: dados obrigatórios, produto disponível e da
-- própria loja, complemento de grupo excluído, forma de pagamento aceita pela
-- loja e troco.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

-- Dado: loja aberta que aceita PIX e dinheiro, com um Burger de R$ 10
-- numa categoria ativa e outro produto numa categoria desligada
insert into public.stores (id, slug, name, is_open_override, settings) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true, '{"payment_methods": ["PIX", "DINHEIRO"]}');
insert into public.categories (id, store_id, name, is_available) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches', true),
  ('ca000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Desligada', false);
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 10),
  ('9a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000002', 'Escondido', 10);
-- Dado: produto esgotado na mesma loja
insert into public.products (id, store_id, category_id, name, price, is_available) values
  ('9a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Esgotado', 10, false);
-- Dado: loja B aberta com o próprio produto, e loja desativada
insert into public.stores (id, slug, name, is_open_override, active) values
  ('5b000000-0000-0000-0000-000000000001', 'teste-loja-b', 'Loja B', true, true),
  ('5d000000-0000-0000-0000-000000000001', 'teste-loja-desativada', 'Loja D', true, false);
insert into public.categories (id, store_id, name) values
  ('cb000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'Lanches B');
insert into public.products (id, store_id, category_id, name, price) values
  ('9b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000001', 'Burger B', 10);
-- Dado: grupo de complementos excluído, ainda ligado ao Burger
insert into public.complement_groups (id, store_id, name, deleted_at) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Antigo', now());
insert into public.complements (id, store_id, complement_group_id, name, price) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Bacon', 3);
insert into public.product_complement_groups (store_id, product_id, complement_group_id) values
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001');

select throws_ok(
  $$ select public.create_order('5d000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Loja indisponível', 'loja desativada → recusado');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX', '[]') $$,
  'P0001', 'Pedido sem itens', 'pedido sem itens → recusado');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', '  ', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Nome e telefone são obrigatórios', 'nome em branco → recusado');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', null, 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Nome e telefone são obrigatórios', 'sem telefone → recusado');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'ENTREGA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Endereço é obrigatório para entrega', 'entrega sem endereço → recusado');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001", "quantity": 0}]') $$,
  'P0001', 'Quantidade inválida', 'quantidade 0 → recusado');
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000003"}]') $$,
  'Produto indisponível%', 'produto esgotado → recusado');
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9b000000-0000-0000-0000-000000000001"}]') $$,
  'Produto indisponível%', 'produto da loja B num pedido da loja A → recusado');
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000002"}]') $$,
  'Produto indisponível%', 'produto de categoria desligada → recusado');
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001",
          "complements": [{"complement_id": "7a000000-0000-0000-0000-000000000001"}]}]') $$,
  'Complemento indisponível%', 'complemento de grupo excluído → recusado');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'CARTAO',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Forma de pagamento não aceita pela loja', 'pagamento em cartão numa loja que não aceita cartão → recusado');
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'DINHEIRO',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]', null, 5) $$,
  'Troco deve ser maior ou igual ao total%', 'troco para R$ 5 num pedido de R$ 10 → recusado');
select lives_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'DINHEIRO',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]', null, 10) $$,
  'troco para R$ 10 num pedido de R$ 10 → aceito');
select is(
  (public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
     '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') ->> 'total')::numeric,
  10.00, 'pedido válido de um Burger → total R$ 10');

select * from finish();
rollback;
