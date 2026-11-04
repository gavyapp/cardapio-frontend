"use client";

import { WifiOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { OrderCard } from "@/components/molecules/order-card";
import { useLiveOrdersContext } from "@/components/organisms/live-orders-provider";
import { useSearchParamState } from "@/lib/hooks/use-search-param-state";
import {
  BOARD_COLUMNS,
  ORDER_PARAM,
  ORDER_SEARCH_PARAM,
  averageMinutesInStage,
  formatMinutes,
  groupByColumn,
  matchesOrderSearch,
  nextStep,
  type BoardColumnId,
  type BoardOrder,
} from "@/lib/orders/board";
import type { OrderStatus } from "@/lib/orders/status";
import type { ActionResult } from "@/lib/panel/action-result";
import { cn } from "@/lib/utils";

export type AdvanceOrderAction = (
  orderId: string,
  status: OrderStatus,
) => Promise<ActionResult>;

/**
 * Quadro de pedidos: Novos, Em preparo e Prontos lado a lado (no celular,
 * uma coluna por vez, em abas). Os pedidos vêm do provider do painel, que
 * os mantém em tempo real.
 */
export function OrderBoard({
  advance,
}: {
  advance: AdvanceOrderAction;
}) {
  const live = useLiveOrdersContext();
  const [search] = useSearchParamState(ORDER_SEARCH_PARAM);
  const [selected, setSelected] =
    useSearchParamState(ORDER_PARAM);
  const [mobileColumn, setMobileColumn] =
    useState<BoardColumnId>("new");
  // Pedido → status de onde saiu. Fica "salvando" até a lista chegar com o
  // status novo.
  const [pending, setPending] = useState<
    Record<string, OrderStatus>
  >({});

  if (!live) return null;
  const { now, alerts, refresh } = live;

  const visible = search
    ? live.orders.filter((order) =>
        matchesOrderSearch(order, search),
      )
    : live.orders;
  const columns = groupByColumn(visible);

  async function advanceOrder(order: BoardOrder) {
    const step = nextStep(order);
    if (!step) return;
    setPending((current) => ({
      ...current,
      [order.id]: order.status,
    }));
    const result = await advance(order.id, step.status);
    if (result.ok) {
      refresh();
      return;
    }
    setPending((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });
    toast.error(result.error);
    refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {!live.connected ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-warning-foreground"
        >
          <WifiOff aria-hidden className="size-4" />
          Sem conexão. Reconectando… Os pedidos novos
          aparecem assim que voltar.
        </p>
      ) : null}

      <div
        role="tablist"
        aria-label="Etapas"
        className="grid grid-cols-3 rounded-lg border bg-muted p-0.5 lg:hidden"
      >
        {BOARD_COLUMNS.map((column) => (
          <button
            key={column.id}
            type="button"
            role="tab"
            aria-selected={mobileColumn === column.id}
            onClick={() => setMobileColumn(column.id)}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium text-muted-foreground",
              mobileColumn === column.id &&
                "bg-card text-foreground shadow-sm",
            )}
          >
            {column.label}
            <ColumnCount
              count={columns[column.id].length}
              highlight={column.id === "new"}
            />
          </button>
        ))}
      </div>

      <div className="grid flex-1 items-start gap-4 lg:grid-cols-3">
        {BOARD_COLUMNS.map((column) => {
          const orders = columns[column.id];
          const average = averageMinutesInStage(
            orders,
            now,
          );
          return (
            <section
              key={column.id}
              aria-labelledby={`coluna-${column.id}`}
              className={cn(
                "flex flex-col rounded-xl border bg-muted/60",
                mobileColumn !== column.id &&
                  "max-lg:hidden",
              )}
            >
              <header className="flex flex-col gap-0.5 border-b px-4 py-3">
                <h2
                  id={`coluna-${column.id}`}
                  className="flex items-center gap-2 text-[15px] font-semibold"
                >
                  {column.label}
                  <ColumnCount
                    count={orders.length}
                    highlight={column.id === "new"}
                  />
                </h2>
                <p className="text-[13px] text-muted-foreground">
                  {average === null
                    ? "Nenhum pedido"
                    : `${column.averageLabel} ${formatMinutes(average)}`}
                </p>
              </header>
              <ul className="flex flex-col gap-3 p-3">
                {orders.length === 0 ? (
                  <li className="px-1 py-6 text-center text-[13px] text-muted-foreground">
                    {search
                      ? "Nenhum pedido encontrado."
                      : "Sem pedidos nesta etapa."}
                  </li>
                ) : (
                  orders.map((order) => (
                    <li key={order.id}>
                      <OrderCard
                        order={order}
                        now={now}
                        lateAfterMinutes={
                          alerts.lateAfterMinutes
                        }
                        selected={
                          selected === String(order.number)
                        }
                        pending={
                          pending[order.id] === order.status
                        }
                        onOpen={() =>
                          setSelected(String(order.number))
                        }
                        onAdvance={() =>
                          void advanceOrder(order)
                        }
                      />
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ColumnCount({
  count,
  highlight,
}: {
  count: number;
  highlight: boolean;
}) {
  return (
    <span
      className={cn(
        "tabular rounded-md px-1.5 py-0.5 text-xs font-medium",
        highlight && count > 0
          ? "bg-warning-soft text-warning-foreground"
          : "bg-card text-muted-foreground",
      )}
    >
      {count}
    </span>
  );
}

/** "Pedidos em aberto (5)", com a contagem ao vivo. */
export function OpenOrdersTitle() {
  const live = useLiveOrdersContext();
  return (
    <>
      Pedidos em aberto
      {live ? (
        <span className="tabular font-normal text-muted-foreground">
          ({live.orders.length})
        </span>
      ) : null}
    </>
  );
}
