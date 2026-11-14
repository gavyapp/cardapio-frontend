"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

import { STATUS_REFRESH_SECONDS } from "@/lib/orders/tracking";

/**
 * Mantém o status do pedido em dia: pede a página de novo ao servidor de
 * tempos em tempos e sempre que o cliente volta para a aba. Com a aba em
 * segundo plano, não consulta. Não desenha nada.
 */
export function OrderStatusRefresher() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  // Lido dentro do temporizador sem recriá-lo a cada consulta.
  const isRefreshingRef = useRef(isRefreshing);
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    const refreshIfVisible = () => {
      // Uma consulta por vez: pedir de novo cancelaria a que está a caminho.
      if (
        document.visibilityState !== "visible" ||
        isRefreshingRef.current
      ) {
        return;
      }
      startRefresh(() => router.refresh());
    };
    const timer = window.setInterval(
      refreshIfVisible,
      STATUS_REFRESH_SECONDS * 1000,
    );
    document.addEventListener(
      "visibilitychange",
      refreshIfVisible,
    );
    return () => {
      window.clearInterval(timer);
      document.removeEventListener(
        "visibilitychange",
        refreshIfVisible,
      );
    };
  }, [router]);

  return null;
}
