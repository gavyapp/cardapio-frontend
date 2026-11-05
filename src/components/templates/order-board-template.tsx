import type { ReactNode } from "react";

/**
 * Página do quadro de pedidos, no mesmo esqueleto das páginas do catálogo:
 * título à esquerda, busca à direita e o quadro na largura toda. No computador
 * ocupa só a altura da tela, para cada coluna rolar sozinha.
 */
export function OrderBoardTemplate({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-fill-viewport
      className="flex w-full flex-col gap-4 px-4 pt-4 pb-12 sm:px-6 sm:pt-6 lg:min-h-0 lg:flex-1 lg:pb-6"
    >
      <header className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1 className="flex min-w-0 items-baseline gap-2 text-2xl leading-tight font-semibold">
          {title}
        </h1>
        {action}
      </header>
      {children}
    </div>
  );
}
