// Grupos de complementos (Ponto da carne, Adicionais...) e suas opções, no
// painel. Os grupos são compartilhados: um grupo vale para todos os produtos
// ligados a ele em product_complement_groups. Tudo com a sessão do lojista
// (RLS da loja) e store_id em todas as consultas.
import "server-only";

import { UserFacingError } from "@/lib/action-result";
import { createServerSupabase } from "@/lib/supabase/server";

import { reorderRows } from "./reorder";

export type PanelComplement = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

export type PanelComplementGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  allowRepeat: boolean;
  options: PanelComplement[];
  /** Produtos não excluídos que usam o grupo. */
  usedBy: { id: string; name: string }[];
};

export type ComplementGroupInput = {
  /** Sem id: grupo novo. */
  id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  allowRepeat: boolean;
  /** Na ordem em que o cliente vê. Opção sem id é nova. */
  options: {
    id?: string;
    name: string;
    price: number;
    isAvailable: boolean;
  }[];
};

/** Grupos não excluídos, na ordem, com opções e onde são usados. */
export async function listComplementGroups(
  storeId: string,
): Promise<PanelComplementGroup[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("complement_groups")
    .select(
      `id, name, min_select, max_select, allow_repeat,
       complements(id, name, price, is_available, sort_order, created_at),
       product_complement_groups(products(id, name, deleted_at))`,
    )
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .is("complements.deleted_at", null)
    .order("sort_order")
    .order("created_at");

  if (error) {
    throw new Error(
      `Erro ao carregar complementos: ${error.message}`,
    );
  }

  return data.map((group) => ({
    id: group.id,
    name: group.name,
    minSelect: group.min_select,
    maxSelect: group.max_select,
    allowRepeat: group.allow_repeat,
    options: [...group.complements]
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          a.created_at.localeCompare(b.created_at),
      )
      .map((option) => ({
        id: option.id,
        name: option.name,
        price: Number(option.price),
        isAvailable: option.is_available,
      })),
    usedBy: group.product_complement_groups
      .map((link) => link.products)
      .filter(
        (product): product is NonNullable<typeof product> =>
          product !== null && product.deleted_at === null,
      )
      .map((product) => ({
        id: product.id,
        name: product.name,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
  }));
}

/**
 * Cria ou atualiza o grupo com as opções pela função save_complement_group,
 * numa transação só: se qualquer parte falha, nada fica gravado. Opção que
 * saiu da lista é excluída (lógica: pedidos antigos guardam nome e preço
 * por conta própria). Devolve o id do grupo.
 */
export async function saveComplementGroup(
  storeId: string,
  input: ComplementGroupInput,
): Promise<string> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc(
    "save_complement_group",
    {
      p_store_id: storeId,
      p_group_id: input.id,
      p_name: input.name,
      p_min_select: input.minSelect,
      p_max_select: input.maxSelect,
      p_allow_repeat: input.allowRepeat,
      p_options: input.options.map((option) => ({
        id: option.id,
        name: option.name,
        price: option.price,
        is_available: option.isAvailable,
      })),
    },
  );
  if (error) {
    // P0001: recusa da regra (grupo que não existe mais), com mensagem
    // pronta para a tela.
    if (error.code === "P0001") {
      throw new UserFacingError(error.message);
    }
    throw new Error(
      `Erro ao salvar grupo: ${error.message}`,
    );
  }
  return data;
}

/** Pausa ou volta uma opção, direto da lista. */
export async function setComplementAvailability(
  storeId: string,
  complementId: string,
  isAvailable: boolean,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("complements")
    .update({ is_available: isAvailable })
    .eq("id", complementId)
    .eq("store_id", storeId)
    .is("deleted_at", null);
  if (error) {
    throw new Error(
      `Erro ao alterar opção: ${error.message}`,
    );
  }
}

export async function reorderComplementGroups(
  storeId: string,
  orderedIds: string[],
): Promise<void> {
  await reorderRows(
    "complement_groups",
    storeId,
    orderedIds,
  );
}

/**
 * Exclusão lógica do grupo. Os vínculos com produtos saem junto, para o
 * grupo não continuar aparecendo no editor de produto. Pedidos antigos não
 * mudam: guardam o nome do grupo e das opções.
 */
export async function deleteComplementGroup(
  storeId: string,
  groupId: string,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("complement_groups")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", groupId)
    .eq("store_id", storeId)
    .is("deleted_at", null);
  if (error) {
    throw new Error(
      `Erro ao excluir grupo: ${error.message}`,
    );
  }

  const { error: linkError } = await supabase
    .from("product_complement_groups")
    .delete()
    .eq("store_id", storeId)
    .eq("complement_group_id", groupId);
  if (linkError) {
    throw new Error(
      `Erro ao desligar o grupo dos produtos: ${linkError.message}`,
    );
  }
}
