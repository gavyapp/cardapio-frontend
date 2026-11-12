import type { Metadata } from "next";
import { Suspense } from "react";

import { MenuTemplate } from "@/components/templates/menu-template";
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
    // Título próprio da loja, sem o sufixo da plataforma.
    title: { absolute: `${menu.store.name} · Cardápio` },
    description:
      menu.store.appearance.welcome ??
      `Cardápio da ${menu.store.name}. Peça pelo celular.`,
  };
}

async function MenuContent({ params }: { params: Params }) {
  const { slug } = await params;
  const menu = await findMenu(slug);
  // Loja inexistente já foi tratada pelo layout.
  if (!menu) return null;
  return <MenuTemplate menu={menu} />;
}

export default function MenuPage({
  params,
}: {
  params: Params;
}) {
  return (
    <Suspense fallback={null}>
      <MenuContent params={params} />
    </Suspense>
  );
}
