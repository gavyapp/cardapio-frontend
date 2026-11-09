"use client";

import { Clock } from "lucide-react";

import { Badge } from "@/components/atoms/badge";
import { OrderModeIcon } from "@/components/atoms/order-mode-icon";
import { OrderActionsMenu } from "@/components/molecules/order-actions-menu";
import { formatCurrency, pluralize } from "@/lib/format";
import {
  MODE_LABELS,
  PAYMENT_LABELS,
  elapsedLabel,
  isLate,
  isUnseen,
  nextStep,
  orderTone,
  stageCaption,
  type BoardOrder,
  type OrderTone,
} from "@/lib/orders/board";
import { cn } from "@/lib/utils";

const TONE_STRIPE: Record<OrderTone, string> = {
  late: "border-l-destructive",
  new: "border-l-warning",
  preparing: "border-l-[#8a9099]",
  ready: "border-l-success",
  out: "border-l-foreground",
};

/**
 * Card do quadro, como no protótipo: número, cliente e tempo desde o pedido
 * (vermelho com relógio quando atrasado; selo "Novo" piscando enquanto
 * ninguém abriu o pedido); modo, itens, pagamento e total;
 * há quanto tempo está na etapa; o botão do passo seguinte e o menu "…"
 * (pago, recusar ou cancelar). Tocar no card abre o detalhe.
 */
export function OrderCard({
  order,
  now,
  lateAfterMinutes,
  selected = false,
  pending = false,
  onOpen,
  onAdvance,
  onTogglePaid,
  onCloseOrder,
}: {
  order: BoardOrder;
  now: number;
  lateAfterMinutes: number;
  selected?: boolean;
  /** Mudança de status em andamento. */
  pending?: boolean;
  onOpen: () => void;
  onAdvance: () => void;
  onTogglePaid: () => void;
  onCloseOrder: () => void;
}) {
  const late = isLate(order, lateAfterMinutes, now);
  const isNew = order.status === "RECEBIDO";
  const unseen = isUnseen(order);
  const step = nextStep(order);
  const caption = stageCaption(order, now);

  return (
    <article
      aria-label={`Pedido ${order.number}`}
      onClick={onOpen}
      className={cn(
        "flex shrink-0 cursor-pointer flex-col rounded-control border border-l-4 bg-card",
        TONE_STRIPE[
          orderTone(order, lateAfterMinutes, now)
        ],
        selected && "ring-2 ring-foreground",
      )}
    >
      <div className="flex flex-col gap-2 p-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          aria-label={`Abrir pedido ${order.number} de ${order.customerName}`}
          className="flex flex-col gap-2 rounded-control text-left outline-none focus-visible:ring-1 focus-visible:ring-foreground"
        >
          <span className="flex min-w-0 items-center gap-2 text-body">
            <span className="tabular shrink-0 font-semibold">
              #{order.number}
            </span>
            <span
              className={cn(
                "min-w-0 truncate",
                unseen ? "font-semibold" : "font-medium",
              )}
            >
              {order.customerName}
            </span>
            {unseen ? (
              <Badge
                variant="new"
                className="ml-auto gap-0 motion-safe:animate-soft-pulse"
              >
                Novo
                <span className="sr-only">
                  , ainda não visto
                </span>
              </Badge>
            ) : (
              <span
                className={cn(
                  "tabular ml-auto flex h-[22px] shrink-0 items-center gap-1 text-meta whitespace-nowrap",
                  late && "font-semibold text-destructive",
                )}
              >
                {late ? (
                  <Clock
                    aria-hidden
                    className="size-3.5 -translate-y-[0.5px]"
                    strokeWidth={2.4}
                  />
                ) : null}
                {elapsedLabel(order, now)}
                {late ? (
                  <span className="sr-only">
                    {" "}
                    (atrasado)
                  </span>
                ) : null}
              </span>
            )}
          </span>
          <span className="tabular flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              {/* O desenho pesa para baixo e, em 13px, o centro das
                  maiúsculas fica acima do meio da linha: o ícone sobe um
                  pouco para alinhar com o texto. */}
              <OrderModeIcon
                mode={order.mode}
                className="shrink-0 -translate-y-[1.5px]"
              />
              {MODE_LABELS[order.mode]}
            </span>
            <span aria-hidden>·</span>
            <span>
              {pluralize(order.itemCount, "item", "itens")}
            </span>
            <span aria-hidden>·</span>
            <span>
              {PAYMENT_LABELS[order.paymentMethod]}
            </span>
            <span className="ml-auto text-body font-semibold whitespace-nowrap text-foreground">
              {formatCurrency(order.total)}
            </span>
          </span>
          {caption ? (
            <span
              className={cn(
                "tabular text-meta",
                order.status === "PRONTO"
                  ? "text-success"
                  : "text-muted-foreground",
              )}
            >
              {caption}
            </span>
          ) : null}
        </button>
        {step ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={(event) => {
                event.stopPropagation();
                onAdvance();
              }}
              className={cn(
                "flex h-11 min-w-0 flex-1 items-center justify-center rounded-control px-3 text-meta font-semibold whitespace-nowrap outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1 disabled:opacity-60 lg:h-9",
                isNew
                  ? "bg-foreground text-background"
                  : "border bg-card text-foreground",
              )}
            >
              {pending ? "Salvando…" : step.label}
            </button>
            <OrderActionsMenu
              orderNumber={order.number}
              status={order.status}
              isPaid={order.isPaid}
              disabled={pending}
              onTogglePaid={onTogglePaid}
              onCloseOrder={onCloseOrder}
              className="size-11 lg:size-9"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
