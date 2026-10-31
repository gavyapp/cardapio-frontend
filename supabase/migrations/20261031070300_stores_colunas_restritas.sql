-- A policy "members manage stores" valia para tudo (insert, update,
-- delete) e em todas as colunas. Qualquer membro podia excluir a loja ou
-- mudar slug (quebra os QR codes impressos), plan, active e
-- next_order_number, que são da equipe.
--
-- Agora o membro só faz UPDATE, e só nas colunas que o painel edita.
-- Criar, excluir, ativar e trocar slug ou plano fica com a equipe, pelo
-- service role ou SQL.

drop policy "members manage stores" on public.stores;

create policy "members update stores" on public.stores
  for update to authenticated
  using (private.is_store_member(id))
  with check (private.is_store_member(id));

-- Privilégio por coluna: o RLS escolhe as linhas, o GRANT escolhe as colunas.
-- updated_at é preenchido pelo trigger, que não depende de GRANT.
revoke insert, update, delete, truncate on public.stores from anon, authenticated;
grant update (name, phone, street, number, district, city, state, is_open_override, settings)
  on public.stores to authenticated;
