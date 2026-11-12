-- Limite de tentativas de pedido. O cliente pede sem login, então a rota de
-- criação de pedido registra cada tentativa por IP e por telefone e recusa
-- quando uma das chaves passa do limite na janela (5 em 10 minutos, por
-- padrão), antes de chamar o create_order.
--
-- A chave já chega embaralhada (HMAC feito pelo servidor do Next): o banco
-- nunca guarda IP nem telefone em texto nesta tabela.

create table public.order_attempts (
  id         bigint generated always as identity primary key,
  key        text not null,
  created_at timestamptz not null default now()
);

create index order_attempts_key_idx
  on public.order_attempts (key, created_at desc);
create index order_attempts_created_at_idx
  on public.order_attempts (created_at);

-- Ninguém lê nem escreve direto: só a função abaixo, que roda como dona.
alter table public.order_attempts enable row level security;
revoke all on public.order_attempts from anon, authenticated;

-- Confere e registra uma tentativa. Devolve true se pode seguir. Se alguma
-- chave já está no limite, devolve false e não registra nada: a tentativa
-- recusada não empurra a janela para a frente.
create function public.register_order_attempt(
  p_keys   text[],
  p_limit  integer  default 5,
  p_window interval default '10 minutes'
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_key text;
begin
  if p_keys is null or cardinality(p_keys) = 0 then
    raise exception 'Informe ao menos uma chave' using errcode = 'P0001';
  end if;
  if p_limit < 1 then
    raise exception 'Limite inválido' using errcode = 'P0001';
  end if;

  -- Tentativas antigas não servem mais para nada.
  delete from public.order_attempts
   where created_at < now() - greatest(p_window, interval '1 hour');

  -- Em ordem, para duas requisições com as mesmas chaves nunca se travarem.
  for v_key in select distinct k from unnest(p_keys) as k order by k loop
    -- Trava por chave até o fim da transação: requisições simultâneas da
    -- mesma origem são contadas uma de cada vez.
    perform pg_advisory_xact_lock(hashtextextended(v_key, 0));

    if (
      select count(*)
        from public.order_attempts
       where key = v_key
         and created_at > now() - p_window
    ) >= p_limit then
      return false;
    end if;
  end loop;

  insert into public.order_attempts (key)
  select distinct k from unnest(p_keys) as k;

  return true;
end;
$function$;

-- Só o servidor (chave secreta) registra tentativas. O visitante não pode
-- chamar: conseguiria bloquear o telefone de outra pessoa.
revoke all on function public.register_order_attempt(text[], integer, interval)
  from public, anon, authenticated;
grant execute on function public.register_order_attempt(text[], integer, interval)
  to service_role;
