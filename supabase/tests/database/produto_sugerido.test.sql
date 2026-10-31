-- products.is_suggested: marca o produto para o bloco "Peça também" do
-- carrinho.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(3);

-- Dado: tabela products com as migrations aplicadas
select has_column('public', 'products', 'is_suggested', 'products → tem is_suggested');
select col_not_null('public', 'products', 'is_suggested', 'is_suggested nulo → não aceito');
select col_default_is('public', 'products', 'is_suggested', 'false', 'produto novo → is_suggested false');

select * from finish();
rollback;
