import { StoreSubpageHeaderSkeleton } from "@/components/molecules/store-subpage-header-skeleton";
import { OrderSentSkeleton } from "@/components/organisms/order-sent-skeleton";

/**
 * Página do pedido enquanto ele carrega: o mesmo esqueleto do
 * OrderSentTemplate, com blocos no lugar do cabeçalho e do pedido.
 */
export function OrderSentPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 lg:px-8">
      <StoreSubpageHeaderSkeleton />
      <main className="flex flex-1 flex-col">
        <OrderSentSkeleton />
      </main>
    </div>
  );
}
