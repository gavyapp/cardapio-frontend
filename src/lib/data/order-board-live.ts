// Quadro de pedidos ao vivo, só no navegador: relê o quadro e assina as
// mudanças de pedidos da loja pelo Realtime, com a sessão do lojista (RLS).
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createBrowserSupabase } from "@/lib/supabase/browser";

import {
  fetchBoard,
  type BoardSnapshot,
} from "./order-board";

/** Relê o quadro pelo navegador. */
export function fetchBoardInBrowser(
  storeId: string,
): Promise<BoardSnapshot> {
  return fetchBoard(createBrowserSupabase(), storeId);
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
