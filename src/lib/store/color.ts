// Contraste de cores (WCAG 2). Decide se o texto sobre a cor da loja
// é claro ou escuro, para cor principal clara não deixar botão ilegível.

export const DARK_TEXT = "#16191d";
export const LIGHT_TEXT = "#ffffff";

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normaliza para "#rrggbb" minúsculo. Retorna null se não for hex válido. */
export function normalizeHex(color: string): string | null {
  const m = HEX_RE.exec(color.trim());
  if (!m) return null;
  let hex = m[1].toLowerCase();
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${hex}`;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045
    ? c / 12.92
    : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminância relativa (0 = preto, 1 = branco). */
export function luminance(hex: string): number {
  const n = normalizeHex(hex);
  if (!n) return 0;
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return (
    0.2126 * channel(r) +
    0.7152 * channel(g) +
    0.0722 * channel(b)
  );
}

/** Razão de contraste entre duas cores (1 a 21). AA para texto normal é 4,5. */
export function contrastRatio(
  a: string,
  b: string,
): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Cor de texto com maior contraste sobre o background: branca ou escura. */
export function textColorOn(background: string): string {
  return contrastRatio(background, LIGHT_TEXT) >=
    contrastRatio(background, DARK_TEXT)
    ? LIGHT_TEXT
    : DARK_TEXT;
}

/**
 * Mistura duas cores: `weight` é quanto da primeira entra (0 a 1).
 * mixHex("#650000", "#ffffff", 0.13) é o tom claro da cor da loja.
 */
export function mixHex(
  color: string,
  base: string,
  weight: number,
): string {
  const a = normalizeHex(color) ?? DARK_TEXT;
  const b = normalizeHex(base) ?? LIGHT_TEXT;
  const mixed = [1, 3, 5].map((start) => {
    const from = parseInt(a.slice(start, start + 2), 16);
    const to = parseInt(b.slice(start, start + 2), 16);
    return Math.round(from * weight + to * (1 - weight))
      .toString(16)
      .padStart(2, "0");
  });
  return `#${mixed.join("")}`;
}
