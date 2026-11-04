// Pedidos em aberto do quadro e a assinatura em tempo real. Sem
// "server-only": o layout do painel lê a lista no servidor e o quadro relê e
// escuta no navegador. Tudo passa pelo RLS da sessão do lojista.
import type {
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import {
  OPEN_ORDER_STATUSES,
  type BoardOrder,
} from "@/lib/orders/board";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Client = SupabaseClient<Database>;

const BOARD_COLUMNS_SELECT = `
  id, number, customer_name, mode, payment_method, total, is_paid, status,
  created_at, accepted_at,
  order_items ( quantity ),
  order_events ( to_status, created_at )
`;

/** Pedidos em aberto da loja, com o cliente que já existe. */
export async function fetchOpenOrders(
  client: Client,
  storeId: string,
): Promise<BoardOrder[]> {
  const { data, error } = await client
    .from("orders")
    .select(BOARD_COLUMNS_SELECT)
    .eq("store_id", storeId)
    .in("status", OPEN_ORDER_STATUSES)
    .is("deleted_at", null)
    .order("created_at");

  if (error) throw error;

  return data.map((row) => {
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
  });
}

/** Relê os pedidos em aberto pelo navegador. */
export function listOpenOrdersInBrowser(
  storeId: string,
): Promise<BoardOrder[]> {
  return fetchOpenOrders(createBrowserSupabase(), storeId);
}

/** Espera antes de tentar abrir o canal de novo, dobrando até o máximo. */
const RETRY_FIRST_MS = 2_000;
const RETRY_MAX_MS = 30_000;

/**
 * Avisa a cada pedido criado ou alterado na loja e a cada mudança da
 * conexão. Se o canal cai (rede, servidor), fecha e abre outro, com espera
 * crescente, e na hora em que a rede volta. Cada `connected: true` é a hora
 * de reler a lista, para pegar o que chegou enquanto estava fora. Devolve a
 * função que fecha.
 */
export function subscribeToStoreOrders(
  storeId: string,
  handlers: {
    onChange: () => void;
    onConnectionChange: (connected: boolean) => void;
  },
): () => void {
  const supabase = createBrowserSupabase();
  let channel: RealtimeChannel | null = null;
  let closed = false;
  let retryDelay = RETRY_FIRST_MS;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  async function open() {
    // O token da sessão precisa estar no Realtime antes de entrar no canal,
    // senão o RLS filtra todos os eventos.
    await supabase.realtime.setAuth();
    if (closed) return;

    const current = supabase
      .channel(`store-orders:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        () => handlers.onChange(),
      );
    channel = current;
    current.subscribe((status) => {
      // Aviso de um canal que já foi trocado não conta.
      if (closed || channel !== current) return;
      if (status === "SUBSCRIBED") {
        retryDelay = RETRY_FIRST_MS;
        handlers.onConnectionChange(true);
        return;
      }
      handlers.onConnectionChange(false);
      scheduleRetry(retryDelay);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    });
  }

  function reopen() {
    clearTimeout(retryTimer);
    retryTimer = undefined;
    const stale = channel;
    channel = null;
    if (stale) void supabase.removeChannel(stale);
    void open().catch(() => {
      handlers.onConnectionChange(false);
      scheduleRetry(retryDelay);
    });
  }

  function scheduleRetry(delay: number) {
    if (closed || retryTimer !== undefined) return;
    retryTimer = setTimeout(reopen, delay);
  }

  function onOnline() {
    retryDelay = RETRY_FIRST_MS;
    reopen();
  }

  window.addEventListener("online", onOnline);
  reopen();

  return () => {
    closed = true;
    clearTimeout(retryTimer);
    window.removeEventListener("online", onOnline);
    if (channel) void supabase.removeChannel(channel);
  };
}
