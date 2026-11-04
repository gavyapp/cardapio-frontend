// Leitura do quadro de pedidos, com o cliente recebido por parâmetro: o
// layout do painel usa o do servidor (orders.ts) e o quadro ao vivo usa o do
// navegador (order-board-live.ts). Tudo passa pelo RLS da sessão do lojista.
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  Tables,
} from "@/lib/database.types";
import {
  OPEN_ORDER_STATUSES,
  startOfStoreDay,
  type BoardOrder,
} from "@/lib/orders/board";

type Client = SupabaseClient<Database>;

const BOARD_COLUMNS_SELECT = `
  id, number, customer_name, customer_phone, mode, payment_method, total, is_paid, status,
  created_at, accepted_at,
  order_items ( quantity ),
  order_events ( to_status, created_at )
`;

/** O que o quadro mostra: pedidos em aberto e quantos chegaram hoje. */
export type BoardSnapshot = {
  orders: BoardOrder[];
  /** Pedidos recebidos hoje, em qualquer status (título da página). */
  todayCount: number;
};

/** Lê o quadro com o cliente de quem chama. */
export async function fetchBoard(
  client: Client,
  storeId: string,
): Promise<BoardSnapshot> {
  const [open, today] = await Promise.all([
    client
      .from("orders")
      .select(BOARD_COLUMNS_SELECT)
      .eq("store_id", storeId)
      .in("status", OPEN_ORDER_STATUSES)
      .is("deleted_at", null)
      .order("created_at"),
    client
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .gte("created_at", startOfStoreDay(Date.now())),
  ]);

  if (open.error) throw open.error;
  if (today.error) throw today.error;

  return {
    orders: open.data.map(toBoardOrder),
    todayCount: today.count ?? 0,
  };
}

type BoardRow = Pick<
  Tables<"orders">,
  | "id"
  | "number"
  | "customer_name"
  | "customer_phone"
  | "mode"
  | "payment_method"
  | "total"
  | "is_paid"
  | "status"
  | "created_at"
  | "accepted_at"
> & {
  order_items: Pick<Tables<"order_items">, "quantity">[];
  order_events: Pick<
    Tables<"order_events">,
    "to_status" | "created_at"
  >[];
};

function toBoardOrder(row: BoardRow): BoardOrder {
  // Entrada na etapa: o último evento que levou ao status atual. Pedido sem
  // evento (seed antigo) cai no aceite ou na hora do pedido.
  const stageEvent = row.order_events
    .filter((event) => event.to_status === row.status)
    .sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )[0];
  const stageStartedAt =
    row.status === "RECEBIDO"
      ? row.created_at
      : (stageEvent?.created_at ??
        row.accepted_at ??
        row.created_at);

  return {
    id: row.id,
    number: row.number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    mode: row.mode,
    paymentMethod: row.payment_method,
    total: Number(row.total),
    isPaid: row.is_paid,
    status: row.status,
    createdAt: row.created_at,
    stageStartedAt,
    itemCount: row.order_items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    ),
  };
}
