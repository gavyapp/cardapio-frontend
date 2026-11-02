import type { Metadata } from "next";
import { Suspense } from "react";

import {
  PanelHeader,
  type HeaderStore,
} from "./_components/panel-header";
import { findStoreBySlug } from "@/lib/data/store";

export const metadata: Metadata = { title: "Painel" };

// Até o login entrar, o painel mostra a loja do seed.
const DEMO_STORE_SLUG = "stack-burguer";

async function HeaderWithStore() {
  const store = await findStoreBySlug(DEMO_STORE_SLUG);
  const headerStore: HeaderStore | null = store
    ? {
        name: store.name,
        primaryColor: store.appearance.primaryColor,
      }
    : null;
  return <PanelHeader store={headerStore} />;
}

export default function PanelLayout({
  children,
}: LayoutProps<"/painel">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense fallback={<PanelHeader store={null} />}>
        <HeaderWithStore />
      </Suspense>
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
