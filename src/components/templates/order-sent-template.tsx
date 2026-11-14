import { OrderStatusRefresher } from "@/components/molecules/order-status-refresher";
import { StoreSubpageHeader } from "@/components/molecules/store-subpage-header";
import { OrderSent } from "@/components/organisms/order-sent";
import {
  isFinalStatus,
  type TrackedOrder,
} from "@/lib/orders/tracking";

/**
 * Tela do pedido enviado: cabeçalho com a volta ao cardápio e o pedido com
 * as etapas. Enquanto o pedido está em andamento, a tela se atualiza
 * sozinha.
 */
export function OrderSentTemplate({
  order,
}: {
  order: TrackedOrder;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 lg:px-8">
      <StoreSubpageHeader storeName={order.store.name} />
      <main className="flex flex-1 flex-col">
        <OrderSent order={order} />
      </main>
      {isFinalStatus(order.status) ? null : (
        <OrderStatusRefresher />
      )}
    </div>
  );
}
