// Ordem manual das listas do catálogo: a posição de cada id na lista vira o
// sort_order. Sempre filtrando pela loja; o RLS confere de novo.
import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";

type SortableTable =
  "categories" | "products" | "complement_groups";

export async function reorderRows(
  table: SortableTable,
  storeId: string,
  orderedIds: string[],
  /** Produtos só mudam de posição dentro da própria categoria. */
  categoryId?: string,
): Promise<void> {
  const supabase = await createServerSupabase();
  const results = await Promise.all(
    orderedIds.map((id, index) => {
      let query = supabase
        .from(table)
        .update({ sort_order: index })
        .eq("id", id)
        .eq("store_id", storeId);
      if (categoryId) {
        query = query.filter(
          "category_id",
          "eq",
          categoryId,
        );
      }
      return query;
    }),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(
      `Erro ao reordenar (${table}): ${failed.error.message}`,
    );
  }
}
