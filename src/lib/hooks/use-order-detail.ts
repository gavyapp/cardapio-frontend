"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { fetchOrderDetailInBrowser } from "@/lib/data/order-detail";
import type { OrderDetail } from "@/lib/orders/detail";

export type OrderDetailState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; order: OrderDetail };

/**
 * Pedido completo pelo número. Relê sempre que `version` muda (a lista ao
 * vivo do painel foi relida, então algo pode ter mudado, inclusive em outro
 * aparelho) e quando `reload` é chamado depois de uma ação.
 */
export function useOrderDetail(
  storeId: string,
  number: number | null,
  version: number,
): { state: OrderDetailState; reload: () => void } {
  const [state, setState] = useState<OrderDetailState>({
    status: "loading",
  });
  const [shownNumber, setShownNumber] = useState(number);
  const [manual, setManual] = useState(0);
  const lastRequest = useRef(0);

  // Outro pedido: começa carregando, sem mostrar o anterior.
  if (number !== shownNumber) {
    setShownNumber(number);
    setState({ status: "loading" });
  }

  useEffect(() => {
    if (number === null) return;
    const request = ++lastRequest.current;
    fetchOrderDetailInBrowser(storeId, number).then(
      (order) => {
        if (request !== lastRequest.current) return;
        setState(
          order
            ? { status: "ready", order }
            : { status: "not-found" },
        );
      },
      (error) => {
        if (request !== lastRequest.current) return;
        console.error("Erro ao ler o pedido", error);
        // Se já mostrava o pedido, mantém; a próxima releitura tenta de novo.
        setState((current) =>
          current.status === "ready"
            ? current
            : { status: "error" },
        );
      },
    );
  }, [storeId, number, version, manual]);

  const reload = useCallback(
    () => setManual((current) => current + 1),
    [],
  );

  return { state, reload };
}
