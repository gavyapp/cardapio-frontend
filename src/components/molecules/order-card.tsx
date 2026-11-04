"use client";

import { Bike, Clock, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { formatCurrency, pluralize } from "@/lib/format";
import {
  MODE_LABELS,
  PAYMENT_LABELS,
  formatMinutes,
  isLate,
  minutesSince,
  nextStep,
  stageCaption,
  type BoardOrder,
} from "@/lib/orders/board";
import { cn } from "@/lib/utils";

/**
 * Card do quadro: número, cliente, modo, itens, pagamento, total e o tempo
 * desde o pedido (vermelho quando atrasado). Tocar abre o detalhe; o botão
 * leva o pedido ao passo seguinte.
 */
export function OrderCard({
  order,
  now,
  lateAfterMinutes,
  selected = false,
  pending = false,
  onOpen,
  onAdvance,
}: {
  order: BoardOrder;
  now: number;
  lateAfterMinutes: number;
  selected?: boolean;
  /** Mudança de status em andamento. */
  pending?: boolean;
  onOpen: () => void;
  onAdvance: () => void;
}) {
  const late = isLate(order, lateAfterMinutes, now);
  const isNew = order.status === "RECEBIDO";
  const step = nextStep(order);
  const caption = stageCaption(order, now);
  const ModeIcon =
    order.mode === "ENTREGA" ? Bike : ShoppingBag;

  return (
    <article
      aria-label={`Pedido ${order.number}`}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-l-4 bg-card p-4",
        late
          ? "border-l-destructive"
          : isNew
            ? "border-l-warning"
            : "border-l-muted-foreground/40",
        selected && "ring-2 ring-foreground",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir pedido ${order.number} de ${order.customerName}`}
        className="flex flex-col gap-1.5 rounded-md text-left outline-none focus-visible:ring-1 focus-visible:ring-foreground"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-[15px]">
            <span className="tabular font-semibold">
              #{order.number}
            </span>{" "}
            {order.customerName}
          </span>
          <span
            className={cn(
              "tabular flex shrink-0 items-center gap-1 text-[13px]",
              late
                ? "font-semibold text-destructive"
                : "text-muted-foreground",
            )}
          >
            {late ? (
              <Clock aria-hidden className="size-3.5" />
            ) : null}
            {formatMinutes(
              minutesSince(order.createdAt, now),
            )}
            {late ? (
              <span className="sr-only"> (atrasado)</span>
            ) : null}
          </span>
        </span>
        <span className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
            <ModeIcon aria-hidden className="size-3.5" />
            <span className="text-foreground">
              {MODE_LABELS[order.mode]}
            </span>
            <span aria-hidden>·</span>
            {pluralize(order.itemCount, "item", "itens")}
            <span aria-hidden>·</span>
            {PAYMENT_LABELS[order.paymentMethod]}
          </span>
          <span className="tabular shrink-0 text-[15px] font-semibold text-foreground">
            {formatCurrency(order.total)}
          </span>
        </span>
        {caption ||
        order.isPaid ||
        order.status === "A_CAMINHO" ? (
          <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            {caption}
            {order.status === "A_CAMINHO" ? (
              <Badge variant="secondary">
                Saiu para entrega
              </Badge>
            ) : null}
            {order.isPaid ? (
              <Badge variant="success">Pago</Badge>
            ) : null}
          </span>
        ) : null}
      </button>
      {step ? (
        <Button
          variant={isNew ? "default" : "outline"}
          disabled={pending}
          onClick={onAdvance}
        >
          {pending ? "Salvando…" : step.label}
        </Button>
      ) : null}
    </article>
  );
}
