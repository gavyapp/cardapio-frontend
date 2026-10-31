-- Complementos no create_order: mínimo e máximo por grupo, repetição,
-- complemento que não pertence ao produto e preço do item com complementos.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

-- Dado: loja aberta com um Burger de R$ 20 ligado a dois grupos:
-- "Ponto" (escolha 1, obrigatório) e "Adicionais" (até 2, pode repetir);
-- e uma Batata de R$ 8 sem grupos
insert into public.stores (id, slug, name, is_open_override) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true);
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 20),
  ('9a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Batata', 8);
insert into public.complement_groups (id, store_id, name, min_select, max_select, allow_repeat) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Ponto', 1, 1, false),
  ('6a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'Adicionais', 0, 2, true);
insert into public.complements (id, store_id, complement_group_id, name, price) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Mal passado', 0),
  ('7a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Ao ponto', 0),
  ('7a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 'Bacon', 3);
insert into public.product_complement_groups (store_id, product_id, complement_group_id) values
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002');

select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') $$,
  'P0001', 'Escolha pelo menos 1 em Ponto', 'Burger sem escolher o ponto → recusado');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001", "complements": [
          {"complement_id": "7a000000-0000-0000-0000-000000000001"},
          {"complement_id": "7a000000-0000-0000-0000-000000000002"}]}]') $$,
  'P0001', 'Escolha no máximo 1 em Ponto', 'Burger com dois pontos → recusado');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001", "complements": [
          {"complement_id": "7a000000-0000-0000-0000-000000000001", "quantity": 2}]}]') $$,
  'P0001', 'O grupo Ponto não permite repetir item', 'mesmo ponto 2 vezes → recusado');
select throws_ok(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000001", "complements": [
          {"complement_id": "7a000000-0000-0000-0000-000000000001"},
          {"complement_id": "7a000000-0000-0000-0000-000000000003", "quantity": 3}]}]') $$,
  'P0001', 'Escolha no máximo 2 em Adicionais', '3 bacons num grupo de até 2 → recusado');
select throws_like(
  $$ select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
       '[{"product_id": "9a000000-0000-0000-0000-000000000002", "complements": [
          {"complement_id": "7a000000-0000-0000-0000-000000000003"}]}]') $$,
  'Complemento indisponível%', 'bacon na Batata, que não tem esse grupo → recusado');

-- 2 Burgers com ponto e 2 bacons: (20 + 2 × 3) × 2 = 52
create temporary table pedido on commit drop as
select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', 'Cliente', '11999990000', 'PIX',
  '[{"product_id": "9a000000-0000-0000-0000-000000000001", "quantity": 2, "complements": [
     {"complement_id": "7a000000-0000-0000-0000-000000000002"},
     {"complement_id": "7a000000-0000-0000-0000-000000000003", "quantity": 2}]}]') as o;
select is((select (o ->> 'total')::numeric from pedido), 52.00,
  '2 Burgers ao ponto com 2 bacons cada → total R$ 52');
select results_eq(
  $$ select c.name, c.price, c.quantity::int from public.order_item_complements c
     join public.order_items i on i.id = c.order_item_id
     where i.order_id = (select (o ->> 'id')::uuid from pedido) order by c.name $$,
  $$ values ('Ao ponto', 0.00::numeric, 1), ('Bacon', 3.00::numeric, 2) $$,
  'pedido com complementos → nome, preço e quantidade gravados no item');

select * from finish();
rollback;
