-- Quais funções a API expõe e para quem: internas ficam no schema private,
-- as do painel só para usuário logado, create_order e get_order_by_token
-- públicas.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

select hasnt_function('public', 'is_store_member', 'is_store_member não está no public');
select hasnt_function('public', 'auth_store_ids', 'auth_store_ids não está no public');
select hasnt_function('public', 'handle_new_auth_user', 'handle_new_auth_user não está no public');
select ok(not has_function_privilege('anon', 'public.update_order_status(uuid, public.order_status, text, boolean)', 'execute'),
  'anônimo não chama update_order_status');
select ok(not has_function_privilege('anon', 'public.mark_order_read(uuid)', 'execute'),
  'anônimo não chama mark_order_read');
select ok(not has_function_privilege('anon', 'private.is_store_member(uuid)', 'execute'),
  'anônimo não chama is_store_member');
select ok(has_function_privilege('anon', 'public.create_order(uuid, public.order_mode, text, text, public.payment_method, jsonb, jsonb, numeric, text)', 'execute')
      and has_function_privilege('anon', 'public.get_order_by_token(text)', 'execute'),
  'create_order e get_order_by_token são públicas');
select ok((select proconfig::text like '%search_path%' from pg_proc where oid = 'public.set_updated_at()'::regprocedure),
  'set_updated_at tem search_path fixo');

select * from finish();
rollback;
