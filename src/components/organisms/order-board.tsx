"use client";

import { WifiOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { OrderModeIcon } from "@/components/atoms/order-mode-icon";
import { OrderCard } from "@/components/molecules/order-card";
import { useLiveOrdersContext } from "@/components/organisms/live-orders-provider";
import {
  setSearchParam,
  useSearchParamState,
} from "@/lib/hooks/use-search-param-state";
import {
  BOARD_COLUMNS,
  ORDER_PARAM,
  ORDER_SEARCH_PARAM,
  columnAverage,
  groupByColumn,
  matchesOrderSearch,
  nextStep,
  type BoardColumn,
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

type CardProps = {
  now: number;
  lateAfterMinutes: number;
  selected: string | null;
  pending: Record<string, OrderStatus>;
  onOpen: (order: BoardOrder) => void;
  onAdvance: (order: BoardOrder) => void;
};

/**
 * Quadro de pedidos do protótipo: Novos, Em preparo e Pronto / Em rota lado
 * a lado; no celular, uma coluna por vez, com as abas no topo dela. Os
 * pedidos vêm do provider do painel, que os mantém em tempo real.
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
  const query = search?.trim() ?? "";

  const visible = query
    ? live.orders.filter((order) =>
        matchesOrderSearch(order, query),
      )
    : live.orders;
  const columns = groupByColumn(
    visible,
    alerts.lateAfterMinutes,
    now,
  );

  async function advanceOrder(order: BoardOrder) {
    const step = nextStep(order);
    if (!step) return;
    setPending((current) => ({
      ...current,
      [order.id]: order.status,
    }));
    const result = await advance(order.id, step.status);
    if (result.ok) {
      if (step.status === "CONCLUIDO" && isSelected(order))
        setSelected(null);
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

  function isSelected(order: BoardOrder) {
    return selected === String(order.number);
  }

  const cardProps: CardProps = {
    now,
    lateAfterMinutes: alerts.lateAfterMinutes,
    selected,
    pending,
    onOpen: (order) =>
      setSelected(
        isSelected(order) ? null : String(order.number),
      ),
    onAdvance: (order) => void advanceOrder(order),
  };

  return (
    <div className="flex flex-col gap-4">
      {!live.connected ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-warning-soft px-4 py-2.5 text-[13px] text-warning-foreground"
        >
          <WifiOff aria-hidden className="size-4" />
          Sem conexão. Reconectando… Os pedidos novos
          aparecem assim que voltar.
        </p>
      ) : null}

      <div className="grid gap-4 lg:h-[max(600px,calc(100dvh-14rem))] lg:grid-cols-3">
        {BOARD_COLUMNS.map((column) => (
          <section
            key={column.id}
            aria-labelledby={`coluna-${column.id}`}
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card",
              mobileColumn !== column.id && "max-lg:hidden",
            )}
          >
            <div
              role="tablist"
              aria-label="Etapas"
              className="flex border-b lg:hidden"
            >
              {BOARD_COLUMNS.map((tab) => {
                const active = tab.id === mobileColumn;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMobileColumn(tab.id)}
                    className={cn(
                      "flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 px-1 text-[13px] whitespace-nowrap text-muted-foreground",
                      active &&
                        "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--foreground)]",
                    )}
                  >
                    <span className="truncate">
                      {tab.tab}
                    </span>
                    <CountChip
                      count={columns[tab.id].length}
                      hot={tab.id === "new"}
                      small
                    />
                  </button>
                );
              })}
            </div>
            <ColumnHeader
              column={column}
              count={columns[column.id].length}
              average={columnAverage(
                column,
                columns[column.id],
                now,
              )}
            />
            <div className="flex flex-col gap-2 p-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {columns[column.id].length === 0 ? (
                <EmptyColumn
                  column={column}
                  query={query}
                />
              ) : column.id === "ready" ? (
                <ReadyGroups
                  orders={columns.ready}
                  cardProps={cardProps}
                />
              ) : (
                columns[column.id].map((order) => (
                  <BoardCard
                    key={order.id}
                    order={order}
                    {...cardProps}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function BoardCard({
  order,
  now,
  lateAfterMinutes,
  selected,
  pending,
  onOpen,
  onAdvance,
}: CardProps & { order: BoardOrder }) {
  return (
    <OrderCard
      order={order}
      now={now}
      lateAfterMinutes={lateAfterMinutes}
      selected={selected === String(order.number)}
      pending={pending[order.id] === order.status}
      onOpen={() => onOpen(order)}
      onAdvance={() => onAdvance(order)}
    />
  );
}

function ColumnHeader({
  column,
  count,
  average,
}: {
  column: BoardColumn;
  count: number;
  average: string | null;
}) {
  return (
    <header className="flex min-h-14 shrink-0 flex-col justify-center gap-0.5 border-b py-2 pr-3 pl-4">
      <h2
        id={`coluna-${column.id}`}
        className="flex items-center gap-2 text-[15px] leading-tight font-semibold whitespace-nowrap"
      >
        {column.title}
        <CountChip
          count={count}
          hot={column.id === "new"}
        />
      </h2>
      {average ? (
        <p className="tabular text-xs text-muted-foreground">
          {average}
        </p>
      ) : null}
    </header>
  );
}

/** "Saiu para entrega" primeiro, depois "Pronto para retirada". */
function ReadyGroups({
  orders,
  cardProps,
}: {
  orders: BoardOrder[];
  cardProps: CardProps;
}) {
  const groups = [
    {
      label: "Saiu para entrega",
      mode: "ENTREGA" as const,
      orders: orders.filter(
        (order) => order.status === "A_CAMINHO",
      ),
      className: "bg-muted text-foreground",
    },
    {
      label: "Pronto para retirada",
      mode: "RETIRADA" as const,
      orders: orders.filter(
        (order) => order.status === "PRONTO",
      ),
      className: "bg-success-soft text-success",
    },
  ].filter((group) => group.orders.length > 0);

  return groups.map((group, index) => (
    <div key={group.label} className="contents">
      <p
        className={cn(
          "tabular flex h-6 shrink-0 items-center gap-1.5 self-start rounded-[4px] px-2 text-xs font-semibold whitespace-nowrap",
          group.className,
          index > 0 && "mt-2",
        )}
      >
        <OrderModeIcon mode={group.mode} />
        {group.label}
        <span>{group.orders.length}</span>
      </p>
      {group.orders.map((order) => (
        <BoardCard
          key={order.id}
          order={order}
          {...cardProps}
        />
      ))}
    </div>
  ));
}

function EmptyColumn({
  column,
  query,
}: {
  column: BoardColumn;
  query: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-8 text-center max-lg:min-h-60">
      <p className="text-[15px] font-medium">
        {query ? "Nenhum resultado" : column.emptyTitle}
      </p>
      <p className="max-w-60 text-[13px] leading-snug text-pretty text-muted-foreground">
        {query
          ? `Nada nesta etapa para "${query}".`
          : column.emptyText}
      </p>
      {query ? (
        <button
          type="button"
          onClick={() =>
            setSearchParam(ORDER_SEARCH_PARAM, null, {
              replace: true,
            })
          }
          className="mt-3 flex h-9 items-center rounded-[4px] border bg-card px-3 text-[13px] font-semibold hover:bg-muted"
        >
          Limpar busca
        </button>
      ) : null}
    </div>
  );
}

function CountChip({
  count,
  hot,
  small = false,
}: {
  count: number;
  hot: boolean;
  small?: boolean;
}) {
  return (
    <span
      className={cn(
        "tabular inline-flex h-5 shrink-0 items-center justify-center rounded-[4px] text-xs font-semibold text-foreground",
        small ? "min-w-5 px-[5px]" : "min-w-6 px-1.5",
        hot && count > 0 ? "bg-warning" : "bg-muted",
      )}
    >
      {count}
    </span>
  );
}

/** "Pedidos de hoje (12)": quantos chegaram hoje, em qualquer status. */
export function TodayOrdersTitle() {
  const live = useLiveOrdersContext();
  return (
    <>
      Pedidos de hoje
      {live ? (
        <span className="tabular font-normal text-muted-foreground">
          ({live.todayCount})
        </span>
      ) : null}
    </>
  );
}
