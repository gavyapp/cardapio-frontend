-- B7 (decisão D5): "Sugerir no carrinho" do editor de produto. Produtos
-- marcados aparecem no bloco "Peça também" do carrinho.

alter table public.products
  add column is_suggested boolean not null default false;
