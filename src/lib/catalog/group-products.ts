// Escolha dos produtos que usam um grupo de complementos, na tela de
// Complementos: os produtos por categoria, a busca e a marcação. Puro, sem
// React, para ser testável.
import { normalizeSearch } from "@/lib/format";

export type ProductChoice = { id: string; name: string };

/** Uma categoria com os produtos que podem receber o grupo. */
export type ProductChoiceCategory = {
  id: string;
  name: string;
  products: ProductChoice[];
};

/**
 * Produtos agrupados por categoria, na ordem do cardápio. Categoria sem
 * produto fica de fora.
 */
export function productChoices(
  categories: readonly { id: string; name: string }[],
  products: readonly {
    id: string;
    name: string;
    categoryId: string;
  }[],
): ProductChoiceCategory[] {
  return categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      products: products
        .filter(
          (product) => product.categoryId === category.id,
        )
        .map(({ id, name }) => ({ id, name })),
    }))
    .filter((category) => category.products.length > 0);
}

/**
 * Busca pelo nome do produto ou da categoria, sem diferenciar acento nem
 * maiúscula. Categoria que bate pelo nome vem inteira.
 */
export function searchProductChoices(
  categories: readonly ProductChoiceCategory[],
  query: string,
): ProductChoiceCategory[] {
  const term = normalizeSearch(query);
  if (!term) return [...categories];
  return categories
    .map((category) =>
      normalizeSearch(category.name).includes(term)
        ? category
        : {
            ...category,
            products: category.products.filter((product) =>
              normalizeSearch(product.name).includes(term),
            ),
          },
    )
    .filter((category) => category.products.length > 0);
}

/** Marca ou desmarca os produtos dados, sem mexer nos outros. */
export function toggleProducts(
  selected: ReadonlySet<string>,
  productIds: readonly string[],
  checked: boolean,
): Set<string> {
  const next = new Set(selected);
  for (const id of productIds) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  return next;
}

/** A marcação é diferente da que estava gravada? */
export function hasSelectionChanged(
  selected: ReadonlySet<string>,
  saved: readonly string[],
): boolean {
  return (
    selected.size !== saved.length ||
    saved.some((id) => !selected.has(id))
  );
}
