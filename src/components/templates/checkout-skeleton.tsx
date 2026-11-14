import { StoreSubpageHeaderSkeleton } from "@/components/molecules/store-subpage-header-skeleton";
import { CheckoutFormSkeleton } from "@/components/organisms/checkout-form-skeleton";

/**
 * Página do checkout enquanto os dados da loja carregam: o mesmo esqueleto
 * do CheckoutTemplate, com blocos no lugar do cabeçalho e do formulário.
 */
export function CheckoutSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 lg:px-8">
      <StoreSubpageHeaderSkeleton />
      <main className="flex flex-1 flex-col">
        <CheckoutFormSkeleton />
      </main>
    </div>
  );
}
