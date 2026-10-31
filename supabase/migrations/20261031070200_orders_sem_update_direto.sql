-- A policy "members update orders" deixava qualquer membro mudar status,
-- total ou itens do pedido direto na tabela, sem passar pelas regras de
-- transição e sem gravar evento. Sem ela, pedido só muda pelas funções
-- update_order_status e mark_order_read.

drop policy "members update orders" on public.orders;

-- Reforço além do RLS: os papéis da API não escrevem em pedidos.
revoke insert, update, delete, truncate on public.orders, public.order_items,
  public.order_item_complements, public.order_events
  from anon, authenticated;
