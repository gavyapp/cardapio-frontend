import { Suspense } from "react";
import { notFound } from "next/navigation";

import { CartProvider } from "@/components/providers/cart-provider";
import { findMenu } from "@/lib/data/menu";
import { redirectGuestToLogin } from "@/lib/panel/guest-redirect";
import { themeCss } from "@/lib/store/theme";

type Params = Promise<{ slug: string }>;

// Aplica o tema da loja (cor, fonte, cantos e modo claro ou escuro) como
// variáveis CSS no :root, enquanto a página da loja estiver aberta. Tudo
// herda --primary sem saber de qual loja é, inclusive o que abre em portal.
// Também abre o carrinho da loja, o mesmo no cardápio e no checkout.
async function StoreShell({
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

  const { store } = menu;

  return (
    <>
      <style>{themeCss(store.appearance)}</style>
      <CartProvider
        storeId={store.id}
        products={menu.categories.flatMap(
          (category) => category.products,
        )}
        rules={{
          minimumOrder: store.rules.minimumOrder,
          freeDeliveryAbove: store.rules.freeDeliveryAbove,
        }}
        canOrder={menu.status.isOpen}
        nextOpeningLabel={menu.status.nextOpeningLabel}
      >
        {children}
      </CartProvider>
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
      <StoreShell params={params}>{children}</StoreShell>
    </Suspense>
  );
}
