import type { Metadata } from "next";
import { Suspense } from "react";

import {
  PanelHeader,
  type HeaderStore,
} from "@/components/organisms/panel-header";
import { NoStoreNotice } from "@/components/organisms/no-store-notice";
import { Toaster } from "@/components/atoms/sonner";
import { findStoreBySlug } from "@/lib/data/store";
import {
  PANEL_ROUTE,
  requirePanelAccess,
} from "@/lib/panel-access";

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
    return (
      <>
        <PanelHeader store={null} onSignOut={signOut} />
        <NoStoreNotice
          email={access.user.email}
          signOutAction={signOut}
        />
      </>
    );
  }

  const store = await findStoreBySlug(access.store.slug);
  const headerStore: HeaderStore | null = store
    ? {
        slug: store.slug,
        name: store.name,
        primaryColor: store.appearance.primaryColor,
      }
    : null;

  return (
    <>
      <PanelHeader
        store={headerStore}
        onSignOut={signOut}
      />
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </>
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
