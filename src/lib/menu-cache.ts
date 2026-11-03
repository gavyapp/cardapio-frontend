// Cache do cardápio público. A consulta do cardápio marca o resultado com
// menuCacheTag(store.id) (cacheTag do Next); o painel expira essa marca
// depois de cada alteração no catálogo, e o cliente vê a mudança no próximo
// carregamento.
import "server-only";

import { refresh, updateTag } from "next/cache";

/** Marca do cache do cardápio de uma loja. */
export function menuCacheTag(storeId: string): string {
  return `menu:${storeId}`;
}

/**
 * Depois de salvar algo do catálogo: expira o cardápio público da loja e
 * atualiza a página do painel. Só funciona dentro de Server Action.
 */
export function afterMenuChange(storeId: string): void {
  updateTag(menuCacheTag(storeId));
  refresh();
}
