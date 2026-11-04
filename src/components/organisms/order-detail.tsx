"use client";

import { Clock, MessageCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { OrderModeIcon } from "@/components/atoms/order-mode-icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/atoms/sheet";
import { OrderActionsMenu } from "@/components/molecules/order-actions-menu";
import {
  OrderItems,
  type AvailabilityTarget,
} from "@/components/molecules/order-items";
import { OrderTimeline } from "@/components/molecules/order-timeline";
import {
  formatCurrency,
  formatPhone,
  formatStoreTime,
  pluralize,
} from "@/lib/format";
import { useExitSnapshot } from "@/lib/hooks/use-exit-snapshot";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useOrderDetail } from "@/lib/hooks/use-order-detail";
import {
  PAYMENT_LABELS,
  elapsedLabel,
  isLate,
} from "@/lib/orders/board";
import {
  addressLines,
  changeLabel,
  detailStepLabel,
  isClosed,
  statusBadge,
  timelineSteps,
  whatsAppAction,
  type OrderDetail as Order,
  type OrderRef,
} from "@/lib/orders/detail";
import type { OrderStatus } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

export type OrderDetailHandlers = {
  /** Pedido → status de onde saiu, enquanto a mudança está em andamento. */
  pending: Record<string, OrderStatus>;
  onAdvance: (order: OrderRef) => void;
  onTogglePaid: (order: OrderRef) => void;
  onCloseOrder: (order: OrderRef) => void;
  /** Devolve true se mudou (para reler o pedido). */
  onToggleAvailability: (
    target: AvailabilityTarget,
  ) => Promise<boolean>;
  onMarkRead: (orderId: string) => void;
};

type Live = {
  storeId: string;
  storeName: string;
  version: number;
  now: number;
  lateAfterMinutes: number;
};

/**
 * Detalhe do pedido: painel lateral no computador e folha quase em tela
 * cheia no celular, como no protótipo. Lê o pedido completo pelo número e
 * acompanha as mudanças em tempo real.
 */
export function OrderDetailPanel({
  number,
  onClose,
  live,
  handlers,
}: {
  /** Número do pedido aberto; null fecha. */
  number: number | null;
  onClose: () => void;
  live: Live;
  handlers: OrderDetailHandlers;
}) {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const open = number !== null;
  const shown = useExitSnapshot(open, number);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      onOpenChangeComplete={shown.onOpenChangeComplete}
    >
      <SheetContent
        side={desktop ? "right" : "bottom"}
        showCloseButton={false}
        overlayClassName="bg-black/15 supports-backdrop-filter:backdrop-blur-none"
        className={cn(
          "gap-0 overflow-hidden",
          desktop
            ? "data-[side=right]:w-full data-[side=right]:sm:max-w-[420px]"
            : "rounded-t-xl data-[side=bottom]:h-[calc(100dvh-16px)]",
        )}
      >
        {shown.isMounted && shown.value !== null ? (
          <DetailContent
            number={shown.value}
            live={live}
            handlers={handlers}
            onClose={onClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailContent({
  number,
  live,
  handlers,
  onClose,
}: {
  number: number;
  live: Live;
  handlers: OrderDetailHandlers;
  onClose: () => void;
}) {
  const { state, reload } = useOrderDetail(
    live.storeId,
    number,
    live.version,
  );
  const order =
    state.status === "ready" ? state.order : null;
  useMarkRead(order, handlers.onMarkRead);

  if (!order) {
    return (
      <>
        <header className="flex items-center gap-3 border-b py-3 pr-3 pl-6">
          <SheetTitle className="flex-1 text-xl font-semibold">
            Pedido #{number}
          </SheetTitle>
          <CloseButton onClose={onClose} />
        </header>
        <SheetDescription className="p-6 text-[15px]">
          {state.status === "loading"
            ? "Carregando…"
            : state.status === "not-found"
              ? "Pedido não encontrado nesta loja."
              : "Não foi possível abrir o pedido. Confira a conexão e tente de novo."}
        </SheetDescription>
      </>
    );
  }

  const late =
    !isClosed(order.status) &&
    isLate(order, live.lateAfterMinutes, live.now);
  const elapsed = elapsedLabel(order, live.now);
  const itemCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const stepLabel = detailStepLabel(order);
  const pending =
    handlers.pending[order.id] === order.status;
  const whatsApp = whatsAppAction(order, live.storeName);
  const address = addressLines(order.address);
  const change = order.isPaid ? null : changeLabel(order);

  return (
    <>
      <span
        aria-hidden
        className={cn(
          "h-1 shrink-0",
          stripeClass(order, late),
        )}
      />
      <header className="flex items-start gap-3 border-b py-3 pr-3 pl-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="tabular text-2xl leading-none font-semibold">
              #{order.number}
            </SheetTitle>
            <span
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[4px] px-2 text-xs font-semibold whitespace-nowrap",
                badgeClass(order.status),
              )}
            >
              {order.status === "A_CAMINHO" ||
              (order.status === "PRONTO" &&
                order.mode === "RETIRADA") ? (
                <OrderModeIcon mode={order.mode} />
              ) : null}
              {statusBadge(order)}
            </span>
          </div>
          <span className="text-[15px] font-medium">
            {order.customerName}
          </span>
          <SheetDescription
            className={cn(
              "tabular flex items-center gap-1 text-[13px]",
              late
                ? "font-semibold text-destructive"
                : "text-muted-foreground",
            )}
          >
            {late ? (
              <Clock
                aria-hidden
                className="size-3.5"
                strokeWidth={2.4}
              />
            ) : null}
            Recebido às {formatStoreTime(order.createdAt)}
            {isClosed(order.status)
              ? ""
              : elapsed === "agora"
                ? " · agora"
                : ` · há ${elapsed}`}
            {late ? " · atrasado" : ""}
          </SheetDescription>
        </div>
        <CloseButton onClose={onClose} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Section
          title={pluralize(itemCount, "item", "itens")}
        >
          {order.notes ? (
            <p className="rounded-[4px] bg-warning-soft px-3 py-2 text-sm font-medium text-warning-foreground">
              Obs. do pedido: {order.notes}
            </p>
          ) : null}
          <OrderItems
            items={order.items}
            onToggleAvailability={async (target) => {
              if (
                await handlers.onToggleAvailability(target)
              )
                reload();
            }}
          />
        </Section>

        <Section
          title={
            order.mode === "ENTREGA"
              ? "Endereço de entrega"
              : "Retirada"
          }
        >
          {order.mode === "ENTREGA" ? (
            address ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-medium">
                  {address.main}
                </span>
                {address.extra ? (
                  <span className="text-[13px] text-muted-foreground">
                    {address.extra}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-[15px] text-muted-foreground">
                Sem endereço no pedido
              </span>
            )
          ) : (
            <span className="text-[15px] font-medium">
              Cliente retira no balcão
            </span>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              href={`tel:${order.customerPhone.replace(/\D/g, "")}`}
              className="tabular text-[15px] underline-offset-4 hover:underline"
            >
              {formatPhone(order.customerPhone)}
            </a>
            {whatsApp ? (
              <a
                href={whatsApp.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-[4px] border px-3 text-[13px] font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground"
              >
                <MessageCircle
                  aria-hidden
                  className="size-4 text-success"
                />
                {whatsApp.label}
              </a>
            ) : null}
          </div>
        </Section>

        <Section
          title={
            order.isPaid || isClosed(order.status)
              ? "Pagamento"
              : order.mode === "ENTREGA"
                ? "Cobrar na entrega"
                : "Cobrar na retirada"
          }
        >
          <div className="flex items-center gap-2 text-[15px] font-medium">
            {PAYMENT_LABELS[order.paymentMethod]}
            {order.isPaid ? (
              <span className="inline-flex h-6 items-center rounded-[4px] bg-success-soft px-2 text-xs font-semibold text-success">
                Pago
              </span>
            ) : null}
          </div>
          {change ? (
            <span className="tabular text-sm">
              {change}
            </span>
          ) : null}
          <dl className="tabular flex flex-col gap-1 text-sm text-muted-foreground">
            <Row label="Subtotal">
              {formatCurrency(order.subtotal)}
            </Row>
            {order.mode === "ENTREGA" ? (
              <Row label="Taxa de entrega">
                {order.deliveryFee > 0
                  ? formatCurrency(order.deliveryFee)
                  : "Grátis"}
              </Row>
            ) : null}
            {order.discount > 0 ? (
              <Row label="Desconto">
                −{formatCurrency(order.discount)}
              </Row>
            ) : null}
            <Row
              label="Total"
              className="text-base font-semibold text-foreground"
            >
              {formatCurrency(order.total)}
            </Row>
          </dl>
        </Section>

        <Section title="Linha do tempo" last>
          <OrderTimeline steps={timelineSteps(order)} />
        </Section>
      </div>

      <footer className="flex shrink-0 gap-2 border-t bg-card px-6 py-4">
        {stepLabel ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => handlers.onAdvance(order)}
            className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-[4px] bg-foreground px-4 text-[15px] font-semibold whitespace-nowrap text-background outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {pending ? "Salvando…" : stepLabel}
          </button>
        ) : (
          <span className="flex-1 self-center text-sm text-muted-foreground">
            Pedido {statusBadge(order).toLowerCase()}
          </span>
        )}
        <OrderActionsMenu
          orderNumber={order.number}
          status={order.status}
          isPaid={order.isPaid}
          disabled={pending}
          onTogglePaid={() => handlers.onTogglePaid(order)}
          onCloseOrder={() => handlers.onCloseOrder(order)}
          className="size-11"
        />
      </footer>
    </>
  );
}

/** Marca como lido na primeira vez que o pedido aparece aberto aqui. */
function useMarkRead(
  order: Order | null,
  markRead: (orderId: string) => void,
) {
  const marked = useRef<string | null>(null);
  const orderId = order?.id ?? null;
  const unread = order !== null && order.readAt === null;
  useEffect(() => {
    if (!orderId || !unread || marked.current === orderId)
      return;
    marked.current = orderId;
    markRead(orderId);
  }, [orderId, unread, markRead]);
}

function Section({
  title,
  last = false,
  children,
}: {
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 px-6 py-4",
        !last && "border-b",
      )}
    >
      <h3 className="text-xs font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3",
        className,
      )}
    >
      <dt>{label}</dt>
      <dd className="whitespace-nowrap">{children}</dd>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fechar"
      className="flex size-10 shrink-0 items-center justify-center rounded-[4px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground"
    >
      <X aria-hidden className="size-4" />
    </button>
  );
}

function stripeClass(order: Order, late: boolean): string {
  if (late) return "bg-destructive";
  switch (order.status) {
    case "RECEBIDO":
      return "bg-warning";
    case "EM_PREPARO":
      return "bg-[#8a9099]";
    case "PRONTO":
      return "bg-success";
    case "A_CAMINHO":
      return "bg-foreground";
    case "CONCLUIDO":
      return "bg-border";
    default:
      return "bg-destructive";
  }
}

function badgeClass(status: OrderStatus): string {
  switch (status) {
    case "RECEBIDO":
      return "bg-warning-soft text-warning-foreground";
    case "PRONTO":
      return "bg-success-soft text-success";
    case "A_CAMINHO":
      return "bg-foreground text-background";
    case "REJEITADO":
    case "CANCELADO":
      return "bg-destructive-soft text-destructive";
    default:
      return "bg-muted text-foreground";
  }
}
