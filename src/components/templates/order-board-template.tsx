import type { ReactNode } from "react";

import { PageHeader } from "@/components/molecules/page-header";

/**
 * Página do quadro de pedidos, no mesmo esqueleto das páginas do catálogo:
 * cabeçalho padrão com a busca e o quadro na largura toda. No
 * computador o título e o quadro ocupam a primeira tela inteira (cada coluna
 * rola sozinha) e `below` só aparece quando a página rola para baixo.
 */
export function OrderBoardTemplate({
  title,
  search,
  children,
  below,
}: {
  title: ReactNode;
  search?: ReactNode;
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
        <PageHeader title={title} search={search} />
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
