import type { ReactNode } from "react";

/**
 * Cabeçalho das páginas do painel, igual em todas: título de 24px (com a
 * contagem ao lado, quando houver), busca e ação principal à direita. No
 * celular a ação fica na linha do título e a busca desce para a linha de
 * baixo, na largura toda.
 */
export function PageHeader({
  title,
  count,
  search,
  action,
}: {
  title: ReactNode;
  /** Aparece entre parênteses ao lado do título. */
  count?: number;
  search?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-3">
      <h1 className="mr-auto flex min-w-0 items-baseline gap-2 text-title leading-[1.2] font-semibold">
        {title}
        {count === undefined ? null : (
          <PageHeaderCount>{count}</PageHeaderCount>
        )}
      </h1>
      {search ? (
        <div className="order-last w-full sm:order-none sm:w-auto">
          {search}
        </div>
      ) : null}
      {action ? (
        <div className="flex shrink-0 items-center gap-2">
          {action}
        </div>
      ) : null}
    </header>
  );
}

/** Contagem ao lado do título, para quando ela é calculada no navegador. */
export function PageHeaderCount({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="tabular font-normal text-muted-foreground">
      ({children})
    </span>
  );
}
