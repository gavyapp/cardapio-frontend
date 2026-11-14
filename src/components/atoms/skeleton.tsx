import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Bloco cinza pulsante que ocupa o lugar de um conteúdo ainda carregando.
 * O tamanho e o formato vêm de `className` (`h-11 w-full`, `rounded-full`…).
 * É decorativo: quem monta a tela de carregamento dá o aviso para leitor de
 * tela no elemento em volta.
 */
function Skeleton({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        // Cor translúcida a partir do texto: aparece sobre qualquer fundo
        // (página, cartão, tema claro ou escuro), o que bg-muted não faz.
        "rounded-control bg-foreground/10 motion-safe:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
