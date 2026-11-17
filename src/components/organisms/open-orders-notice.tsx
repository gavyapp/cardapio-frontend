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
  orderShortcut,
  openOrdersStorageKey,
  parseRememberedOrders,
  type OrderShortcut,
} from "@/lib/orders/open-orders";
import { STATUS_REFRESH_SECONDS } from "@/lib/orders/tracking";
import { orderPathFrom } from "@/lib/routing/store-paths";
import { cn } from "@/lib/utils";

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
 * Pedidos do cliente neste aparelho, no topo do cardápio: um atalho por
 * pedido para a tela de acompanhamento, com o status de agora. Recusado e
 * cancelado seguem por algumas horas, para o cliente ver o motivo; pedido
 * concluído sai da lista sozinho.
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
  const [shortcuts, setShortcuts] = useState<
    Record<string, OrderShortcut>
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

      const now = new Date();
      const found = lookups.flatMap(({ token, lookup }) =>
        lookup.found
          ? [
              {
                token,
                shortcut: orderShortcut(lookup.order, now),
              },
            ]
          : [],
      );

      // Sai da lista o pedido que não existe mais ou que já não tem o que
      // mostrar (concluído, ou recusado ou cancelado há mais tempo).
      const finished = [
        ...lookups.flatMap(({ token, lookup }) =>
          lookup.found === false ? [token] : [],
        ),
        ...found.flatMap(({ token, shortcut }) =>
          shortcut ? [] : [token],
        ),
      ];
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

      setShortcuts((current) => {
        const next = { ...current };
        for (const { token, shortcut } of found) {
          if (shortcut) next[token] = shortcut;
          else delete next[token];
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

  // Só aparece o pedido cujo status já foi conferido.
  const open = parseRememberedOrders(stored).flatMap(
    (order) => {
      const shortcut = shortcuts[order.token];
      return shortcut ? [{ ...order, ...shortcut }] : [];
    },
  );
  if (open.length === 0) return null;

  return (
    <ul
      aria-label="Seus pedidos"
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
              className={cn(
                "size-2 shrink-0 rounded-full",
                order.stopped
                  ? "bg-destructive"
                  : "bg-primary",
              )}
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
