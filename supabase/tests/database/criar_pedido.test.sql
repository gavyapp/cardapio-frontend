-- Validações do create_order: produto de categoria desligada, complemento de
-- grupo excluído, forma de pagamento aceita pela loja e troco.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

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
-- Dado: grupo de complementos excluído, ainda ligado ao Burger
insert into public.complement_groups (id, store_id, name, deleted_at) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Antigo', now());
insert into public.complements (id, store_id, complement_group_id, name, price) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Bacon', 3);
insert into public.product_complement_groups (store_id, product_id, complement_group_id) values
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001');

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
