-- "Sugerir no carrinho" só vale para produto disponível: produto esgotado
-- não pode ser sugerido. Quem esgota o produto desliga a sugestão junto.
-- Os esgotados que já estavam sugeridos perdem a sugestão antes da regra.

update public.products
   set is_suggested = false
 where is_suggested
   and not is_available;

alter table public.products
  add constraint products_suggested_requires_available
  check (is_available or not is_suggested);
