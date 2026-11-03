"use server";

import { z } from "zod";

import {
  errorMessage,
  validationError,
  type ActionResult,
  type ActionResultWith,
} from "@/lib/action-result";
import {
  deleteProduct,
  duplicateProduct,
  reorderProducts,
  saveProduct,
  setProductAvailability,
} from "@/lib/data/products";
import { afterMenuChange } from "@/lib/menu-cache";
import { requireStoreForAction } from "@/lib/panel-access";
import { PRODUCT_BADGES } from "@/lib/product-badges";

const id = z.uuid();

const productSchema = z.object({
  id: id.optional(),
  categoryId: z.uuid({
    message: "Escolha uma categoria para o produto.",
  }),
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome ao produto.")
    .max(80, "Use até 80 caracteres no nome."),
  description: z
    .string()
    .trim()
    .max(300, "Use até 300 caracteres na descrição."),
  price: z
    .number({ message: "Informe um preço válido." })
    .min(0, "Informe um preço válido.")
    .max(99999.99, "Informe um preço válido."),
  imageUrl: z.url().nullable(),
  badges: z
    .array(z.enum(PRODUCT_BADGES))
    .max(PRODUCT_BADGES.length),
  isAvailable: z.boolean(),
  isSuggested: z.boolean(),
  groupIds: z.array(id).max(30),
});

export async function saveProductAction(
  // Selos chegam como texto; o schema confere se estão na lista.
  input: Omit<z.input<typeof productSchema>, "badges"> & {
    badges: string[];
  },
): Promise<ActionResultWith<string>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    const productId = await saveProduct(
      store.id,
      parsed.data,
    );
    afterMenuChange(store.id);
    return { ok: true, data: productId };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function duplicateProductAction(
  productId: string,
): Promise<ActionResultWith<string>> {
  const parsed = id.safeParse(productId);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    const copyId = await duplicateProduct(
      store.id,
      parsed.data,
    );
    afterMenuChange(store.id);
    return { ok: true, data: copyId };
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(
        error,
        "Não foi possível duplicar. Tente de novo.",
      ),
    };
  }
}

export async function setProductAvailabilityAction(
  productId: string,
  isAvailable: boolean,
): Promise<ActionResult> {
  const parsed = z
    .object({ productId: id, isAvailable: z.boolean() })
    .safeParse({ productId, isAvailable });
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await setProductAvailability(
      store.id,
      parsed.data.productId,
      parsed.data.isAvailable,
    );
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function reorderProductsAction(
  categoryId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const parsed = z
    .object({
      categoryId: id,
      orderedIds: z.array(id).max(500),
    })
    .safeParse({ categoryId, orderedIds });
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await reorderProducts(
      store.id,
      parsed.data.categoryId,
      parsed.data.orderedIds,
    );
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function deleteProductAction(
  productId: string,
): Promise<ActionResult> {
  const parsed = id.safeParse(productId);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await deleteProduct(store.id, parsed.data);
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(
        error,
        "Não foi possível excluir. Tente de novo.",
      ),
    };
  }
}
