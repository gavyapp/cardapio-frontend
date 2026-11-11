import { Suspense } from "react";
import { notFound } from "next/navigation";

import { findMenu } from "@/lib/data/menu";
import { redirectGuestToLogin } from "@/lib/panel/guest-redirect";
import { themeCss } from "@/lib/store/theme";

type Params = Promise<{ slug: string }>;

// Aplica o tema da loja (cor, fonte, cantos e modo claro ou escuro) como
// variáveis CSS no :root, enquanto a página da loja estiver aberta. Tudo
// herda --primary sem saber de qual loja é, inclusive o que abre em portal.
async function StoreTheme({
  params,
  children,
}: {
  params: Params;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const menu = await findMenu(slug);
  if (!menu) {
    // Caminho que não é loja: visitante vai para o login; logado vê o 404.
    await redirectGuestToLogin();
    notFound();
  }

  return (
    <>
      <style>{themeCss(menu.store.appearance)}</style>
      {children}
    </>
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
