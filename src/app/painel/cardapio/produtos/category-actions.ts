"use server";

import { z } from "zod";

import {
  errorMessage,
  type ActionResult,
  type ActionResultWith,
  validationError,
} from "@/lib/action-result";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from "@/lib/data/categories";
import { afterMenuChange } from "@/lib/menu-cache";
import { requireStoreForAction } from "@/lib/panel-access";

const categoryName = z
  .string()
  .trim()
  .min(1, "Dê um nome à categoria.")
  .max(60, "Use até 60 caracteres.");
const id = z.uuid();

export async function createCategoryAction(
  name: string,
): Promise<ActionResultWith<string>> {
  const parsed = categoryName.safeParse(name);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    const newId = await createCategory(
      store.id,
      parsed.data,
    );
    afterMenuChange(store.id);
    return { ok: true, data: newId };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function renameCategoryAction(
  categoryId: string,
  name: string,
): Promise<ActionResult> {
  const parsed = z
    .object({ categoryId: id, name: categoryName })
    .safeParse({ categoryId, name });
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await updateCategory(store.id, parsed.data.categoryId, {
      name: parsed.data.name,
    });
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function setCategoryAvailabilityAction(
  categoryId: string,
  isAvailable: boolean,
): Promise<ActionResult> {
  const parsed = z
    .object({ categoryId: id, isAvailable: z.boolean() })
    .safeParse({ categoryId, isAvailable });
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await updateCategory(store.id, parsed.data.categoryId, {
      isAvailable: parsed.data.isAvailable,
    });
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function reorderCategoriesAction(
  orderedIds: string[],
): Promise<ActionResult> {
  const parsed = z.array(id).max(200).safeParse(orderedIds);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await reorderCategories(store.id, parsed.data);
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<ActionResult> {
  const parsed = id.safeParse(categoryId);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await deleteCategory(store.id, parsed.data);
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
