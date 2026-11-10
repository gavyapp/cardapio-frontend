import type { ReactNode } from "react";

import { PageHeader } from "@/components/molecules/page-header";

/**
 * Páginas do catálogo no painel (produtos e complementos): cabeçalho padrão
 * e o conteúdo na largura toda, como as outras páginas do painel.
 */
export function CatalogPageTemplate({
  title,
  count,
  description,
  search,
  action,
  children,
}: {
  title: string;
  /** Aparece entre parênteses ao lado do título. */
  count?: number;
  description?: ReactNode;
  search?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-4 px-page pt-4 pb-12 sm:pt-6">
      <PageHeader
        title={title}
        count={count}
        search={search}
        action={action}
      />
      {description ? (
        <p className="text-support text-muted-foreground">
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
    <div className="flex w-full flex-col gap-4 px-page pt-4 pb-12 sm:pt-6">
      <PageHeader title={title} />
      <div className="flex flex-col gap-4" aria-hidden>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-surface border bg-card"
          />
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
