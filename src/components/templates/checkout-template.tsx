import { ArrowLeft } from "lucide-react";

import { BackToMenuLink } from "@/components/molecules/back-to-menu-link";
import { CheckoutForm } from "@/components/organisms/checkout-form";
import type { Menu } from "@/lib/data/menu";
import { formatFullAddress } from "@/lib/store/public-info";

/**
 * Checkout da loja: cabeçalho com a volta ao cardápio e o formulário do
 * pedido, com o resumo ao lado no computador.
 */
export function CheckoutTemplate({ menu }: { menu: Menu }) {
  const { store } = menu;
  const { rules } = store;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 lg:px-8">
      <header className="flex items-center gap-2 border-b py-2">
        <BackToMenuLink className="-ml-2 flex h-11 items-center gap-2 rounded-control px-2 text-support font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Cardápio
        </BackToMenuLink>
        <p className="ml-auto truncate text-support text-muted-foreground">
          {store.name}
        </p>
      </header>

      <main className="flex flex-1 flex-col">
        <CheckoutForm
          store={{ id: store.id, name: store.name }}
          rules={{
            deliveryFee: rules.deliveryFee,
            freeDeliveryAbove: rules.freeDeliveryAbove,
            paymentMethods: rules.paymentMethods,
            deliveryTimeMinutes: rules.deliveryTimeMinutes,
            pickupTimeMinutes: rules.pickupTimeMinutes,
          }}
          pickupAddress={formatFullAddress(store.address)}
        />
      </main>
    </div>
  );
}
