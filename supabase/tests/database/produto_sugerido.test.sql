-- products.is_suggested: marca o produto para o bloco "Peça também" do
-- carrinho. Só produto disponível pode ser sugerido.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

-- Dado: tabela products com as migrations aplicadas
select has_column('public', 'products', 'is_suggested', 'products → tem is_suggested');
select col_not_null('public', 'products', 'is_suggested', 'is_suggested nulo → não aceito');
select col_default_is('public', 'products', 'is_suggested', 'false', 'produto novo → is_suggested false');

-- Dado: loja com dono, categoria Bebidas, Suco disponível e sugerido
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
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Bebidas');
insert into public.products (id, store_id, category_id, name, price, is_suggested) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Suco', 8, true);

select throws_ok(
  $$ update public.products set is_available = false
      where id = '9a000000-0000-0000-0000-000000000001' $$,
  '23514', null,
  'esgota produto sugerido sem tirar a sugestão → recusado');
select lives_ok(
  $$ update public.products set is_available = false, is_suggested = false
      where id = '9a000000-0000-0000-0000-000000000001' $$,
  'esgota e tira a sugestão juntos → aceito');
select throws_ok(
  $$ update public.products set is_suggested = true
      where id = '9a000000-0000-0000-0000-000000000001' $$,
  '23514', null,
  'sugere produto esgotado → recusado');
select throws_ok(
  $$ insert into public.products (store_id, category_id, name, price, is_available, is_suggested)
     values ('5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Água', 4, false, true) $$,
  '23514', null,
  'cria produto esgotado e sugerido → recusado');

-- Dado: o dono da loja logado, salvando pelo editor
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
end $$;

select throws_ok(
  $$ select public.save_product(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_category_id => 'ca000000-0000-0000-0000-000000000001',
       p_name => 'Suco', p_price => 8, p_badges => '{}',
       p_is_available => false, p_is_suggested => true, p_group_ids => '{}',
       p_product_id => '9a000000-0000-0000-0000-000000000001') $$,
  '23514', null,
  'salva produto esgotado como sugerido → recusado');
select lives_ok(
  $$ select public.save_product(
       p_store_id => '5a000000-0000-0000-0000-000000000001',
       p_category_id => 'ca000000-0000-0000-0000-000000000001',
       p_name => 'Suco', p_price => 8, p_badges => '{}',
       p_is_available => true, p_is_suggested => true, p_group_ids => '{}',
       p_product_id => '9a000000-0000-0000-0000-000000000001') $$,
  'volta a ficar disponível e sugerido → aceito');

select * from finish();
rollback;
