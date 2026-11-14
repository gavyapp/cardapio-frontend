import { ArrowLeft } from "lucide-react";

import { BackToMenuLink } from "@/components/molecules/back-to-menu-link";

/**
 * Cabeçalho das páginas abaixo do cardápio (checkout, pedido enviado): a
 * volta ao cardápio e o nome da loja.
 */
export function StoreSubpageHeader({
  storeName,
}: {
  storeName: string;
}) {
  return (
    <header className="flex items-center gap-2 border-b py-2">
      <BackToMenuLink className="-ml-2 flex h-11 items-center gap-2 rounded-control px-2 text-support font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground">
        <ArrowLeft aria-hidden className="size-4" />
        Cardápio
      </BackToMenuLink>
      <p className="ml-auto truncate text-support text-muted-foreground">
        {storeName}
      </p>
    </header>
  );
}
