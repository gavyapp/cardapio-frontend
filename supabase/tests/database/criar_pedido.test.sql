-- Validações do create_order: produto de categoria desligada, complemento de
-- grupo excluído, forma de pagamento aceita pela loja e troco.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

-- Loja aberta pelo botão, aceita PIX e dinheiro.
insert into public.stores (id, slug, name, is_open_override, settings) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true, '{"payment_methods": ["PIX", "DINHEIRO"]}');
insert into public.categories (id, store_id, name, is_available) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches', true),
  ('ca000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Desligada', false);
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 10),
  ('9a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000002', 'Escondido', 10);
-- Grupo excluído com um complemento ainda ligado ao Burger.
insert into public.complement_groups (id, store_id, name, deleted_at) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Antigo', now());
insert into public.complements (id, store_id, complement_group_id, name, price) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Bacon', 3);
insert into public.product_complement_groups (store_id, product_id, complement_group_id) values
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001');

select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000002"}]') $$,
  'Produto indisponível%', 'recusa produto de categoria desligada');
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001",
          "complements": [{"complement_id": "7a000000-0000-0000-0000-000000000001"}]}]') $$,
  'Complemento indisponível%', 'recusa complemento de grupo excluído');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'CARTAO',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Forma de pagamento não aceita pela loja', 'recusa forma de pagamento que a loja não aceita');
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'DINHEIRO',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]', null, 5) $$,
  'Troco deve ser maior ou igual ao total%', 'recusa troco menor que o total');
select lives_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'DINHEIRO',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]', null, 10) $$,
  'aceita troco igual ao total');
select is(
  (public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
     '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') ->> 'total')::numeric,
  10.00, 'pedido válido sai com o total certo');

select * from finish();
rollback;
