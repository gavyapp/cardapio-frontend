// Produtos do cardápio no painel, com os grupos de complementos ligados a
// cada um (product_complement_groups). Tudo com a sessão do lojista (RLS da
// loja) e store_id em todas as consultas.
import "server-only";

import { UserFacingError } from "@/lib/panel/action-result";
import { storeImagePathFromUrl } from "@/lib/store/images";
import { createServerSupabase } from "@/lib/supabase/server";

import { reorderRows } from "./reorder";
import { removeReplacedStoreImage } from "./store-image-cleanup";

export type PanelProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  badges: string[];
  isAvailable: boolean;
  isSuggested: boolean;
  /** Ids dos grupos ligados, na ordem em que o cliente vê. */
  groupIds: string[];
};

export type ProductInput = {
  /** Sem id: produto novo. */
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  badges: string[];
  isAvailable: boolean;
  isSuggested: boolean;
  groupIds: string[];
};

/** Produtos não excluídos, na ordem dentro de cada categoria. */
export async function listPanelProducts(
  storeId: string,
): Promise<PanelProduct[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, category_id, name, description, price, image_url, badges,
       is_available, is_suggested,
       product_complement_groups(complement_group_id, sort_order,
         complement_groups(deleted_at))`,
    )
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("created_at");

  if (error) {
    throw new Error(
      `Erro ao carregar produtos: ${error.message}`,
    );
  }

  return data.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price),
    imageUrl: row.image_url,
    badges: row.badges,
    isAvailable: row.is_available,
    isSuggested: row.is_suggested,
    groupIds: [...row.product_complement_groups]
      .filter(
        (link) =>
          link.complement_groups?.deleted_at === null,
      )
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => link.complement_group_id),
  }));
}

/**
 * Grava o produto e os grupos ligados pela função save_product, numa
 * transação só: se qualquer parte falha, nada fica gravado. A função confere
 * que categoria e grupos são da loja e põe produto novo, ou que mudou de
 * categoria, no fim da categoria. Devolve o id.
 */
async function writeProduct(
  storeId: string,
  input: ProductInput,
): Promise<string> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc(
    "save_product",
    {
      p_store_id: storeId,
      p_product_id: input.id,
      p_category_id: input.categoryId,
      p_name: input.name,
      p_description: input.description || undefined,
      p_price: input.price,
      p_image_url: input.imageUrl ?? undefined,
      p_badges: input.badges,
      p_is_available: input.isAvailable,
      p_is_suggested: input.isSuggested,
      p_group_ids: input.groupIds,
    },
  );
  if (error) {
    // P0001: recusa da regra (categoria ou grupo de outra loja, produto que
    // não existe mais), com mensagem pronta para a tela.
    if (error.code === "P0001") {
      throw new UserFacingError(error.message);
    }
    throwIfSuggestingUnavailable(error);
    throw new Error(
      `Erro ao salvar produto: ${error.message}`,
    );
  }
  return data;
}

/**
 * Cria ou atualiza o produto e os grupos ligados. Se a foto mudou, apaga a
 * anterior depois de salvar, a não ser que outro produto (uma cópia) ainda
 * use a mesma. Devolve o id.
 */
export async function saveProduct(
  storeId: string,
  input: ProductInput,
): Promise<string> {
  let previousImage: string | null = null;
  if (input.id) {
    const supabase = await createServerSupabase();
    const { data: current, error } = await supabase
      .from("products")
      .select("image_url")
      .eq("id", input.id)
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      throw new Error(
        `Erro ao carregar produto: ${error.message}`,
      );
    }
    if (!current) {
      throw new UserFacingError("Produto não encontrado.");
    }
    previousImage = current.image_url;
  }
  assertImageFromStore(
    storeId,
    input.imageUrl,
    previousImage,
  );

  const productId = await writeProduct(storeId, input);

  // O arquivo fica no Storage, fora da transação do banco: só sai depois
  // que o produto já aponta para a foto nova.
  if (
    previousImage &&
    previousImage !== input.imageUrl &&
    !(await isImageInUse(storeId, previousImage))
  ) {
    await removeReplacedStoreImage(
      previousImage,
      input.imageUrl,
    );
  }

  return productId;
}

/**
 * Foto nova só vale se foi enviada para a pasta da loja no bucket. Uma URL
 * de fora (como as do seed) só pode continuar a que o produto já tinha.
 */
function assertImageFromStore(
  storeId: string,
  imageUrl: string | null,
  previousImage: string | null,
): void {
  if (!imageUrl || imageUrl === previousImage) return;
  const path = storeImagePathFromUrl(imageUrl);
  if (!path?.startsWith(`${storeId}/`)) {
    throw new UserFacingError(
      "Foto inválida. Envie de novo.",
    );
  }
}

/** Algum produto da loja (inclusive excluído) ainda usa a imagem. */
async function isImageInUse(
  storeId: string,
  imageUrl: string,
): Promise<boolean> {
  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("image_url", imageUrl);
  return (count ?? 0) > 0;
}

/**
 * Copia o produto (com os grupos na mesma ordem) logo como "Nome (cópia)",
 * no fim da mesma categoria. A cópia usa a mesma foto e nasce disponível e
 * sem sugestão no carrinho, mesmo que o original esteja esgotado ou
 * sugerido. Devolve o id novo.
 */
export async function duplicateProduct(
  storeId: string,
  productId: string,
): Promise<string> {
  const supabase = await createServerSupabase();
  const { data: original, error } = await supabase
    .from("products")
    .select(
      `category_id, name, description, price, image_url, badges,
       product_complement_groups(complement_group_id, sort_order,
         complement_groups(deleted_at))`,
    )
    .eq("id", productId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Erro ao carregar produto: ${error.message}`,
    );
  }
  if (!original) {
    throw new UserFacingError("Produto não encontrado.");
  }

  return writeProduct(storeId, {
    categoryId: original.category_id,
    name: `${original.name} (cópia)`.slice(0, 80),
    description: original.description ?? "",
    price: Number(original.price),
    imageUrl: original.image_url,
    badges: original.badges,
    isAvailable: true,
    isSuggested: false,
    groupIds: [...original.product_complement_groups]
      .filter(
        (link) =>
          link.complement_groups?.deleted_at === null,
      )
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => link.complement_group_id),
  });
}

/**
 * Esgota ou volta o produto, direto da lista. Esgotar tira a sugestão no
 * carrinho junto (o banco não aceita produto esgotado e sugerido); voltar
 * não liga a sugestão de novo.
 */
export async function setProductAvailability(
  storeId: string,
  productId: string,
  isAvailable: boolean,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("products")
    .update(
      isAvailable
        ? { is_available: true }
        : { is_available: false, is_suggested: false },
    )
    .eq("id", productId)
    .eq("store_id", storeId)
    .is("deleted_at", null);
  if (error) {
    throw new Error(
      `Erro ao alterar produto: ${error.message}`,
    );
  }
}

/** Liga ou desliga a sugestão no carrinho, direto da lista. */
export async function setProductSuggested(
  storeId: string,
  productId: string,
  isSuggested: boolean,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("products")
    .update({ is_suggested: isSuggested })
    .eq("id", productId)
    .eq("store_id", storeId)
    .is("deleted_at", null);
  if (error) {
    throwIfSuggestingUnavailable(error);
    throw new Error(
      `Erro ao alterar produto: ${error.message}`,
    );
  }
}

/** Recusa do banco ao sugerir produto esgotado, com mensagem para a tela. */
function throwIfSuggestingUnavailable(error: {
  message: string;
}) {
  if (
    error.message.includes(
      "products_suggested_requires_available",
    )
  ) {
    throw new UserFacingError(
      "Produto esgotado não pode ser sugerido no carrinho.",
    );
  }
}

/** Ordem dos produtos de uma categoria. */
export async function reorderProducts(
  storeId: string,
  categoryId: string,
  orderedIds: string[],
): Promise<void> {
  await reorderRows(
    "products",
    storeId,
    orderedIds,
    categoryId,
  );
}

/**
 * Exclusão lógica. A foto fica no bucket: pedidos antigos não usam, mas o
 * produto pode ser recuperado pelo banco se excluído por engano.
 */
export async function deleteProduct(
  storeId: string,
  productId: string,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("store_id", storeId)
    .is("deleted_at", null);
  if (error) {
    throw new Error(
      `Erro ao excluir produto: ${error.message}`,
    );
  }
}
