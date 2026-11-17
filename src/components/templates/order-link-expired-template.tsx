import { Clock3 } from "lucide-react";

import { buttonVariants } from "@/components/atoms/button";
import { BackToMenuLink } from "@/components/molecules/back-to-menu-link";
import { StoreSubpageHeader } from "@/components/molecules/store-subpage-header";
import { ORDER_LINK_VALID_HOURS } from "@/lib/orders/tracking";

/**
 * Link de acompanhamento vencido: o pedido encerrou há mais tempo que a
 * validade do link, e nenhum dado dele aparece.
 */
export function OrderLinkExpiredTemplate({
  storeName,
}: {
  storeName: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 lg:px-8">
      <StoreSubpageHeader storeName={storeName} />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <Clock3 className="size-7" />
        </span>
        <div className="flex max-w-sm flex-col gap-1">
          <h1 className="text-page-title font-semibold">
            Este link expirou
          </h1>
          <p className="text-body text-muted-foreground">
            O acompanhamento fica disponível por{" "}
            {ORDER_LINK_VALID_HOURS} horas depois que o
            pedido é encerrado. Se precisar de ajuda, fale
            com a loja.
          </p>
        </div>
        <BackToMenuLink
          className={buttonVariants({
            variant: "outline",
            size: "lg",
          })}
        >
          Voltar ao cardápio
        </BackToMenuLink>
      </main>
    </div>
  );
}
