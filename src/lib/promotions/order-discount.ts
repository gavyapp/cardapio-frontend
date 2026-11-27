// Promoções que valem sobre o pedido inteiro: entrega grátis e desconto no
// pedido. Mesma regra do create_order (ADR 0006): o subtotal já vem com o
// desconto dos produtos e não inclui a taxa de entrega. Puro, sem React.

import { formatCurrency } from "@/lib/format";

/** Desconto no pedido vigente agora, como o live_promotions devolve. */
export type OrderDiscount = {
  id: string;
  name: string;
  minSubtotal: number;
  mode: "percent" | "amount_off";
  value: number;
};

/** O que vale sobre o pedido inteiro na loja, agora. */
export type OrderPromotionRules = {
  /** Mínimo da entrega grátis vigente. Null: sem entrega grátis. */
  freeDeliveryAbove: number | null;
  /** Descontos no pedido vigentes, do criado primeiro ao último. */
  orderDiscounts: readonly OrderDiscount[];
};

/** Desconto no pedido que o subtotal alcançou e quanto ele vale. */
export type AppliedOrderDiscount = {
  id: string;
  name: string;
  minSubtotal: number;
  amount: number;
};

/** Desconto de uma promoção no subtotal; 0 se não alcança o mínimo. */
export function orderDiscountAmount(
  discount: OrderDiscount,
  subtotal: number,
): number {
  if (subtotal < discount.minSubtotal) return 0;
  if (discount.mode === "amount_off") {
    return Math.min(discount.value, subtotal);
  }
  // Em centavos, arredondando meio para cima como o round do banco.
  const cents = Math.round(subtotal * 100);
  const discountCents = Math.round(
    Math.round(cents * discount.value * 100) / 10000,
  );
  return discountCents / 100;
}

/**
 * Desconto que o pedido leva: o maior entre os que o subtotal alcança;
 * empate, o criado primeiro. Null quando nenhum vale.
 */
export function bestOrderDiscount(
  subtotal: number,
  discounts: readonly OrderDiscount[],
): AppliedOrderDiscount | null {
  let best: AppliedOrderDiscount | null = null;
  for (const discount of discounts) {
    const amount = orderDiscountAmount(discount, subtotal);
    if (amount > 0 && (!best || amount > best.amount)) {
      best = {
        id: discount.id,
        name: discount.name,
        minSubtotal: discount.minSubtotal,
        amount,
      };
    }
  }
  return best;
}

/**
 * Rótulo da linha que soma o que as promoções dos produtos tiraram, no
 * carrinho, no checkout e no pedido enviado. Fica logo abaixo do subtotal,
 * que nessas telas aparece sem essas promoções.
 */
export const ITEM_SAVINGS_LABEL = "Promoções nos itens";

/**
 * Rótulo da linha do desconto no carrinho e no checkout, como no protótipo:
 * "Desconto (pedidos acima de R$ 80,00)"; sem mínimo, só "Desconto".
 */
export function orderDiscountLabel(
  minSubtotal: number,
): string {
  return minSubtotal > 0
    ? `Desconto (pedidos acima de ${formatCurrency(minSubtotal)})`
    : "Desconto";
}
