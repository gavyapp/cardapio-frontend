// Páginas de listas do painel: recorte da página e os números do rodapé.

export type Page<T> = {
  items: T[];
  /** Página mostrada, de 1 em diante, já dentro do intervalo. */
  page: number;
  pageCount: number;
  /** Posição do primeiro e do último item mostrado, de 1 em diante. */
  first: number;
  last: number;
};

/**
 * Recorta a página pedida. Página fora do intervalo (a lista encolheu, URL
 * editada) cai na mais próxima que existe.
 */
export function paginate<T>(
  items: readonly T[],
  requested: number,
  size: number,
): Page<T> {
  const pageCount = Math.max(
    1,
    Math.ceil(items.length / size),
  );
  const page = Math.min(
    pageCount,
    Math.max(
      1,
      Number.isInteger(requested) ? requested : 1,
    ),
  );
  const start = (page - 1) * size;
  const pageItems = items.slice(start, start + size);
  return {
    items: pageItems,
    page,
    pageCount,
    first: pageItems.length ? start + 1 : 0,
    last: start + pageItems.length,
  };
}

/**
 * Números das páginas no rodapé: a primeira, a última e as vizinhas da
 * atual; "gap" marca o salto. Ex.: 1 … 4 5 6 … 12.
 */
export function pageNumbers(
  page: number,
  pageCount: number,
): (number | "gap")[] {
  const shown = new Set(
    [1, pageCount, page - 1, page, page + 1].filter(
      (n) => n >= 1 && n <= pageCount,
    ),
  );
  const sorted = [...shown].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  for (const n of sorted) {
    const previous = result[result.length - 1];
    if (typeof previous === "number" && n - previous === 2)
      result.push(previous + 1);
    else if (
      typeof previous === "number" &&
      n - previous > 2
    )
      result.push("gap");
    result.push(n);
  }
  return result;
}
