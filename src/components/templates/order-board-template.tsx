import type { ReactNode } from "react";

/**
 * Página do quadro de pedidos, no mesmo esqueleto das páginas do catálogo:
 * título à esquerda, busca à direita e o quadro na largura toda. No
 * computador o título e o quadro ocupam a primeira tela inteira (cada coluna
 * rola sozinha) e `below` só aparece quando a página rola para baixo.
 */
export function OrderBoardTemplate({
  title,
  action,
  children,
  below,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  below?: ReactNode;
}) {
  // No computador o <main> do painel vira a área que rola nesta página (veja
  // o layout), com a altura da tela menos o cabeçalho: h-full no primeiro
  // bloco ocupa exatamente essa altura. O piso evita colunas espremidas.
  return (
    <>
      <div
        data-fill-viewport
        className="flex w-full flex-col gap-4 px-4 pt-4 pb-4 sm:px-6 sm:pt-6 lg:h-full lg:min-h-[560px] lg:shrink-0 lg:pb-6"
      >
        <header className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h1 className="flex min-w-0 items-baseline gap-2 text-title leading-tight font-semibold">
            {title}
          </h1>
          {action}
        </header>
        {children}
      </div>
      {below ? (
        <div className="w-full px-4 pb-12 sm:px-6">
          {below}
        </div>
      ) : null}
    </>
  );
}
