import type { ReactNode } from "react";

/**
 * Páginas do catálogo no painel (produtos, categorias, complementos): título
 * com resumo e ação principal à direita, explicação curta e o conteúdo.
 */
export function CatalogPageTemplate({
  title,
  summary,
  description,
  action,
  children,
}: {
  title: string;
  summary?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {summary ? (
            <p className="tabular text-[15px] text-muted-foreground">
              {summary}
            </p>
          ) : null}
        </div>
        {action}
      </header>
      {description ? (
        <p className="max-w-2xl text-[13px] text-muted-foreground">
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      <div className="flex flex-col gap-2" aria-hidden>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
