"use client";

import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { formatCurrency } from "@/lib/format";
import type {
  OrderDetailComplement,
  OrderDetailItem,
} from "@/lib/orders/detail";

export type AvailabilityTarget = {
  kind: "product" | "complement";
  id: string;
  name: string;
  isAvailable: boolean;
};

/**
 * Itens do pedido no detalhe, como no protótipo: quantidade, nome e preço;
 * escolhas dos grupos obrigatórios numa linha ("Zero · Ao ponto") e cada
 * adicional com "+"; observação do item em destaque. O "…" de cada item esgota ou volta
 * o produto e os complementos escolhidos no cardápio, como no protótipo.
 */
export function OrderItems({
  items,
  onToggleAvailability,
}: {
  items: OrderDetailItem[];
  onToggleAvailability: (
    target: AvailabilityTarget,
  ) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <OrderItemRow
          key={item.id}
          item={item}
          onToggleAvailability={onToggleAvailability}
        />
      ))}
    </ul>
  );
}

function OrderItemRow({
  item,
  onToggleAvailability,
}: {
  item: OrderDetailItem;
  onToggleAvailability: (
    target: AvailabilityTarget,
  ) => void;
}) {
  const soldOut =
    item.menuItem !== null && !item.menuItem.isAvailable;
  const targets = availabilityTargets(item);
  const choices = item.complements
    .filter((complement) => complement.isChoice)
    .map(complementLabel);
  const extras = item.complements
    .filter((complement) => !complement.isChoice)
    .map(complementLabel);

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-start gap-2 text-body leading-[1.3]">
        <span className="tabular min-w-8 font-semibold">
          {item.quantity}×
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">{item.name}</span>
          {soldOut ? (
            <span className="text-caption font-semibold text-destructive">
              Esgotado no cardápio
            </span>
          ) : null}
        </div>
        <span className="tabular text-support whitespace-nowrap text-muted-foreground">
          {formatCurrency(item.total)}
        </span>
        {targets.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Esgotar ou disponibilizar ${item.name} no cardápio`}
              title="Esgotar no cardápio"
              className="-my-[7px] -mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground aria-expanded:bg-muted"
            >
              <MoreHorizontal
                aria-hidden
                className="size-4"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64"
            >
              {targets.map((target) => (
                <DropdownMenuItem
                  key={`${target.kind}-${target.id}`}
                  onClick={() =>
                    onToggleAvailability(target)
                  }
                  className="min-h-11 gap-3"
                >
                  <span className="min-w-0 flex-1">
                    {target.isAvailable
                      ? "Esgotar"
                      : "Disponibilizar"}{" "}
                    {target.kind === "complement"
                      ? "+ "
                      : ""}
                    {target.name}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {target.kind === "product"
                      ? "Produto"
                      : "Complemento"}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {choices.length > 0 || extras.length > 0 ? (
        <div className="flex flex-col pl-10 text-support leading-[1.35] text-muted-foreground">
          {choices.length > 0 ? (
            <span>{choices.join(" · ")}</span>
          ) : null}
          {extras.map((extra) => (
            <span key={extra}>+ {extra}</span>
          ))}
        </div>
      ) : null}
      {item.notes ? (
        <p className="mt-1 ml-10 rounded-control bg-warning-soft px-3 py-2 text-support leading-[1.4] font-medium text-warning-foreground">
          Obs.: {item.notes}
        </p>
      ) : null}
    </li>
  );
}

/** "Bacon" ou "2× Bacon". */
function complementLabel(
  complement: OrderDetailComplement,
): string {
  return complement.quantity > 1
    ? `${complement.quantity}× ${complement.name}`
    : complement.name;
}

/** Produto e complementos do item que ainda existem no cardápio. */
function availabilityTargets(
  item: OrderDetailItem,
): AvailabilityTarget[] {
  const targets: AvailabilityTarget[] = [];
  if (item.menuItem) {
    targets.push({
      kind: "product",
      id: item.menuItem.id,
      name: item.name,
      isAvailable: item.menuItem.isAvailable,
    });
  }
  for (const complement of item.complements) {
    if (!complement.menuItem) continue;
    targets.push({
      kind: "complement",
      id: complement.menuItem.id,
      name: complement.name,
      isAvailable: complement.menuItem.isAvailable,
    });
  }
  return targets;
}
