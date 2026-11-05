import type { Metadata } from "next";
import { Suspense } from "react";

import {
  PanelHeader,
  type HeaderStore,
} from "@/components/organisms/panel-header";
import { LiveOrdersProvider } from "@/components/organisms/live-orders-provider";
import { NoStoreNotice } from "@/components/organisms/no-store-notice";
import { Toaster } from "@/components/atoms/sonner";
import { countCatalog } from "@/lib/data/catalog-counts";
import { findOrderAlerts } from "@/lib/data/order-alerts";
import { loadBoard } from "@/lib/data/orders";
import { findStoreBySlug } from "@/lib/data/store";
import {
  PANEL_ROUTE,
  requirePanelAccess,
} from "@/lib/panel/access";

import { signOut } from "./actions";

export const metadata: Metadata = { title: "Painel" };

// Sessão e loja vêm dos cookies, então só existem na hora da requisição.
// Sem sessão, requirePanelAccess manda para o login.
async function PanelWithAccess({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requirePanelAccess(PANEL_ROUTE);

  if (access.status === "no-store") {
    // Sem loja, o menu e as abas do painel não levam a nada.
    return (
      <NoStoreNotice
        email={access.user.email}
        signOutAction={signOut}
      />
    );
  }

  const [store, catalogCounts, board, orderAlerts] =
    await Promise.all([
      findStoreBySlug(access.store.slug),
      countCatalog(access.store.id),
      loadBoard(access.store.id),
      findOrderAlerts(access.store.id),
    ]);
  const headerStore: HeaderStore | null = store
    ? {
        slug: store.slug,
        name: store.name,
        primaryColor: store.appearance.primaryColor,
      }
    : null;

  // Pedidos, alarme e contador valem no painel todo, não só no quadro.
  return (
    <LiveOrdersProvider
      storeId={access.store.id}
      storeName={store?.name ?? access.store.name}
      initialBoard={board}
      initialAlerts={orderAlerts}
      renderedAt={board.fetchedAt}
    >
      <PanelHeader
        store={headerStore}
        catalogCounts={catalogCounts}
        onSignOut={signOut}
      />
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </LiveOrdersProvider>
  );
}

export default function PanelLayout({
  children,
}: LayoutProps<"/painel">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense fallback={<PanelHeader store={null} />}>
        <PanelWithAccess>{children}</PanelWithAccess>
      </Suspense>
      <Toaster position="bottom-center" />
    </div>
  );
}
