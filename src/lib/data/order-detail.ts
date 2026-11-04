// Leitura do pedido completo para o detalhe do painel, com o cliente
// recebido por parâmetro (o detalhe lê pelo navegador). Passa pelo RLS da
// sessão do lojista. Também traz a disponibilidade atual do produto e dos
// complementos no cardápio, para o atalho de esgotar a partir do pedido.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import {
  parseAddress,
  type MenuAvailability,
  type OrderDetail,
} from "@/lib/orders/detail";

type Client = SupabaseClient<Database>;

const ORDER_DETAIL_SELECT = `
  id, number, status, mode, customer_name, customer_phone, address,
  payment_method, change_for, subtotal, delivery_fee, discount, total,
  notes, is_paid, rejection_reason, read_at, created_at,
  order_items (
    id, name, quantity, total, notes, created_at,
    products ( id, is_available, deleted_at ),
    order_item_complements (
      id, group_name, name, quantity, created_at,
      complements ( id, is_available, deleted_at )
    )
  ),
  order_events ( to_status, note, created_at )
`;

/** Pedido pelo número; null se não existir nesta loja. */
export async function fetchOrderDetail(
  client: Client,
  storeId: string,
  number: number,
): Promise<OrderDetail | null> {
  const { data, error } = await client
    .from("orders")
    .select(ORDER_DETAIL_SELECT)
    .eq("store_id", storeId)
    .eq("number", number)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const byCreation = <T extends { created_at: string }>(
    a: T,
    b: T,
  ) => a.created_at.localeCompare(b.created_at);

  return {
    id: data.id,
    number: data.number,
    status: data.status,
    mode: data.mode,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    address: parseAddress(data.address),
    paymentMethod: data.payment_method,
    changeFor:
      data.change_for === null
        ? null
        : Number(data.change_for),
    subtotal: Number(data.subtotal),
    deliveryFee: Number(data.delivery_fee),
    discount: Number(data.discount),
    total: Number(data.total),
    notes: data.notes?.trim() || null,
    isPaid: data.is_paid,
    rejectionReason: data.rejection_reason,
    readAt: data.read_at,
    createdAt: data.created_at,
    items: [...data.order_items]
      .sort(byCreation)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        total: Number(item.total),
        notes: item.notes?.trim() || null,
        menuItem: availability(item.products),
        complements: [...item.order_item_complements]
          .sort(byCreation)
          .map((complement) => ({
            id: complement.id,
            groupName: complement.group_name,
            name: complement.name,
            quantity: complement.quantity,
            menuItem: availability(complement.complements),
          })),
      })),
    events: [...data.order_events]
      .sort(byCreation)
      .map((event) => ({
        toStatus: event.to_status,
        note: event.note,
        createdAt: event.created_at,
      })),
  };
}

function availability(
  row: {
    id: string;
    is_available: boolean;
    deleted_at: string | null;
  } | null,
): MenuAvailability {
  if (!row || row.deleted_at) return null;
  return { id: row.id, isAvailable: row.is_available };
}

/** Lê o pedido pelo navegador. */
export function fetchOrderDetailInBrowser(
  storeId: string,
  number: number,
): Promise<OrderDetail | null> {
  return fetchOrderDetail(
    createBrowserSupabase(),
    storeId,
    number,
  );
}
