-- Quais funções a API expõe e para quem: internas ficam no schema private,
-- as do painel (pedidos e salvar do catálogo) só para usuário logado,
-- create_order e get_order_by_token públicas.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

-- Dado: schema com as migrations aplicadas
select hasnt_function('public', 'is_store_member', 'is_store_member no schema public → não existe');
select hasnt_function('public', 'auth_store_ids', 'auth_store_ids no schema public → não existe');
select hasnt_function('public', 'handle_new_auth_user', 'handle_new_auth_user no schema public → não existe');
select ok(not has_function_privilege('anon', 'public.update_order_status(uuid, public.order_status, text, boolean)', 'execute'),
  'anônimo chama update_order_status → sem permissão');
select ok(not has_function_privilege('anon', 'public.mark_order_read(uuid)', 'execute'),
  'anônimo chama mark_order_read → sem permissão');
select ok(not has_function_privilege('anon', 'public.set_order_paid(uuid, boolean)', 'execute'),
  'anônimo chama set_order_paid → sem permissão');
select ok(not has_function_privilege('anon', 'private.is_store_member(uuid)', 'execute'),
  'anônimo chama is_store_member → sem permissão');
select ok(not has_function_privilege('anon', 'public.save_product(uuid, uuid, text, numeric, text[], boolean, boolean, uuid[], text, text, uuid)', 'execute')
      and not has_function_privilege('anon', 'public.save_complement_group(uuid, text, integer, integer, boolean, jsonb, uuid)', 'execute'),
  'anônimo chama save_product e save_complement_group → sem permissão');
select ok(has_function_privilege('anon', 'public.create_order(uuid, public.order_mode, text, text, public.payment_method, jsonb, jsonb, numeric, text)', 'execute')
      and has_function_privilege('anon', 'public.get_order_by_token(text)', 'execute'),
  'anônimo chama create_order e get_order_by_token → permitido');
select ok((select proconfig::text like '%search_path%' from pg_proc where oid = 'public.set_updated_at()'::regprocedure),
  'set_updated_at → search_path fixo');

select * from finish();
rollback;
