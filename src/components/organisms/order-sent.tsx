import { Check } from "lucide-react";

import { buttonVariants } from "@/components/atoms/button";
import { BackToMenuLink } from "@/components/molecules/back-to-menu-link";
import type { CreatedOrder } from "@/lib/orders/create-order";
import { formatCurrency } from "@/lib/format";

/**
 * Confirmação de que o pedido chegou à loja, com o número e o total que o
 * servidor gravou.
 */
export function OrderSent({
  storeName,
  order,
}: {
  storeName: string;
  order: CreatedOrder;
}) {
  return (
    <section
      aria-labelledby="pedido-enviado-titulo"
      className="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-12 text-center"
    >
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success"
      >
        <Check className="size-7" />
      </span>
      <div className="flex flex-col gap-1">
        <h1
          id="pedido-enviado-titulo"
          tabIndex={-1}
          className="text-page-title font-semibold outline-none"
        >
          Pedido enviado
        </h1>
        <p className="text-body text-muted-foreground">
          Pedido{" "}
          <strong className="tabular font-semibold text-foreground">
            #{order.number}
          </strong>{" "}
          · {storeName}
        </p>
      </div>
      <dl className="flex w-full items-baseline justify-between rounded-control bg-muted px-4 py-3 text-body font-semibold">
        <dt>Total</dt>
        <dd className="tabular">
          {formatCurrency(order.total)}
        </dd>
      </dl>
      <p className="text-support text-muted-foreground">
        A loja já recebeu seu pedido. O pagamento é feito na
        entrega ou na retirada.
      </p>
      <BackToMenuLink
        className={buttonVariants({
          variant: "outline",
          size: "lg",
        })}
      >
        Voltar ao cardápio
      </BackToMenuLink>
    </section>
  );
}
