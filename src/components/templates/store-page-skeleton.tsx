"use client";

import { useSelectedLayoutSegment } from "next/navigation";

import { OrderSentPageSkeleton } from "@/components/templates/order-sent-page-skeleton";
import { CheckoutSkeleton } from "@/components/templates/checkout-skeleton";

/**
 * O que aparece enquanto os dados da loja carregam, conforme a página
 * aberta. O checkout e a tela do pedido têm tela de carregamento; no cardápio,
 * nada aparece até o conteúdo chegar.
 */
export function StorePageSkeleton() {
  const segment = useSelectedLayoutSegment();
  if (segment === "checkout") return <CheckoutSkeleton />;
  if (segment === "pedido")
    return <OrderSentPageSkeleton />;
  return null;
}
