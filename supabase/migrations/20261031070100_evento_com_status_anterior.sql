-- B2: o evento de mudança de status gravava from_status igual ao status novo,
-- porque lia v_order.status depois do UPDATE. Agora guarda o status anterior
-- antes de atualizar.
--
-- Também passa a aceitar só marcar como pago (p_status igual ao atual e
-- p_is_paid informado). Antes isso era feito por UPDATE direto em orders,
-- que a migration seguinte (B3) fecha.

create or replace function public.update_order_status(p_order_id uuid, p_status order_status, p_note text default null::text, p_is_paid boolean default null::boolean)
 returns orders
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_order   public.orders%rowtype;
  v_from    public.order_status;
  v_allowed boolean;
begin
  select * into v_order
  from public.orders
  where id = p_order_id and deleted_at is null
  for update;
  if not found then
    raise exception 'Pedido não encontrado' using errcode = 'P0002';
  end if;

  if not private.is_store_member(v_order.store_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  v_from := v_order.status;

  -- Mesmo status: só atualiza o pagamento, sem evento.
  if v_from = p_status then
    if p_is_paid is not null and p_is_paid <> v_order.is_paid then
      update public.orders
         set is_paid = p_is_paid
       where id = p_order_id
       returning * into v_order;
    end if;
    return v_order;
  end if;

  -- Transições permitidas
  v_allowed := case v_from
    when 'RECEBIDO'   then p_status in ('EM_PREPARO', 'REJEITADO')
    when 'EM_PREPARO' then p_status in ('PRONTO', 'A_CAMINHO', 'CANCELADO')
    when 'PRONTO'     then p_status in ('CONCLUIDO', 'A_CAMINHO', 'CANCELADO')
    when 'A_CAMINHO'  then p_status in ('CONCLUIDO', 'CANCELADO')
    else false
  end;
  if not v_allowed then
    raise exception 'Transição inválida: % → %', v_from, p_status using errcode = 'P0001';
  end if;

  if p_status in ('REJEITADO', 'CANCELADO') and coalesce(trim(p_note), '') = '' then
    raise exception 'Informe o motivo' using errcode = 'P0001';
  end if;

  if p_status = 'A_CAMINHO' and v_order.mode <> 'ENTREGA' then
    raise exception 'Pedido de retirada não sai para entrega' using errcode = 'P0001';
  end if;

  update public.orders
     set status           = p_status,
         read_at          = coalesce(read_at, now()),
         accepted_at      = case when p_status = 'EM_PREPARO' then coalesce(accepted_at, now()) else accepted_at end,
         completed_at     = case when p_status in ('CONCLUIDO', 'REJEITADO', 'CANCELADO') then now() else completed_at end,
         rejection_reason = case when p_status in ('REJEITADO', 'CANCELADO') then p_note else rejection_reason end,
         is_paid          = coalesce(p_is_paid, is_paid)
   where id = p_order_id
   returning * into v_order;

  insert into public.order_events (store_id, order_id, user_id, from_status, to_status, note)
  values (v_order.store_id, v_order.id, auth.uid(), v_from, p_status, p_note);

  return v_order;
end;
$function$;
