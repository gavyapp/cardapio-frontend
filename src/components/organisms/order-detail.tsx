"use client";

import {
  Check,
  Clock,
  MessageCircle,
  X,
} from "lucide-react";
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
  whatsAppLink,
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
            ? "data-[side=right]:w-full data-[side=right]:sm:max-w-[640px]"
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
        <header className="flex items-center gap-3 border-b py-3 pr-3 pl-4 lg:pl-6">
          <SheetTitle className="flex-1 text-2xl font-semibold">
            #{number}
          </SheetTitle>
          <CloseButton onClose={onClose} />
        </header>
        <SheetDescription className="px-4 py-6 text-[15px] lg:px-6">
          {state.status === "loading"
            ? "Carregando…"
            : state.status === "not-found"
              ? "Pedido não encontrado nesta loja."
              : "Não foi possível abrir o pedido. Confira a conexão e tente de novo."}
        </SheetDescription>
      </>
    );
  }

  const closed = isClosed(order.status);
  const late =
    !closed &&
    isLate(order, live.lateAfterMinutes, live.now);
  const elapsed = elapsedLabel(order, live.now);
  const itemCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const stepLabel = detailStepLabel(order);
  const pending =
    handlers.pending[order.id] === order.status;
  const whatsApp = whatsAppLink(order, live.storeName);
  const address = addressLines(order.address);
  const change = order.isPaid ? null : changeLabel(order);
  const tone = toneClasses(order, late);
  const badgeIcon =
    order.status === "A_CAMINHO" ||
    (order.status === "PRONTO" &&
      order.mode === "RETIRADA");

  return (
    <>
      <span
        aria-hidden
        className={cn("h-1 shrink-0", tone.stripe)}
      />
      <header className="flex shrink-0 items-start gap-3 border-b pt-3 pr-3 pb-4 pl-4 lg:pl-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="tabular text-2xl leading-[1.1] font-semibold">
              #{order.number}
            </SheetTitle>
            <span
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[4px] px-2 text-xs font-semibold whitespace-nowrap",
                badgeClass(order.status),
              )}
            >
              {badgeIcon ? (
                <OrderModeIcon
                  mode={order.mode}
                  className="shrink-0"
                />
              ) : null}
              {statusBadge(order)}
            </span>
          </div>
          <span className="truncate text-lg leading-[1.3] font-semibold">
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
                className="size-3.5 shrink-0"
                strokeWidth={2.4}
              />
            ) : null}
            Recebido às {formatStoreTime(order.createdAt)}
            {closed
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
        <Section>
          <SectionLabel>
            {pluralize(itemCount, "item", "itens")}
          </SectionLabel>
          {order.notes ? (
            <p className="rounded-[4px] bg-warning-soft px-3 py-2 text-[13px] leading-[1.4] font-medium text-warning-foreground">
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
        <Divider />

        <Section className="gap-1 leading-[1.4]">
          <SectionLabel>
            {order.mode === "ENTREGA"
              ? "Endereço de entrega"
              : "Retirada"}
          </SectionLabel>
          {order.mode === "ENTREGA" ? (
            address ? (
              <>
                <span className="text-[15px] font-medium">
                  {address.main}
                </span>
                {address.extra ? (
                  <span className="text-[13px] text-muted-foreground">
                    {address.extra}
                  </span>
                ) : null}
              </>
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
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={`tel:${order.customerPhone.replace(/\D/g, "")}`}
              className="tabular text-[15px] whitespace-nowrap underline-offset-4 hover:underline"
            >
              {formatPhone(order.customerPhone)}
            </a>
            {whatsApp ? (
              <a
                href={whatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-[4px] border bg-card px-3 text-[13px] font-medium whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground"
              >
                <MessageCircle
                  aria-hidden
                  className="size-4 text-success"
                  strokeWidth={2.2}
                />
                WhatsApp
              </a>
            ) : null}
          </div>
        </Section>
        <Divider />

        <Section className="tabular gap-1">
          {!order.isPaid ? (
            <SectionLabel>
              {order.mode === "ENTREGA"
                ? "Cobrar na entrega"
                : "Cobrar na retirada"}
            </SectionLabel>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold">
              {PAYMENT_LABELS[order.paymentMethod]}
            </span>
            {order.isPaid ? (
              <span className="inline-flex h-7 items-center gap-1 rounded-[4px] bg-success px-2.5 text-[13px] font-semibold text-success-foreground">
                <Check
                  aria-hidden
                  className="size-3.5"
                  strokeWidth={3}
                />
                Pago
              </span>
            ) : null}
          </div>
          {change ? (
            <span className="text-[13px] text-muted-foreground">
              {change}
            </span>
          ) : null}
          <dl className="flex flex-col gap-1 pt-2 text-[13px] text-muted-foreground">
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
              <Row
                label="Desconto"
                className="text-success"
              >
                −{formatCurrency(order.discount)}
              </Row>
            ) : null}
            <div className="flex items-baseline justify-between gap-3 pt-1 text-foreground">
              <dt className="text-[15px] font-semibold">
                Total
              </dt>
              <dd className="text-lg font-semibold whitespace-nowrap">
                {formatCurrency(order.total)}
              </dd>
            </div>
          </dl>
        </Section>
        <Divider />

        <Section className="gap-0 pb-5">
          <SectionLabel className="pb-3">
            Linha do tempo
          </SectionLabel>
          <OrderTimeline
            steps={timelineSteps(order)}
            currentDotClass={tone.dot}
          />
        </Section>
      </div>

      <footer className="flex shrink-0 gap-2 border-t bg-card px-4 py-4 lg:px-6">
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
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 px-4 py-4 lg:px-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={cn(
        "text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </h3>
  );
}

/** Separador tracejado entre os blocos, como numa comanda. */
function Divider() {
  return (
    <hr
      aria-hidden
      className="mx-4 border-0 border-t border-dashed border-border lg:mx-6"
    />
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
      className="flex size-11 shrink-0 items-center justify-center rounded-[4px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground"
    >
      <X aria-hidden className="size-4" strokeWidth={2.2} />
    </button>
  );
}

/** Cor da faixa no topo e do ponto do passo atual na linha do tempo. */
function toneClasses(
  order: Order,
  late: boolean,
): { stripe: string; dot: string } {
  if (late)
    return {
      stripe: "bg-destructive",
      dot: "border-destructive bg-destructive",
    };
  switch (order.status) {
    case "RECEBIDO":
      return {
        stripe: "bg-warning",
        dot: "border-warning bg-warning",
      };
    case "EM_PREPARO":
      return {
        stripe: "bg-[#8a9099]",
        dot: "border-[#8a9099] bg-[#8a9099]",
      };
    case "PRONTO":
      return {
        stripe: "bg-success",
        dot: "border-success bg-success",
      };
    case "A_CAMINHO":
    case "CONCLUIDO":
      return {
        stripe: "bg-foreground",
        dot: "border-foreground bg-foreground",
      };
    default:
      return {
        stripe: "bg-destructive",
        dot: "border-destructive bg-destructive",
      };
  }
}

function badgeClass(status: OrderStatus): string {
  switch (status) {
    case "RECEBIDO":
      return "bg-[#f7e1b6] text-foreground";
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
