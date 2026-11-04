// Regras dos campos do produto, usadas no editor e na validação do servidor.

/** Selos: etiquetas no card do cardápio. Lista fechada; selo novo entra aqui. */
export const PRODUCT_BADGES = [
  "Novidade",
  "Edição limitada",
  "Mais vendido",
] as const;

export type ProductBadge = (typeof PRODUCT_BADGES)[number];

/** A descrição aparece em até 3 linhas no cardápio. */
export const PRODUCT_DESCRIPTION_LIMIT = 160;
