"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { fetchClosedOrdersInBrowser } from "@/lib/data/closed-orders";
import type { ClosedOrder } from "@/lib/orders/closed";

export type ClosedOrdersState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; orders: ClosedOrder[] };

/**
 * Encerrados de hoje. Relê sempre que `version` muda (a lista ao vivo do
 * painel foi relida: um pedido pode ter sido concluído ou marcado como
 * pago, inclusive em outro aparelho) e quando `reload` é chamado.
 */
export function useClosedOrders(
  storeId: string,
  version: number,
): { state: ClosedOrdersState; reload: () => void } {
  const [state, setState] = useState<ClosedOrdersState>({
    status: "loading",
  });
  const [manual, setManual] = useState(0);
  const lastRequest = useRef(0);

  useEffect(() => {
    const request = ++lastRequest.current;
    fetchClosedOrdersInBrowser(storeId).then(
      (orders) => {
        if (request !== lastRequest.current) return;
        setState({ status: "ready", orders });
      },
      (error) => {
        if (request !== lastRequest.current) return;
        console.error(
          "Erro ao ler os pedidos encerrados",
          error,
        );
        // Se já mostrava a lista, mantém; a próxima releitura tenta de novo.
        setState((current) =>
          current.status === "ready"
            ? current
            : { status: "error" },
        );
      },
    );
  }, [storeId, version, manual]);

  const reload = useCallback(() => {
    setState((current) =>
      current.status === "error"
        ? { status: "loading" }
        : current,
    );
    setManual((current) => current + 1);
  }, []);

  return { state, reload };
}
