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
 * Itens do pedido no detalhe: quantidade, nome e preço; complementos por
 * grupo; observação do item em destaque. O "…" de cada item esgota ou volta
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
    <ul className="flex flex-col gap-4">
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

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-start gap-2 text-[15px] leading-snug">
        <span className="tabular min-w-8 font-semibold">
          {item.quantity}×
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">{item.name}</span>
          {soldOut ? (
            <span className="text-xs font-semibold text-destructive">
              Esgotado no cardápio
            </span>
          ) : null}
        </div>
        <span className="tabular whitespace-nowrap">
          {formatCurrency(item.total)}
        </span>
        {targets.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Esgotar ou disponibilizar ${item.name} no cardápio`}
              className="-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground aria-expanded:bg-muted"
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
                  className="flex flex-col items-start gap-0"
                >
                  <span>
                    {target.isAvailable
                      ? "Esgotar"
                      : "Disponibilizar"}{" "}
                    {target.kind === "complement"
                      ? "+ "
                      : ""}
                    {target.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
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
      <div className="flex flex-col gap-0.5 pl-10 text-[13px] text-muted-foreground">
        {groupComplements(item.complements).map(
          ([group, names]) => (
            <span key={group}>
              {group}: {names}
            </span>
          ),
        )}
      </div>
      {item.notes ? (
        <p className="ml-10 rounded-[4px] bg-warning-soft px-2.5 py-1.5 text-[13px] font-medium text-warning-foreground">
          Obs.: {item.notes}
        </p>
      ) : null}
    </li>
  );
}

/** "Adicionais" → "Bacon, 2× Cheddar", na ordem em que vieram. */
function groupComplements(
  complements: OrderDetailComplement[],
): [string, string][] {
  const groups = new Map<string, string[]>();
  for (const complement of complements) {
    const label =
      complement.quantity > 1
        ? `${complement.quantity}× ${complement.name}`
        : complement.name;
    groups.set(complement.groupName, [
      ...(groups.get(complement.groupName) ?? []),
      label,
    ]);
  }
  return [...groups].map(([group, names]) => [
    group,
    names.join(", "),
  ]);
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
