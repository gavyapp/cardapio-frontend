"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { BoardSnapshot } from "@/lib/data/order-board";
import {
  fetchBoardInBrowser,
  subscribeToStoreOrders,
} from "@/lib/data/order-board-live";
import type { BoardOrder } from "@/lib/orders/board";

/** Espera entre um evento e a releitura, para juntar eventos em sequência. */
const REFRESH_DEBOUNCE_MS = 300;
/** Releitura de segurança, caso algum evento se perca. */
const SAFETY_REFRESH_MS = 60_000;
/** Atualização dos tempos na tela. */
const CLOCK_TICK_MS = 30_000;

export type LiveOrdersState = {
  orders: BoardOrder[];
  /** Pedidos recebidos hoje, em qualquer status. */
  todayCount: number;
  /** Canal do Realtime conectado. */
  connected: boolean;
  /** Hora usada para os tempos na tela (atualiza a cada 30 s). */
  now: number;
  /** Relê a lista agora (por exemplo, depois de mudar um status). */
  refresh: () => void;
};

/**
 * Pedidos em aberto da loja, sempre atualizados: relê a lista a cada evento
 * do Realtime, quando o canal reconecta, quando a rede volta, quando a aba
 * volta a ficar visível e, por segurança, a cada minuto.
 */
export function useLiveOrders({
  storeId,
  initialBoard,
  renderedAt,
}: {
  storeId: string;
  initialBoard: BoardSnapshot;
  /** Hora da renderização no servidor, para a primeira tela bater. */
  renderedAt: number;
}): LiveOrdersState {
  const [board, setBoard] = useState(initialBoard);
  const [connected, setConnected] = useState(true);
  const [now, setNow] = useState(renderedAt);
  const lastRequest = useRef(0);
  const debounce = useRef<number | undefined>(undefined);

  const reload = useCallback(async () => {
    const request = ++lastRequest.current;
    try {
      const next = await fetchBoardInBrowser(storeId);
      // Só a resposta mais recente vale.
      if (request === lastRequest.current) {
        setBoard(next);
        setNow(Date.now());
      }
    } catch (error) {
      // Mantém a lista atual; a próxima releitura tenta de novo.
      console.error("Erro ao atualizar os pedidos", error);
    }
  }, [storeId]);

  const refresh = useCallback(() => {
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(
      () => void reload(),
      REFRESH_DEBOUNCE_MS,
    );
  }, [reload]);

  useEffect(() => {
    const unsubscribe = subscribeToStoreOrders(storeId, {
      onChange: refresh,
      onConnectionChange: (isConnected) => {
        setConnected(isConnected);
        // Ao (re)conectar, busca o que chegou enquanto estava fora.
        if (isConnected) refresh();
      },
    });

    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    function onOffline() {
      setConnected(false);
    }
    window.addEventListener("online", refresh);
    window.addEventListener("offline", onOffline);
    document.addEventListener(
      "visibilitychange",
      onVisible,
    );
    const safety = window.setInterval(
      refresh,
      SAFETY_REFRESH_MS,
    );

    return () => {
      unsubscribe();
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener(
        "visibilitychange",
        onVisible,
      );
      window.clearInterval(safety);
      window.clearTimeout(debounce.current);
    };
  }, [storeId, refresh]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, CLOCK_TICK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  return {
    orders: board.orders,
    todayCount: board.todayCount,
    connected,
    now,
    refresh,
  };
}
