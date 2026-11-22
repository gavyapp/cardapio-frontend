-- Abrir ou fechar a loja pelo painel vale só até a próxima virada do
-- horário, não para sempre: quem fecha na quinta às 22h quer a loja abrindo
-- sozinha na sexta, no horário de sempre.
--
-- open_override_until guarda até quando o botão do painel vale. O painel
-- calcula o prazo (próxima abertura ao fechar; próximo fechamento, no máximo
-- meia-noite, ao abrir). Nulo com o botão preenchido: vale até mudar à mão.
-- Depois do prazo, is_store_open segue store_hours, sem precisar de tarefa
-- agendada para limpar a coluna.

alter table public.stores
  add column open_override_until timestamptz;

alter table public.stores
  add constraint stores_open_override_until_needs_override
  check (open_override_until is null or is_open_override is not null);

grant update (open_override_until) on public.stores to authenticated;

-- Aberta ou fechada em p_at (padrão: agora), no fuso de São Paulo.
-- 1. Loja inexistente, inativa ou excluída: fechada.
-- 2. is_open_override preenchido (botão do painel) e ainda no prazo de
--    open_override_until: vale ele.
-- 3. Senão, segue store_hours. weekday 0 = domingo ... 6 = sábado.
--    Turno com closes_at <= opens_at atravessa a meia-noite: 18:00-02:00 de
--    sexta vale de sexta 18:00 até sábado 02:00.
-- security invoker: quem chama só enxerga loja ativa e horários não
-- excluídos, que já são públicos pelo RLS.
create or replace function public.is_store_open(p_store_id uuid, p_at timestamptz default now())
 returns boolean
 language sql
 stable
 security invoker
 set search_path to ''
as $function$
  with agora as (
    select extract(dow from local)::smallint as dia,
           local::time as hora
    from (select p_at at time zone 'America/Sao_Paulo' as local) t
  )
  select case
    when s.id is null then false
    when s.is_open_override is not null
      and (s.open_override_until is null or p_at < s.open_override_until)
      then s.is_open_override
    else exists (
      select 1
      from public.store_hours h, agora a
      where h.store_id = s.id
        and h.deleted_at is null
        and (
          -- turno que começou hoje
          (h.weekday = a.dia
            and a.hora >= h.opens_at
            and (h.closes_at <= h.opens_at or a.hora < h.closes_at))
          -- turno de ontem que passou da meia-noite
          or (h.weekday = (a.dia + 6) % 7
            and h.closes_at <= h.opens_at
            and a.hora < h.closes_at)
        )
    )
  end
  from (select 1) um
  left join public.stores s
    on s.id = p_store_id and s.active and s.deleted_at is null;
$function$;
