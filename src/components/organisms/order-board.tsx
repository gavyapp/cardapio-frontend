"use client";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { WifiOff } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { CountChip } from "@/components/atoms/count-chip";
import { OrderModeIcon } from "@/components/atoms/order-mode-icon";
import { OrderCard } from "@/components/molecules/order-card";
import { PageHeaderCount } from "@/components/molecules/page-header";
import type { AvailabilityTarget } from "@/components/molecules/order-items";
import {
  OrderReasonDialog,
  type ClosingOrder,
} from "@/components/molecules/order-reason-dialog";
import { useLiveOrdersContext } from "@/components/organisms/live-orders-provider";
import {
  OrderDetailPanel,
  type OrderDetailHandlers,
} from "@/components/organisms/order-detail";
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
import {
  closingKind,
  type OrderRef,
} from "@/lib/orders/detail";
import type { OrderStatus } from "@/lib/orders/status";
import type { ActionResult } from "@/lib/panel/action-result";
import { cn } from "@/lib/utils";

/** Server actions que o quadro usa, ligadas pela página. */
export type OrderBoardActions = {
  advance: (
    orderId: string,
    status: OrderStatus,
  ) => Promise<ActionResult>;
  closeOrder: (
    orderId: string,
    status: "REJEITADO" | "CANCELADO",
    reason: string,
  ) => Promise<ActionResult>;
  setPaid: (
    orderId: string,
    paid: boolean,
  ) => Promise<ActionResult>;
  markRead: (orderId: string) => Promise<ActionResult>;
  setProductAvailability: (
    productId: string,
    isAvailable: boolean,
  ) => Promise<ActionResult>;
  setComplementAvailability: (
    complementId: string,
    isAvailable: boolean,
  ) => Promise<ActionResult>;
};

type CardProps = {
  now: number;
  lateAfterMinutes: number;
  selected: string | null;
  pending: Record<string, OrderStatus>;
  onOpen: (order: BoardOrder) => void;
  onAdvance: (order: BoardOrder) => void;
  onTogglePaid: (order: OrderRef) => void;
  onCloseOrder: (order: OrderRef) => void;
};

/**
 * Quadro de pedidos do protótipo: Novos, Em preparo e Pronto / Em rota lado
 * a lado; no celular, uma coluna por vez, com as abas no topo dela. Os
 * pedidos vêm do provider do painel, que os mantém em tempo real.
 */
export function OrderBoard({
  actions,
}: {
  actions: OrderBoardActions;
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
  const [closing, setClosing] = useState<
    (ClosingOrder & { id: string }) | null
  >(null);
  const { markRead } = actions;
  const onMarkRead = useCallback(
    (orderId: string) => void markRead(orderId),
    [markRead],
  );

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

  async function advanceOrder(order: OrderRef) {
    const step = nextStep(order);
    if (!step) return;
    setPending((current) => ({
      ...current,
      [order.id]: order.status,
    }));
    const result = await actions.advance(
      order.id,
      step.status,
    );
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

  function isSelected(order: Pick<OrderRef, "number">) {
    return selected === String(order.number);
  }

  async function togglePaid(order: OrderRef) {
    const paid = !order.isPaid;
    const result = await actions.setPaid(order.id, paid);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Pedido #${order.number} ${paid ? "marcado" : "desmarcado"} como pago`,
    );
    refresh();
  }

  function askToClose(order: OrderRef) {
    const kind = closingKind(order.status);
    if (!kind) return;
    setClosing({
      id: order.id,
      number: order.number,
      customerName: order.customerName,
      total: order.total,
      kind,
    });
  }

  async function closeOrder(
    reason: string,
  ): Promise<string | null> {
    if (!closing) return null;
    const result = await actions.closeOrder(
      closing.id,
      closing.kind === "reject" ? "REJEITADO" : "CANCELADO",
      reason,
    );
    refresh();
    if (!result.ok) return result.error;
    toast.success(
      `Pedido #${closing.number} ${closing.kind === "reject" ? "recusado" : "cancelado"}`,
    );
    if (isSelected(closing)) setSelected(null);
    return null;
  }

  async function toggleAvailability(
    target: AvailabilityTarget,
  ): Promise<boolean> {
    const change = (isAvailable: boolean) =>
      target.kind === "product"
        ? actions.setProductAvailability(
            target.id,
            isAvailable,
          )
        : actions.setComplementAvailability(
            target.id,
            isAvailable,
          );
    const next = !target.isAvailable;
    const result = await change(next);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    const name =
      target.kind === "complement"
        ? `+ ${target.name}`
        : target.name;
    toast.success(
      next
        ? `${name} disponível no cardápio`
        : `${name} esgotado no cardápio`,
      {
        action: {
          label: "Desfazer",
          onClick: () => {
            void change(target.isAvailable).then((undo) => {
              if (!undo.ok) toast.error(undo.error);
              else refresh();
            });
          },
        },
      },
    );
    return true;
  }

  const detailHandlers: OrderDetailHandlers = {
    pending,
    onAdvance: (order) => void advanceOrder(order),
    onTogglePaid: (order) => void togglePaid(order),
    onCloseOrder: askToClose,
    onToggleAvailability: toggleAvailability,
    onMarkRead,
  };

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
    onTogglePaid: (order) => void togglePaid(order),
    onCloseOrder: askToClose,
  };
  const openNumber =
    selected && /^\d+$/.test(selected)
      ? Number(selected)
      : null;

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      {!live.connected ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-surface bg-warning-soft px-4 py-2.5 text-meta text-warning-foreground"
        >
          <WifiOff aria-hidden className="size-4" />
          Sem conexão. Reconectando… Os pedidos novos
          aparecem assim que voltar.
        </p>
      ) : null}

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)]">
        {BOARD_COLUMNS.map((column) => (
          <section
            key={column.id}
            aria-labelledby={`coluna-${column.id}`}
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-surface border bg-card",
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
                      "flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 px-1 text-meta whitespace-nowrap text-muted-foreground",
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
                      pulse={
                        tab.id === "new" &&
                        live.unseenCount > 0
                      }
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
                live.stageHistory,
                now,
              )}
            />
            {/* relative: os textos sr-only dos cards ficam presos à coluna;
                sem isso eles esticam a página inteira. */}
            <div className="relative flex flex-col gap-2 p-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
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

      <OrderDetailPanel
        number={openNumber}
        onClose={() => setSelected(null)}
        live={{
          storeId: live.storeId,
          storeName: live.storeName,
          version: live.version,
          now,
          lateAfterMinutes: alerts.lateAfterMinutes,
        }}
        handlers={detailHandlers}
      />
      <OrderReasonDialog
        order={closing}
        onOpenChange={(open) => {
          if (!open) setClosing(null);
        }}
        onConfirm={closeOrder}
      />
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
  onTogglePaid,
  onCloseOrder,
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
      onTogglePaid={() => onTogglePaid(order)}
      onCloseOrder={() => onCloseOrder(order)}
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
    <header className="flex min-h-14 shrink-0 items-center gap-3 border-b py-2 pr-3 pl-4">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <h2
          id={`coluna-${column.id}`}
          className="text-body leading-tight font-semibold whitespace-nowrap"
        >
          {column.title}
        </h2>
        {average ? (
          <p className="tabular truncate text-caption text-muted-foreground">
            {average}
          </p>
        ) : null}
      </div>
      <CountChip
        count={count}
        hot={column.id === "new"}
        large
        label={count === 1 ? "pedido" : "pedidos"}
      />
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
      variant: "neutral" as const,
    },
    {
      label: "Pronto para retirada",
      mode: "RETIRADA" as const,
      orders: orders.filter(
        (order) => order.status === "PRONTO",
      ),
      variant: "success" as const,
    },
  ].filter((group) => group.orders.length > 0);

  return groups.map((group, index) => (
    <div key={group.label} className="contents">
      <Badge
        variant={group.variant}
        className={cn(
          "tabular self-start",
          index > 0 && "mt-2",
        )}
      >
        <OrderModeIcon mode={group.mode} />
        {group.label}
        <span>{group.orders.length}</span>
      </Badge>
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
      <p className="text-body font-medium">
        {query ? "Nenhum resultado" : column.emptyTitle}
      </p>
      <p className="max-w-60 text-meta leading-snug text-pretty text-muted-foreground">
        {query
          ? `Nada nesta etapa para "${query}".`
          : column.emptyText}
      </p>
      {query ? (
        <Button
          type="button"
          onClick={() =>
            setSearchParam(ORDER_SEARCH_PARAM, null, {
              replace: true,
            })
          }
          variant="outline"
          size="sm"
          className="mt-3 font-semibold"
        >
          Limpar busca
        </Button>
      ) : null}
    </div>
  );
}

/** "Pedidos de hoje (12)": quantos chegaram hoje, em qualquer status. */
export function TodayOrdersTitle() {
  const live = useLiveOrdersContext();
  return (
    <>
      Pedidos de hoje
      {live ? (
        <PageHeaderCount>{live.todayCount}</PageHeaderCount>
      ) : null}
    </>
  );
}
