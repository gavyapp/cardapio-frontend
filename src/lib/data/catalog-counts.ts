// Contagens do catálogo para o menu do painel (Cardápio → Produtos e
// Complementos). Só o número, sem trazer as linhas.
import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";

export type CatalogCounts = {
  products: number;
  complementGroups: number;
};

export async function countCatalog(
  storeId: string,
): Promise<CatalogCounts> {
  const supabase = await createServerSupabase();
  const [products, groups] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .is("deleted_at", null),
    supabase
      .from("complement_groups")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .is("deleted_at", null),
  ]);
  const failed = products.error ?? groups.error;
  if (failed) {
    throw new Error(
      `Erro ao contar o catálogo: ${failed.message}`,
    );
  }
  return {
    products: products.count ?? 0,
    complementGroups: groups.count ?? 0,
  };
}
