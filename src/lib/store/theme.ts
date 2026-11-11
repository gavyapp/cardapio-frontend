// Tema da loja em variáveis CSS. O layout do cardápio aplica o resultado
// no :root da página da loja (themeCss); botões, abas e destaques seguem
// --primary sem saber de onde a cor veio.
import type { CSSProperties } from "react";

import {
  contrastRatio,
  mixHex,
  normalizeHex,
  textColorOn,
} from "@/lib/store/color";

export type StoreFont =
  "moderna" | "classica" | "arredondada" | "elegante";

export type StoreAppearance = {
  primaryColor: string;
  mode: "light" | "dark";
  layout: "lista" | "grade";
  font: StoreFont;
  welcome: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
};

/** Cores sugeridas no painel, como no protótipo. */
export const THEME_PALETTE = [
  "#650000",
  "#FF441B",
  "#FF9D18",
  "#1F6F5C",
  "#2D5BD3",
  "#16191D",
] as const;

/** Padrão quando a loja não configurou nada: o visual atual do layout. */
export const DEFAULT_APPEARANCE: StoreAppearance = {
  primaryColor: "#16191d",
  mode: "light",
  layout: "lista",
  font: "moderna",
  welcome: null,
  logoUrl: null,
  coverUrl: null,
};

// Por enquanto só a Figtree é carregada (src/app/layout.tsx). As outras
// opções caem nela até a edição de aparência entrar.
const FONTS: Record<StoreFont, string> = {
  moderna: "var(--font-figtree)",
  classica: "var(--font-figtree)",
  arredondada: "var(--font-figtree)",
  elegante: "var(--font-figtree)",
};

// Neutros do cardápio do cliente no protótipo, um pouco diferentes dos do
// painel: fundo branco, texto quase preto e bordas mais leves.
const NEUTRALS = {
  light: {
    "--background": "#ffffff",
    "--foreground": "#18181b",
    "--card": "#ffffff",
    "--card-foreground": "#18181b",
    "--popover": "#ffffff",
    "--popover-foreground": "#18181b",
    "--muted": "#f3f3f5",
    "--muted-foreground": "#5f5f68",
    "--gray-medium": "#8e8e96",
    "--secondary": "#f3f3f5",
    "--secondary-foreground": "#18181b",
    "--accent": "#f3f3f5",
    "--accent-foreground": "#18181b",
    "--border": "#e5e5e9",
    "--border-strong": "#d4d4da",
    "--input": "#e5e5e9",
    "--success": "#177a3d",
    "--success-soft": "#e4f4ea",
    "--destructive": "#b42318",
    "--destructive-soft": "#fdecea",
    "--shadow-elevated":
      "0 1px 2px rgb(24 24 27 / 6%), 0 8px 24px rgb(24 24 27 / 10%)",
  },
  dark: {
    "--background": "#111113",
    "--foreground": "#f4f4f5",
    "--card": "#1a1a1d",
    "--card-foreground": "#f4f4f5",
    "--popover": "#1a1a1d",
    "--popover-foreground": "#f4f4f5",
    "--muted": "#26262a",
    "--muted-foreground": "#a6a6ae",
    "--gray-medium": "#8e8e96",
    "--secondary": "#26262a",
    "--secondary-foreground": "#f4f4f5",
    "--accent": "#26262a",
    "--accent-foreground": "#f4f4f5",
    "--border": "#2f2f35",
    "--border-strong": "#45454d",
    "--input": "#2f2f35",
    "--success": "#4ade80",
    "--success-soft": "#15291c",
    "--destructive": "#ff8a7a",
    "--destructive-soft": "#3a1d1b",
    "--shadow-elevated":
      "0 1px 2px rgb(0 0 0 / 40%), 0 8px 24px rgb(0 0 0 / 50%)",
  },
} as const;

type ThemeInput = Pick<
  StoreAppearance,
  "primaryColor" | "font"
> & {
  mode?: StoreAppearance["mode"];
};

/** Variáveis CSS do tema da loja: cor, fonte, cantos e neutros do modo. */
export function themeVariables(
  appearance: ThemeInput,
): Record<string, string> {
  const primary =
    normalizeHex(appearance.primaryColor) ??
    DEFAULT_APPEARANCE.primaryColor;
  const neutrals = NEUTRALS[appearance.mode ?? "light"];
  const background = neutrals["--background"];
  const foreground = neutrals["--foreground"];

  // Tom claro da cor da loja (faixas e destaques) e o texto sobre ele: a
  // própria cor quando dá leitura, senão o texto padrão.
  const soft = mixHex(primary, background, 0.13);
  const softForeground =
    contrastRatio(primary, soft) >= 4.5
      ? primary
      : foreground;

  return {
    ...neutrals,
    "--primary": primary,
    "--primary-foreground": textColorOn(primary),
    "--primary-soft": soft,
    "--primary-soft-foreground": softForeground,
    "--ring": primary,
    "--font-sans": `${FONTS[appearance.font]}, ui-sans-serif, system-ui, sans-serif`,
    // Cantos do cardápio do cliente, maiores que os do painel.
    "--control-radius": "10px",
    "--surface-radius": "14px",
  };
}

/** O tema como atributo style, para um trecho da página (página de amostra). */
export function themeStyle(
  appearance: ThemeInput,
): CSSProperties {
  return themeVariables(appearance) as CSSProperties;
}

/**
 * O tema como regra CSS no :root, para a página inteira da loja. Diferente
 * do style num elemento, alcança também o que abre em portal (modal, menu).
 * Os valores vêm de listas fixas e de uma cor validada, nunca de texto livre.
 */
export function themeCss(appearance: ThemeInput): string {
  const declarations = Object.entries(
    themeVariables(appearance),
  )
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  return `:root{${declarations}}`;
}
