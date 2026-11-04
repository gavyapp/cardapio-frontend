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
 * Cria ou atualiza o grupo com as opções. Opção que saiu da lista é
 * excluída (lógica: pedidos antigos guardam nome e preço por conta própria).
 * Devolve o id do grupo.
 */
export async function saveComplementGroup(
  storeId: string,
  input: ComplementGroupInput,
): Promise<string> {
  const supabase = await createServerSupabase();
  const fields = {
    name: input.name,
    min_select: input.minSelect,
    max_select: input.maxSelect,
    allow_repeat: input.allowRepeat,
  };

  let groupId = input.id;
  if (groupId) {
    const { error, count } = await supabase
      .from("complement_groups")
      .update(fields, { count: "exact" })
      .eq("id", groupId)
      .eq("store_id", storeId)
      .is("deleted_at", null);
    if (error) {
      throw new Error(
        `Erro ao salvar grupo: ${error.message}`,
      );
    }
    if (count === 0) {
      throw new UserFacingError("Grupo não encontrado.");
    }
  } else {
    const { data: last } = await supabase
      .from("complement_groups")
      .select("sort_order")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("complement_groups")
      .insert({
        ...fields,
        store_id: storeId,
        sort_order: (last?.sort_order ?? -1) + 1,
      })
      .select("id")
      .single();
    if (error) {
      throw new Error(
        `Erro ao criar grupo: ${error.message}`,
      );
    }
    groupId = data.id;
  }

  await saveOptions(storeId, groupId, input.options);
  return groupId;
}

async function saveOptions(
  storeId: string,
  groupId: string,
  options: ComplementGroupInput["options"],
): Promise<void> {
  const supabase = await createServerSupabase();
  const { data: current, error: readError } = await supabase
    .from("complements")
    .select("id")
    .eq("store_id", storeId)
    .eq("complement_group_id", groupId)
    .is("deleted_at", null);
  if (readError) {
    throw new Error(
      `Erro ao carregar opções: ${readError.message}`,
    );
  }

  const currentIds = new Set(current.map((row) => row.id));
  const keptIds = new Set(
    options.flatMap((option) =>
      option.id && currentIds.has(option.id)
        ? [option.id]
        : [],
    ),
  );
  const removed = [...currentIds].filter(
    (id) => !keptIds.has(id),
  );

  const writes = [];
  if (removed.length > 0) {
    writes.push(
      supabase
        .from("complements")
        .update({ deleted_at: new Date().toISOString() })
        .eq("store_id", storeId)
        .in("id", removed),
    );
  }
  options.forEach((option, index) => {
    const fields = {
      name: option.name,
      price: option.price,
      is_available: option.isAvailable,
      sort_order: index,
    };
    writes.push(
      option.id && keptIds.has(option.id)
        ? supabase
            .from("complements")
            .update(fields)
            .eq("id", option.id)
            .eq("store_id", storeId)
        : supabase.from("complements").insert({
            ...fields,
            store_id: storeId,
            complement_group_id: groupId,
          }),
    );
  });

  const results = await Promise.all(writes);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(
      `Erro ao salvar opções: ${failed.error.message}`,
    );
  }
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
