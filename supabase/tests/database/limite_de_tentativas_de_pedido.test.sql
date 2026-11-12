-- Limite de tentativas de pedido: register_order_attempt deixa passar até o
-- limite por chave dentro da janela, recusa a seguinte sem registrar, não
-- conta tentativa fora da janela e só pode ser chamada pelo servidor.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

-- Dado: nenhuma tentativa registrada para as chaves "ip:a" e "fone:a"
select ok(public.register_order_attempt(array['ip:a', 'fone:a']), '1ª tentativa → passa');
select ok(public.register_order_attempt(array['ip:a', 'fone:a']), '2ª tentativa → passa');
select ok(public.register_order_attempt(array['ip:a', 'fone:a']), '3ª tentativa → passa');
select ok(public.register_order_attempt(array['ip:a', 'fone:a']), '4ª tentativa → passa');
select ok(public.register_order_attempt(array['ip:a', 'fone:a']), '5ª tentativa → passa (limite de 5)');
select ok(not public.register_order_attempt(array['ip:a', 'fone:a']), '6ª tentativa na janela → recusada');

select is(
  (select count(*)::int from public.order_attempts where key = 'ip:a'),
  5, 'tentativa recusada → não é registrada');

-- Mesmo telefone vindo de outro IP: o telefone já está no limite
select ok(not public.register_order_attempt(array['ip:b', 'fone:a']),
  'telefone no limite, IP novo → recusada');
select is(
  (select count(*)::int from public.order_attempts where key = 'ip:b'),
  0, 'recusa por uma chave → a outra chave também não é registrada');

-- Outra origem, sem nada em comum
select ok(public.register_order_attempt(array['ip:c', 'fone:c']),
  'outro IP e outro telefone → passa');

-- Dado: as cinco tentativas de "ip:d" aconteceram há 11 minutos
insert into public.order_attempts (key, created_at)
select 'ip:d', now() - interval '11 minutes' from generate_series(1, 5);

select ok(public.register_order_attempt(array['ip:d']),
  'cinco tentativas fora da janela de 10 minutos → passa');

-- Dado: tentativa de ontem
insert into public.order_attempts (key, created_at) values ('ip:velha', now() - interval '1 day');
select public.register_order_attempt(array['ip:e']);

select is(
  (select count(*)::int from public.order_attempts where key = 'ip:velha'),
  0, 'tentativa antiga → apagada na chamada seguinte');

select ok(
  not has_function_privilege('anon', 'public.register_order_attempt(text[], integer, interval)', 'execute')
  and not has_function_privilege('authenticated', 'public.register_order_attempt(text[], integer, interval)', 'execute')
  and has_function_privilege('service_role', 'public.register_order_attempt(text[], integer, interval)', 'execute'),
  'visitante e lojista não podem chamar; só o servidor');

select * from finish();
rollback;
