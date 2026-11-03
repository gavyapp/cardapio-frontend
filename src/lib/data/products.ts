// Produtos do cardápio no painel, com os grupos de complementos ligados a
// cada um (product_complement_groups). Tudo com a sessão do lojista (RLS da
// loja) e store_id em todas as consultas.
import "server-only";

import { UserFacingError } from "@/lib/action-result";
import { storeImagePathFromUrl } from "@/lib/store-images";
import { createServerSupabase } from "@/lib/supabase/server";

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
 * Categoria e grupos precisam ser da própria loja e não excluídos. O RLS
 * confere só o store_id da linha gravada, não o de quem ela aponta.
 */
async function assertSameStore(
  storeId: string,
  categoryId: string,
  groupIds: string[],
): Promise<void> {
  const supabase = await createServerSupabase();
  const { count: categoryCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .is("deleted_at", null);
  if (!categoryCount) {
    throw new UserFacingError(
      "Escolha uma categoria da loja.",
    );
  }

  const uniqueGroups = new Set(groupIds);
  if (uniqueGroups.size !== groupIds.length) {
    throw new UserFacingError(
      "Grupo de complementos repetido.",
    );
  }
  if (groupIds.length === 0) return;
  const { count: groupCount } = await supabase
    .from("complement_groups")
    .select("id", { count: "exact", head: true })
    .in("id", groupIds)
    .eq("store_id", storeId)
    .is("deleted_at", null);
  if (groupCount !== groupIds.length) {
    throw new UserFacingError(
      "Um dos grupos de complementos não existe mais. Recarregue a página.",
    );
  }
}

async function nextSortOrder(
  storeId: string,
  categoryId: string,
): Promise<number> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("products")
    .select("sort_order")
    .eq("store_id", storeId)
    .eq("category_id", categoryId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? -1) + 1;
}

/** Troca os grupos ligados ao produto pela lista, nessa ordem. */
async function replaceProductGroups(
  storeId: string,
  productId: string,
  groupIds: string[],
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error: deleteError } = await supabase
    .from("product_complement_groups")
    .delete()
    .eq("store_id", storeId)
    .eq("product_id", productId);
  if (deleteError) {
    throw new Error(
      `Erro ao salvar complementos do produto: ${deleteError.message}`,
    );
  }
  if (groupIds.length === 0) return;

  const { error } = await supabase
    .from("product_complement_groups")
    .insert(
      groupIds.map((groupId, index) => ({
        store_id: storeId,
        product_id: productId,
        complement_group_id: groupId,
        sort_order: index,
      })),
    );
  if (error) {
    throw new Error(
      `Erro ao salvar complementos do produto: ${error.message}`,
    );
  }
}

/**
 * Cria ou atualiza o produto e os grupos ligados. Produto novo, ou que
 * mudou de categoria, vai para o fim da categoria. Se a foto mudou, apaga a
 * anterior, a não ser que outro produto (uma cópia) ainda use a mesma.
 * Devolve o id.
 */
export async function saveProduct(
  storeId: string,
  input: ProductInput,
): Promise<string> {
  const supabase = await createServerSupabase();
  const fields = {
    category_id: input.categoryId,
    name: input.name,
    description: input.description || null,
    price: input.price,
    image_url: input.imageUrl,
    badges: input.badges,
    is_available: input.isAvailable,
    is_suggested: input.isSuggested,
  };

  await assertSameStore(
    storeId,
    input.categoryId,
    input.groupIds,
  );

  let productId = input.id;
  let previousImage: string | null = null;

  if (productId) {
    const { data: current, error: readError } =
      await supabase
        .from("products")
        .select("category_id, image_url")
        .eq("id", productId)
        .eq("store_id", storeId)
        .is("deleted_at", null)
        .maybeSingle();
    if (readError) {
      throw new Error(
        `Erro ao carregar produto: ${readError.message}`,
      );
    }
    if (!current) {
      throw new UserFacingError("Produto não encontrado.");
    }
    previousImage = current.image_url;
    assertImageFromStore(
      storeId,
      input.imageUrl,
      previousImage,
    );

    const movedCategory =
      current.category_id !== input.categoryId;
    const { error } = await supabase
      .from("products")
      .update({
        ...fields,
        ...(movedCategory && {
          sort_order: await nextSortOrder(
            storeId,
            input.categoryId,
          ),
        }),
      })
      .eq("id", productId)
      .eq("store_id", storeId);
    if (error) {
      throw new Error(
        `Erro ao salvar produto: ${error.message}`,
      );
    }
  } else {
    assertImageFromStore(storeId, input.imageUrl, null);
    const { data, error } = await supabase
      .from("products")
      .insert({
        ...fields,
        store_id: storeId,
        sort_order: await nextSortOrder(
          storeId,
          input.categoryId,
        ),
      })
      .select("id")
      .single();
    if (error) {
      throw new Error(
        `Erro ao criar produto: ${error.message}`,
      );
    }
    productId = data.id;
  }

  await replaceProductGroups(
    storeId,
    productId,
    input.groupIds,
  );

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
       product_complement_groups(complement_group_id, sort_order)`,
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

  const { data: copy, error: insertError } = await supabase
    .from("products")
    .insert({
      store_id: storeId,
      category_id: original.category_id,
      name: `${original.name} (cópia)`.slice(0, 80),
      description: original.description,
      price: original.price,
      image_url: original.image_url,
      badges: original.badges,
      is_available: true,
      is_suggested: false,
      sort_order: await nextSortOrder(
        storeId,
        original.category_id,
      ),
    })
    .select("id")
    .single();
  if (insertError) {
    throw new Error(
      `Erro ao duplicar produto: ${insertError.message}`,
    );
  }

  await replaceProductGroups(
    storeId,
    copy.id,
    [...original.product_complement_groups]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => link.complement_group_id),
  );
  return copy.id;
}

/** Esgota ou volta o produto, direto da lista. */
export async function setProductAvailability(
  storeId: string,
  productId: string,
  isAvailable: boolean,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("products")
    .update({ is_available: isAvailable })
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
    throw new Error(
      `Erro ao alterar produto: ${error.message}`,
    );
  }
}

/** Ordem dos produtos de uma categoria: a posição na lista vira sort_order. */
export async function reorderProducts(
  storeId: string,
  categoryId: string,
  orderedIds: string[],
): Promise<void> {
  const supabase = await createServerSupabase();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("products")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("store_id", storeId)
        .eq("category_id", categoryId),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(
      `Erro ao reordenar produtos: ${failed.error.message}`,
    );
  }
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
