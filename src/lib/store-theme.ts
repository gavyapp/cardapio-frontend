// Tema da loja em variáveis CSS. O layout do cardápio aplica o resultado
// como style no elemento raiz da loja; botões, abas e destaques seguem
// --primary sem saber de onde a cor veio.
import type { CSSProperties } from "react";

import { textColorOn, normalizeHex } from "@/lib/color";

export type StoreFont =
  "moderna" | "classica" | "arredondada" | "elegante";

export type StoreAppearance = {
  primaryColor: string;
  mode: "light" | "dark";
  layout: "lista" | "grade";
  font: StoreFont;
  welcome: string | null;
};

/** Padrão quando a loja não configurou nada: o visual atual do layout. */
export const DEFAULT_APPEARANCE: StoreAppearance = {
  primaryColor: "#16191d",
  mode: "light",
  layout: "lista",
  font: "moderna",
  welcome: null,
};

// Por enquanto só a Figtree é carregada (src/app/layout.tsx). As outras
// opções caem nela até a edição de aparência entrar.
const FONTS: Record<StoreFont, string> = {
  moderna: "var(--font-figtree)",
  classica: "var(--font-figtree)",
  arredondada: "var(--font-figtree)",
  elegante: "var(--font-figtree)",
};

/** Variáveis CSS do tema, prontas para o atributo style. */
export function themeStyle(
  appearance: Pick<
    StoreAppearance,
    "primaryColor" | "font"
  >,
): CSSProperties {
  const primary =
    normalizeHex(appearance.primaryColor) ??
    DEFAULT_APPEARANCE.primaryColor;

  return {
    "--primary": primary,
    "--primary-foreground": textColorOn(primary),
    "--ring": primary,
    "--font-sans": `${FONTS[appearance.font]}, ui-sans-serif, system-ui, sans-serif`,
    // O cardápio do cliente é sobre fundo branco; o cinza é do painel.
    "--background": "#ffffff",
  } as CSSProperties;
}
