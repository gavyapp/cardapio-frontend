"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import {
  deletePromotion,
  duplicatePromotion,
  savePromotion,
  setPromotionActive,
} from "@/lib/data/panel-promotions";
import { parsePromotionFormat } from "@/lib/data/promotions";
import {
  errorMessage,
  validationError,
  type ActionResult,
  type ActionResultWith,
} from "@/lib/panel/action-result";
import { requireStoreForAction } from "@/lib/panel/access";
import type { PromotionDraft } from "@/lib/promotions/draft";

const id = z.uuid();

const detailsSchema = z.object({
  id: id.optional(),
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome à promoção.")
    .max(80, "Use até 80 caracteres no nome."),
  isActive: z.boolean(),
  productIds: z.array(id).max(500),
});

// O cardápio lê as promoções fora do cache (live_promotions): basta
// atualizar a página do painel (refresh), sem expirar o cardápio.

export async function savePromotionAction(
  draft: PromotionDraft,
): Promise<ActionResultWith<string>> {
  const details = detailsSchema.safeParse(draft);
  if (!details.success)
    return validationError(details.error);
  const format = parsePromotionFormat(draft);
  if (!format.success) return validationError(format.error);
  try {
    const store = await requireStoreForAction();
    const promotionId = await savePromotion(store.id, {
      ...details.data,
      ...format.data,
    });
    refresh();
    return { ok: true, data: promotionId };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function setPromotionActiveAction(
  promotionId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const parsed = z
    .object({ promotionId: id, isActive: z.boolean() })
    .safeParse({ promotionId, isActive });
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await setPromotionActive(
      store.id,
      parsed.data.promotionId,
      parsed.data.isActive,
    );
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function duplicatePromotionAction(
  promotionId: string,
): Promise<ActionResultWith<string>> {
  const parsed = id.safeParse(promotionId);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    const copyId = await duplicatePromotion(
      store.id,
      parsed.data,
    );
    refresh();
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

export async function deletePromotionAction(
  promotionId: string,
): Promise<ActionResult> {
  const parsed = id.safeParse(promotionId);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await deletePromotion(store.id, parsed.data);
    refresh();
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
