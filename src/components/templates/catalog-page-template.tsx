import type { ReactNode } from "react";

/**
 * Páginas do catálogo no painel (produtos e complementos): título com a
 * contagem ao lado, ação principal à direita e o conteúdo centralizado em até 1200px.
 */
export function CatalogPageTemplate({
  title,
  count,
  description,
  action,
  children,
}: {
  title: string;
  /** Aparece entre parênteses ao lado do título. */
  count?: number;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
      <header className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1 className="flex min-w-0 items-baseline gap-2 text-2xl leading-tight font-semibold">
          {title}
          {count === undefined ? null : (
            <span className="tabular font-normal text-muted-foreground">
              ({count})
            </span>
          )}
        </h1>
        {action}
      </header>
      {description ? (
        <p className="text-[13px] text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** Esqueleto enquanto os dados da página carregam. */
export function CatalogPageSkeleton({
  title,
}: {
  title: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
      <h1 className="flex min-h-11 items-center text-2xl leading-tight font-semibold">
        {title}
      </h1>
      <div className="flex flex-col gap-4" aria-hidden>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-lg border bg-card"
          />
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
