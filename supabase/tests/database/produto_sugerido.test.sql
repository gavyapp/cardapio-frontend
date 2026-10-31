-- products.is_suggested: marca o produto para o bloco "Peça também" do
-- carrinho.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(3);

select has_column('public', 'products', 'is_suggested', 'products tem is_suggested');
select col_not_null('public', 'products', 'is_suggested', 'is_suggested não aceita nulo');
select col_default_is('public', 'products', 'is_suggested', 'false', 'is_suggested começa false');

select * from finish();
rollback;
