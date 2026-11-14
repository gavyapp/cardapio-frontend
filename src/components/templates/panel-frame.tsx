"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";

// Página do painel que ocupa a primeira tela inteira no computador.
const FILL_VIEWPORT_SEGMENT = "pedidos";

/**
 * Moldura do painel. No quadro de pedidos, no computador, ela tem a altura
 * exata da tela e é o <main> que rola (veja o layout); nas outras páginas
 * a tela rola normalmente.
 *
 * Quem decide é a rota aberta, não o que está montado: o Next mantém a
 * página anterior escondida no DOM, então o quadro continua lá depois de
 * sair dele.
 */
export function PanelFrame({
  children,
}: {
  children: ReactNode;
}) {
  const fillsViewport =
    useSelectedLayoutSegment() === FILL_VIEWPORT_SEGMENT;

  return (
    <div
      data-fill-viewport={fillsViewport ? "" : undefined}
      className="group/panel flex min-h-full flex-1 flex-col lg:data-fill-viewport:h-dvh lg:data-fill-viewport:flex-none"
    >
      {children}
    </div>
  );
}
