// Selos do produto: etiquetas no card do cardápio. Lista fechada, como no
// protótipo; selo novo entra aqui.

export const PRODUCT_BADGES = [
  "Novidade",
  "Edição limitada",
  "Mais vendido",
] as const;

export type ProductBadge = (typeof PRODUCT_BADGES)[number];
