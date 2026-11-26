-- O pedido pelo link (get_order_by_token) passa a trazer applied_promotions:
-- cada promoção usada e quanto ela economizou. A tela do pedido enviado
-- mostra a taxa riscada quando houve entrega grátis, como o protótipo. O
-- resto da função é o mesmo de antes.

create or replace function public.get_order_by_token(p_token text)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  select case
    when o.completed_at is not null
     and o.completed_at <= now() - interval '4 hours'
    then jsonb_build_object('expired', true)
    else jsonb_build_object(
        'id', o.id,
        'number', o.number,
        'status', o.status,
        'mode', o.mode,
        'customer_name', o.customer_name,
        'address', o.address,
        'payment_method', o.payment_method,
        'change_for', o.change_for,
        'subtotal', o.subtotal,
        'delivery_fee', o.delivery_fee,
        'discount', o.discount,
        'total', o.total,
        'applied_promotions', o.applied_promotions,
        'notes', o.notes,
        'rejection_reason', o.rejection_reason,
        'created_at', o.created_at,
        'accepted_at', o.accepted_at,
        'completed_at', o.completed_at,
        'store', jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug, 'phone', s.phone),
        'items', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'unit_price', i.unit_price,
            'quantity', i.quantity,
            'notes', i.notes,
            'total', i.total,
            'complements', (
              select coalesce(jsonb_agg(jsonb_build_object(
                'group_name', c.group_name, 'name', c.name, 'price', c.price, 'quantity', c.quantity
              )), '[]'::jsonb)
              from public.order_item_complements c where c.order_item_id = i.id
            )
          ) order by i.created_at), '[]'::jsonb)
          from public.order_items i where i.order_id = o.id
        ),
        'events', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'to_status', e.to_status, 'note', e.note, 'created_at', e.created_at
          ) order by e.created_at), '[]'::jsonb)
          from public.order_events e where e.order_id = o.id
        )
      )
  end
  from public.orders o
  join public.stores s on s.id = o.store_id
  where o.public_token = p_token
    and o.deleted_at is null;
$function$;
