import type { Metadata } from "next";
import { Suspense } from "react";

import {
  PanelHeader,
  type HeaderStore,
} from "@/components/organisms/panel-header";
import { Toaster } from "@/components/atoms/sonner";
import { findStoreBySlug } from "@/lib/data/store";

export const metadata: Metadata = { title: "Painel" };

// Até o login entrar, o painel mostra a loja do seed.
const DEMO_STORE_SLUG = "stack-burguer";

async function HeaderWithStore() {
  const store = await findStoreBySlug(DEMO_STORE_SLUG);
  const headerStore: HeaderStore | null = store
    ? {
        slug: store.slug,
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
      <Toaster position="bottom-center" />
    </div>
  );
}
