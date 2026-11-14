import { Skeleton } from "@/components/atoms/skeleton";

function FieldSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

/**
 * Formulário do checkout enquanto carrega: os mesmos blocos do formulário
 * de verdade (recebimento, dados, endereço, pagamento e resumo), para a
 * tela não pular quando o conteúdo chega.
 */
export function CheckoutFormSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando o checkout"
      className="grid items-start gap-x-8 gap-y-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="flex min-w-0 flex-col gap-8">
        <Skeleton className="h-8 w-48" />

        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-56" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-28" />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-44" />
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <FieldSkeleton />
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-13" />
          <Skeleton className="h-13" />
          <Skeleton className="h-13" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-surface border bg-card p-4">
          <Skeleton className="h-5 w-40" />
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between gap-3 border-t pt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
