"use client";

import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { closingKind } from "@/lib/orders/detail";
import type { OrderStatus } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

/**
 * Menu "…" do pedido, no card do quadro e no rodapé do detalhe: marcar ou
 * desmarcar como pago (em qualquer status) e recusar (pedido novo) ou
 * cancelar (já aceito).
 */
export function OrderActionsMenu({
  orderNumber,
  status,
  isPaid,
  disabled = false,
  onTogglePaid,
  onCloseOrder,
  className,
}: {
  orderNumber: number;
  status: OrderStatus;
  isPaid: boolean;
  disabled?: boolean;
  onTogglePaid: () => void;
  /** Abre o diálogo de recusar ou cancelar. */
  onCloseOrder: () => void;
  className?: string;
}) {
  const closing = closingKind(status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`Mais ações do pedido ${orderNumber}`}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-control border bg-card text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1 disabled:opacity-60 aria-expanded:bg-muted",
          className,
        )}
      >
        <MoreHorizontal aria-hidden className="size-4.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem onClick={onTogglePaid}>
          {isPaid
            ? "Desmarcar como pago"
            : "Marcar como pago"}
        </DropdownMenuItem>
        {closing ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={onCloseOrder}
            >
              {closing === "reject"
                ? "Recusar pedido"
                : "Cancelar pedido"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
