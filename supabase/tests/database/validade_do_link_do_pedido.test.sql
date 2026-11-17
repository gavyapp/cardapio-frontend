-- O link de acompanhamento do pedido (public_token) vence 4 horas depois de
-- o pedido encerrar. Em andamento não vence; vencido, a consulta devolve só
-- {"expired": true}, sem nenhum dado do pedido.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

-- Dado: loja A aberta, com um Burger de R$ 20
insert into public.stores (id, slug, name, is_open_override) values
  ('5a000000-0000-0000-0000-000000000001', 'teste-loja-a', 'Loja A', true);
insert into public.categories (id, store_id, name) values
  ('ca000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Lanches');
insert into public.products (id, store_id, category_id, name, price, is_available) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Burger', 20, true);

-- Atalho: cria um pedido e devolve o token do link
create function pg_temp.novo_pedido(p_cliente text)
returns text language sql as $$
  select public.create_order('5a000000-0000-0000-0000-000000000001', 'RETIRADA', p_cliente, '11999990000', 'PIX',
    '[{"product_id": "9a000000-0000-0000-0000-000000000001"}]') ->> 'public_token'
$$;

-- Dado: cinco pedidos, cada um em uma situação
create temp table pedidos as
select situacao, pg_temp.novo_pedido(situacao) as token
from unnest(array[
  'em andamento', 'concluido recente', 'concluido no limite',
  'cancelado antigo', 'cancelado recente'
]) as situacao;

-- em andamento: enviado há 10 horas e ainda em preparo
update public.orders set status = 'EM_PREPARO', created_at = now() - interval '10 hours'
 where public_token = (select token from pedidos where situacao = 'em andamento');
-- concluído há 3h59
update public.orders set status = 'CONCLUIDO', completed_at = now() - interval '3 hours 59 minutes'
 where public_token = (select token from pedidos where situacao = 'concluido recente');
-- concluído há exatamente 4 horas
update public.orders set status = 'CONCLUIDO', completed_at = now() - interval '4 hours'
 where public_token = (select token from pedidos where situacao = 'concluido no limite');
-- cancelado há 5 horas
update public.orders set status = 'CANCELADO', rejection_reason = 'Cliente desistiu', completed_at = now() - interval '5 hours'
 where public_token = (select token from pedidos where situacao = 'cancelado antigo');
-- cancelado há 1 hora
update public.orders set status = 'CANCELADO', rejection_reason = 'Cliente desistiu', completed_at = now() - interval '1 hour'
 where public_token = (select token from pedidos where situacao = 'cancelado recente');

select is(
  public.get_order_by_token((select token from pedidos where situacao = 'em andamento')) ->> 'status', 'EM_PREPARO',
  'pedido em andamento há 10 horas → link ainda abre');

select is(
  public.get_order_by_token((select token from pedidos where situacao = 'concluido recente')) ->> 'status', 'CONCLUIDO',
  'concluído há 3h59 → link ainda abre');

select is(
  public.get_order_by_token((select token from pedidos where situacao = 'concluido no limite')), '{"expired": true}'::jsonb,
  'concluído há 4 horas → link vencido, só o aviso');

select is(
  public.get_order_by_token((select token from pedidos where situacao = 'cancelado antigo')), '{"expired": true}'::jsonb,
  'cancelado há 5 horas → link vencido, só o aviso');

select ok(
  not (public.get_order_by_token((select token from pedidos where situacao = 'cancelado antigo')) ?| array['id', 'number', 'customer_name', 'address', 'items', 'store']),
  'link vencido → nenhum dado do pedido na resposta');

select is(
  public.get_order_by_token((select token from pedidos where situacao = 'cancelado recente')) ->> 'rejection_reason', 'Cliente desistiu',
  'cancelado há 1 hora → link abre com o motivo');

select is(
  public.get_order_by_token((select token from pedidos where situacao = 'cancelado recente')) ? 'expired', false,
  'link válido → sem o aviso de vencido');

select is(
  public.get_order_by_token('token-que-nao-existe'), null,
  'token inexistente → nada, como antes');

select * from finish();
rollback;
