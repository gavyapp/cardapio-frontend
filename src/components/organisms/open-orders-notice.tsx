"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
  forgetOrders,
  lookUpOrderStatus,
  openOrderLabel,
  openOrdersStorageKey,
  parseRememberedOrders,
} from "@/lib/orders/open-orders";
import type { OrderStatus } from "@/lib/orders/status";
import { STATUS_REFRESH_SECONDS } from "@/lib/orders/tracking";
import { orderPathFrom } from "@/lib/routing/store-paths";

// O localStorage não avisa a própria aba quando muda; este evento avisa.
const ORDERS_CHANGED = "cardapio:pedidos-mudaram";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(ORDERS_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ORDERS_CHANGED, onChange);
  };
}

// Navegação privada ou armazenamento bloqueado: segue sem a lista.
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Pedidos em andamento do cliente neste aparelho, no topo do cardápio: um
 * atalho por pedido para a tela de acompanhamento, com o status de agora.
 * Pedido que encerrou sai da lista sozinho.
 */
export function OpenOrdersNotice({
  storeId,
}: {
  storeId: string;
}) {
  const pathname = usePathname();
  const storageKey = openOrdersStorageKey(storeId);
  const stored = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    // No servidor não há pedidos guardados: o aparelho preenche depois.
    () => null,
  );
  const [statuses, setStatuses] = useState<
    Record<string, OrderStatus>
  >({});

  useEffect(() => {
    const orders = parseRememberedOrders(stored);
    if (orders.length === 0) return;
    let cancelled = false;

    async function refresh() {
      if (document.visibilityState !== "visible") return;
      const lookups = await Promise.all(
        orders.map(async ({ token }) => ({
          token,
          lookup: await lookUpOrderStatus(token),
        })),
      );
      if (cancelled) return;

      // Encerrado ou inexistente não volta a aparecer.
      const finished = lookups.flatMap(
        ({ token, lookup }) =>
          lookup.found === false ||
          (lookup.found &&
            openOrderLabel(lookup.order.status) === null)
            ? [token]
            : [],
      );
      if (finished.length) {
        try {
          const kept = forgetOrders(orders, finished);
          if (kept.length) {
            window.localStorage.setItem(
              storageKey,
              JSON.stringify(kept),
            );
          } else {
            window.localStorage.removeItem(storageKey);
          }
        } catch {
          // Sem armazenamento, a lista só não é atualizada.
        }
        window.dispatchEvent(new Event(ORDERS_CHANGED));
      }

      setStatuses((current) => {
        const next = { ...current };
        for (const { token, lookup } of lookups) {
          if (lookup.found)
            next[token] = lookup.order.status;
        }
        return next;
      });
    }

    void refresh();
    const timer = window.setInterval(
      refresh,
      STATUS_REFRESH_SECONDS * 1000,
    );
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener(
        "visibilitychange",
        refresh,
      );
    };
  }, [stored, storageKey]);

  // Só aparece o pedido cujo status já foi conferido e segue em andamento.
  const open = parseRememberedOrders(stored).flatMap(
    (order) => {
      const status = statuses[order.token];
      const label = status ? openOrderLabel(status) : null;
      return label ? [{ ...order, label }] : [];
    },
  );
  if (open.length === 0) return null;

  return (
    <ul
      aria-label="Seus pedidos em andamento"
      className="flex flex-col gap-2"
    >
      {open.map((order) => (
        <li key={order.token}>
          <Link
            href={orderPathFrom(pathname, order.token)}
            className="flex items-center gap-3 rounded-control border bg-card px-4 py-3 text-body font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full bg-primary"
            />
            <span className="min-w-0 flex-1 truncate">
              Pedido{" "}
              <span className="tabular">
                #{order.number}
              </span>{" "}
              · {order.label}
            </span>
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
