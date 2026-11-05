"use client";

import { BellRing } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { BoardSnapshot } from "@/lib/data/order-board";
import { useLiveOrders } from "@/lib/hooks/use-live-orders";
import { useOrderAlarm } from "@/lib/hooks/use-order-alarm";
import {
  countNewOrders,
  countUnseenOrders,
  type BoardOrder,
  type StageHistory,
  type OrderAlerts,
} from "@/lib/orders/board";

type LiveOrders = {
  storeId: string;
  /** Nome da loja, para as mensagens ao cliente. */
  storeName: string;
  orders: BoardOrder[];
  todayCount: number;
  stageHistory: StageHistory[];
  newCount: number;
  /** Pedidos novos que ninguém abriu ainda (alarme, título e menu). */
  unseenCount: number;
  connected: boolean;
  now: number;
  refresh: () => void;
  version: number;
  alerts: OrderAlerts;
  /** Aplica na hora os avisos que acabaram de ser salvos. */
  setAlerts: (alerts: OrderAlerts) => void;
};

const LiveOrdersContext = createContext<LiveOrders | null>(
  null,
);

/** Pedidos em aberto do painel; null fora do provider (painel sem loja). */
export function useLiveOrdersContext(): LiveOrders | null {
  return useContext(LiveOrdersContext);
}

/**
 * Envolve o painel todo: mantém os pedidos em aberto atualizados, toca o
 * alarme enquanto houver pedido novo não visto (em qualquer aba do painel) e
 * põe o número de pedidos não vistos no título da aba do navegador.
 */
export function LiveOrdersProvider({
  storeId,
  storeName,
  initialBoard,
  initialAlerts,
  renderedAt,
  children,
}: {
  storeId: string;
  storeName: string;
  initialBoard: BoardSnapshot;
  initialAlerts: OrderAlerts;
  renderedAt: number;
  children: ReactNode;
}) {
  const live = useLiveOrders({
    storeId,
    initialBoard,
    renderedAt,
  });
  const [alerts, setAlerts] = useState(initialAlerts);
  const newCount = countNewOrders(live.orders);
  const unseenCount = countUnseenOrders(live.orders);
  // Toca enquanto houver pedido novo que ninguém abriu; abrir, aceitar ou
  // recusar em qualquer aparelho da loja silencia todos.
  const alarm = useOrderAlarm(
    alerts.sound && unseenCount > 0,
  );
  useTitleCount(unseenCount);

  const value = {
    ...live,
    storeId,
    storeName,
    newCount,
    unseenCount,
    alerts,
    setAlerts,
  };

  return (
    <LiveOrdersContext value={value}>
      {alarm.blocked ? (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 bg-warning px-4 py-2.5 text-sm font-semibold text-warning-foreground"
        >
          <BellRing aria-hidden className="size-4" />
          Toque aqui para ativar o som dos pedidos novos
        </button>
      ) : null}
      {children}
    </LiveOrdersContext>
  );
}

const TITLE_COUNT = /^\(\d+\) /;

/**
 * "(2) Pedidos · Painel": o número de pedidos não vistos à frente do título. O
 * Next troca o título a cada navegação, então o prefixo é reaplicado sempre
 * que ele muda.
 */
function useTitleCount(count: number) {
  useEffect(() => {
    function apply() {
      const base = document.title.replace(TITLE_COUNT, "");
      const next = count > 0 ? `(${count}) ${base}` : base;
      if (document.title !== next) document.title = next;
    }
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      document.title = document.title.replace(
        TITLE_COUNT,
        "",
      );
    };
  }, [count]);
}
