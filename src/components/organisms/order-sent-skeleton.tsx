import { Skeleton } from "@/components/atoms/skeleton";

function RowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

/**
 * Tela do pedido enquanto carrega: os mesmos blocos da tela de verdade
 * (status, etapas, resumo, recebimento e os botões), para ela não pular
 * quando o pedido chega.
 */
export function OrderSentSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando o pedido"
      className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-surface border bg-card p-4">
        <Skeleton className="h-5 w-48" />
        <div className="flex flex-col gap-3">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-surface border bg-card p-4">
        <Skeleton className="h-5 w-40" />
        <RowSkeleton />
        <div className="flex flex-col gap-2 border-t pt-4">
          <RowSkeleton />
          <div className="flex justify-between gap-3 border-t pt-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-surface border bg-card p-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
