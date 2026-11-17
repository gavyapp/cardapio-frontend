import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { OrderSentPageSkeleton } from "@/components/templates/order-sent-page-skeleton";
import { OrderSentTemplate } from "@/components/templates/order-sent-template";
import { OrderLinkExpiredTemplate } from "@/components/templates/order-link-expired-template";
import { findMenu } from "@/lib/data/menu";
import { findTrackedOrder } from "@/lib/data/order-tracking";

type Params = Promise<{ slug: string; token: string }>;

export const metadata: Metadata = {
  title: { absolute: "Seu pedido" },
  // O link é só de quem fez o pedido: não é para aparecer em busca.
  robots: { index: false, follow: false },
};

async function OrderContent({
  params,
}: {
  params: Params;
}) {
  const { slug, token } = await params;
  const lookup = await findTrackedOrder(token);

  if (lookup.state === "expired") {
    // A loja já foi carregada pelo layout: a consulta é a mesma.
    const menu = await findMenu(slug);
    if (!menu) notFound();
    return (
      <OrderLinkExpiredTemplate
        storeName={menu.store.name}
      />
    );
  }
  // Pedido de outra loja não abre pelo endereço desta.
  if (
    lookup.state !== "found" ||
    lookup.order.store.slug !== slug
  ) {
    notFound();
  }
  return <OrderSentTemplate order={lookup.order} />;
}

export default function OrderPage({
  params,
}: {
  params: Params;
}) {
  return (
    <Suspense fallback={<OrderSentPageSkeleton />}>
      <OrderContent params={params} />
    </Suspense>
  );
}
