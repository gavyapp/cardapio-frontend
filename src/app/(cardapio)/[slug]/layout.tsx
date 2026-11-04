import { Suspense } from "react";
import { notFound } from "next/navigation";

import { findStoreBySlug } from "@/lib/data/store";
import { themeStyle } from "@/lib/store/theme";

type Params = Promise<{ slug: string }>;

// Aplica o tema da store (cor principal, fonte) como variáveis CSS.
// Tudo dentro herda --primary sem saber de qual store é.
async function StoreTheme({
  params,
  children,
}: {
  params: Params;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const store = await findStoreBySlug(slug);
  if (!store) notFound();

  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-background font-sans text-foreground"
      style={themeStyle(store.appearance)}
    >
      {children}
    </div>
  );
}

export default function StoreLayout({
  params,
  children,
}: {
  params: Params;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <StoreTheme params={params}>{children}</StoreTheme>
    </Suspense>
  );
}
