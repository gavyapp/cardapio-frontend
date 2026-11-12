import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckoutTemplate } from "@/components/templates/checkout-template";
import { findMenu } from "@/lib/data/menu";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const menu = await findMenu(slug);
  if (!menu) return {};
  return {
    title: {
      absolute: `Finalizar pedido · ${menu.store.name}`,
    },
    // Página de formulário: não é para aparecer em busca.
    robots: { index: false },
  };
}

async function CheckoutContent({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const menu = await findMenu(slug);
  // Loja inexistente já foi tratada pelo layout.
  if (!menu) return null;
  return <CheckoutTemplate menu={menu} />;
}

export default function CheckoutPage({
  params,
}: {
  params: Params;
}) {
  return (
    <Suspense fallback={null}>
      <CheckoutContent params={params} />
    </Suspense>
  );
}
