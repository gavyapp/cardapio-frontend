import { StoreSubpageHeader } from "@/components/molecules/store-subpage-header";
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
      <StoreSubpageHeader storeName={store.name} />

      <main className="flex flex-1 flex-col">
        <CheckoutForm
          store={{ id: store.id, name: store.name }}
          rules={{
            deliveryFee: rules.deliveryFee,
            deliveryZones: rules.deliveryZones,
            freeDeliveryAbove: rules.freeDeliveryAbove,
            orderDiscounts: rules.orderDiscounts,
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
