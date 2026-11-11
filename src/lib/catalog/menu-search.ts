// Busca no cardápio do cliente, feita no aparelho sobre os produtos que a
// tela já tem. Compara nome e descrição sem diferenciar acento nem maiúscula.
import { normalizeSearch } from "@/lib/format";

export type SearchableProduct = {
  name: string;
  description: string | null;
};

/**
 * Produtos cujo nome ou descrição contém todas as palavras da busca, na
 * ordem do cardápio, com os que batem pelo nome primeiro. Busca vazia
 * devolve lista vazia. Esgotados entram: é a tela que marca.
 */
export function searchProducts<T extends SearchableProduct>(
  products: readonly T[],
  query: string,
): T[] {
  const words = normalizeSearch(query)
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return [];

  const byName: T[] = [];
  const byDescription: T[] = [];
  for (const product of products) {
    const name = normalizeSearch(product.name);
    const description = normalizeSearch(
      product.description ?? "",
    );
    if (words.every((word) => name.includes(word))) {
      byName.push(product);
    } else if (
      words.every(
        (word) =>
          name.includes(word) || description.includes(word),
      )
    ) {
      byDescription.push(product);
    }
  }
  return [...byName, ...byDescription];
}
