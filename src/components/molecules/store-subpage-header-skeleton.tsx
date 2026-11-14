import { Skeleton } from "@/components/atoms/skeleton";

/** Cabeçalho das páginas abaixo do cardápio enquanto a loja carrega. */
export function StoreSubpageHeaderSkeleton() {
  return (
    <div className="flex h-15 items-center justify-between gap-2 border-b">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}
