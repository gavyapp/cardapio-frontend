-- A policy "owners manage store_users" consultava a própria store_users.
-- O Postgres aplica o RLS de novo nessa consulta interna e para com
-- "infinite recursion detected in policy", então qualquer SELECT de usuário
-- logado em store_users dava erro. A checagem de dono vai para uma função
-- security definer, que lê a tabela sem RLS, como já faz is_store_member.

create or replace function private.is_store_owner(p_store_id uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select exists (
    select 1 from public.store_users
    where store_id = p_store_id
      and user_id = auth.uid()
      and role = 'OWNER'
      and deleted_at is null
  );
$function$;

revoke all on function private.is_store_owner(uuid) from public, anon;
grant execute on function private.is_store_owner(uuid) to authenticated, service_role;

drop policy "owners manage store_users" on public.store_users;

create policy "owners manage store_users" on public.store_users
  for all to authenticated
  using (private.is_store_owner(store_id))
  with check (private.is_store_owner(store_id));
