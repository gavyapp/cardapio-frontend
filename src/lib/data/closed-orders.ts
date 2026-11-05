// Pedidos encerrados do dia (concluídos, recusados e cancelados) para a
// lista embaixo do quadro. Lê pelo navegador, com a sessão do lojista (RLS).
// Traz o dia todo em colunas leves: a conferência soma o dia, e a busca e as
// páginas ficam no navegador, com a mesma busca sem acento do quadro.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { startOfStoreDay } from "@/lib/orders/board";
import type { ClosedOrder } from "@/lib/orders/closed";
import { CLOSED_ORDER_STATUSES } from "@/lib/orders/detail";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Client = SupabaseClient<Database>;

const CLOSED_ORDERS_SELECT = `
  id, number, customer_name, customer_phone, mode, payment_method, total,
  is_paid, status, created_at
`;

/** Encerrados que chegaram hoje, do mais recente para o mais antigo. */
export async function fetchClosedOrders(
  client: Client,
  storeId: string,
  now: number,
): Promise<ClosedOrder[]> {
  const { data, error } = await client
    .from("orders")
    .select(CLOSED_ORDERS_SELECT)
    .eq("store_id", storeId)
    .in("status", CLOSED_ORDER_STATUSES)
    .is("deleted_at", null)
    .gte("created_at", startOfStoreDay(now))
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    number: row.number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    mode: row.mode,
    paymentMethod: row.payment_method,
    total: Number(row.total),
    isPaid: row.is_paid,
    status: row.status as ClosedOrder["status"],
    createdAt: row.created_at,
  }));
}

/** Lê os encerrados de hoje pelo navegador. */
export function fetchClosedOrdersInBrowser(
  storeId: string,
): Promise<ClosedOrder[]> {
  return fetchClosedOrders(
    createBrowserSupabase(),
    storeId,
    Date.now(),
  );
}
