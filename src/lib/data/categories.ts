// Categorias do cardápio no painel. Tudo com a sessão do lojista: o RLS só
// deixa ler e alterar as categorias da própria loja. O store_id vai em todas
// as consultas mesmo assim, para um id de outra loja nunca bater.
import "server-only";

import { UserFacingError } from "@/lib/action-result";
import { createServerSupabase } from "@/lib/supabase/server";

export type PanelCategory = {
  id: string;
  name: string;
  isAvailable: boolean;
  sortOrder: number;
  /** Produtos não excluídos na categoria. */
  productCount: number;
};

/** Categorias não excluídas, na ordem do cardápio. */
export async function listPanelCategories(
  storeId: string,
): Promise<PanelCategory[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, name, is_available, sort_order, products(count)",
    )
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .is("products.deleted_at", null)
    .order("sort_order")
    .order("created_at");

  if (error) {
    throw new Error(
      `Erro ao carregar categorias: ${error.message}`,
    );
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    isAvailable: row.is_available,
    sortOrder: row.sort_order,
    productCount: row.products[0]?.count ?? 0,
  }));
}

/** Cria a categoria no fim da lista e devolve o id. */
export async function createCategory(
  storeId: string,
  name: string,
): Promise<string> {
  const supabase = await createServerSupabase();
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      store_id: storeId,
      name,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Erro ao criar categoria: ${error.message}`,
    );
  }
  return data.id;
}

export async function updateCategory(
  storeId: string,
  categoryId: string,
  changes: { name?: string; isAvailable?: boolean },
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error, count } = await supabase
    .from("categories")
    .update(
      {
        ...(changes.name !== undefined && {
          name: changes.name,
        }),
        ...(changes.isAvailable !== undefined && {
          is_available: changes.isAvailable,
        }),
      },
      { count: "exact" },
    )
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(
      `Erro ao alterar categoria: ${error.message}`,
    );
  }
  if (count === 0) {
    throw new UserFacingError("Categoria não encontrada.");
  }
}

/** Grava a ordem: a posição de cada id na lista vira o sort_order. */
export async function reorderCategories(
  storeId: string,
  orderedIds: string[],
): Promise<void> {
  const supabase = await createServerSupabase();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("categories")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("store_id", storeId),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(
      `Erro ao reordenar categorias: ${failed.error.message}`,
    );
  }
}

/**
 * Exclusão lógica. O banco recusa (trigger) categoria com produto não
 * excluído; a contagem antes é só para a mensagem dizer quantos são.
 */
export async function deleteCategory(
  storeId: string,
  categoryId: string,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("category_id", categoryId)
    .is("deleted_at", null);

  if (count) {
    throw new UserFacingError(
      count === 1
        ? "A categoria tem 1 produto. Mova ou exclua o produto antes."
        : `A categoria tem ${count} produtos. Mova ou exclua os produtos antes.`,
    );
  }

  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .is("deleted_at", null);

  if (error) {
    if (error.code === "P0001") {
      throw new UserFacingError(error.message);
    }
    throw new Error(
      `Erro ao excluir categoria: ${error.message}`,
    );
  }
}
