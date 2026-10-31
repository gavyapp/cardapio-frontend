-- Funções internas fora da API.
--
-- Tudo que está no schema public com EXECUTE liberado vira endpoint em
-- /rest/v1/rpc/<nome>. As funções abaixo só servem às policies e ao trigger
-- do Auth, então vão para o schema private, que a API não expõe. As policies
-- guardam a referência pelo OID da função e continuam funcionando.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

alter function public.is_store_member(uuid) set schema private;
alter function public.auth_store_ids() set schema private;
alter function public.handle_new_auth_user() set schema private;

-- is_store_member roda dentro das policies com o papel de quem consulta.
revoke all on function private.is_store_member(uuid) from public, anon;
grant execute on function private.is_store_member(uuid) to authenticated, service_role;

revoke all on function private.auth_store_ids() from public, anon;
grant execute on function private.auth_store_ids() to authenticated, service_role;

-- Só o trigger em auth.users chama; trigger não precisa de EXECUTE.
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

-- Funções do painel: só usuário logado (elas conferem a loja por dentro).
revoke all on function public.update_order_status(uuid, public.order_status, text, boolean) from public, anon;
grant execute on function public.update_order_status(uuid, public.order_status, text, boolean) to authenticated, service_role;

revoke all on function public.mark_order_read(uuid) from public, anon;
grant execute on function public.mark_order_read(uuid) to authenticated, service_role;

-- search_path fixo evita que alguém troque o now() por outra função.
alter function public.set_updated_at() set search_path = '';

-- O corpo de mark_order_read chama is_store_member pelo nome, então precisa
-- apontar para o novo schema. update_order_status é recriada na migration
-- seguinte, já com o nome novo.
create or replace function public.mark_order_read(p_order_id uuid)
 returns void
 language sql
 security definer
 set search_path to 'public'
as $function$
  update public.orders
     set read_at = coalesce(read_at, now())
   where id = p_order_id
     and private.is_store_member(store_id);
$function$;
