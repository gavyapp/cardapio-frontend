// Promoções da loja no painel: lista, salvar, ligar e desligar, duplicar e
// excluir. Tudo com a sessão do lojista (RLS da loja) e store_id em todas
// as consultas. O formato de kind, rule e schedule está em promotions.ts.
import "server-only";

import type { Json } from "@/lib/database.types";
import { UserFacingError } from "@/lib/panel/action-result";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  readPromotion,
  type Promotion,
  type PromotionFormat,
  type PromotionSchedule,
} from "./promotions";

export type PanelPromotion = Promotion & {
  /** Produtos da promoção de produto, na ordem em que foram escolhidos. */
  productIds: string[];
  /** Pedidos com a promoção nos últimos 7 dias, sem cancelados. */
  recentOrderCount: number;
};

export type PromotionInput = PromotionFormat & {
  /** Sem id: promoção nova. */
  id?: string;
  name: string;
  schedule: PromotionSchedule;
  isActive: boolean;
  productIds: string[];
};

const RECENT_DAYS = 7;

/** Promoções não excluídas, da mais antiga para a mais nova. */
export async function listPanelPromotions(
  storeId: string,
): Promise<PanelPromotion[]> {
  const supabase = await createServerSupabase();
  const since = new Date(
    Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [promotions, counts] = await Promise.all([
    supabase
      .from("promotions")
      .select(
        "*, promotion_products(product_id, created_at, products(deleted_at))",
      )
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .order("created_at")
      .order("id"),
    supabase.rpc("promotion_order_counts", {
      p_store_id: storeId,
      p_since: since,
    }),
  ]);

  if (promotions.error) {
    throw new Error(
      `Erro ao carregar promoções: ${promotions.error.message}`,
    );
  }
  if (counts.error) {
    throw new Error(
      `Erro ao contar pedidos das promoções: ${counts.error.message}`,
    );
  }

  const countById = new Map(
    counts.data.map((row) => [
      row.promotion_id,
      row.order_count,
    ]),
  );

  return promotions.data.map(
    ({ promotion_products: links, ...row }) => ({
      ...readPromotion(row),
      productIds: activeProductIds(links),
      recentOrderCount: countById.get(row.id) ?? 0,
    }),
  );
}

/**
 * Produtos da promoção na ordem em que entraram. Produto excluído some da
 * promoção, como do cardápio.
 */
function activeProductIds(
  links: {
    product_id: string;
    created_at: string;
    products: { deleted_at: string | null } | null;
  }[],
): string[] {
  return links
    .filter((link) => link.products?.deleted_at === null)
    .sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    )
    .map((link) => link.product_id);
}

/** Recusa do banco com mensagem para a tela. */
function throwSaveError(
  error: { code: string; message: string },
  action: string,
): never {
  // P0001: regra da promoção (produto em outra promoção, produto que não
  // existe mais), com a mensagem pronta.
  if (error.code === "P0001") {
    throw new UserFacingError(error.message);
  }
  // 23514: formato fora dos checks; o formulário já confere antes.
  if (error.code === "23514") {
    throw new UserFacingError(
      "Confira os dados da promoção e tente de novo.",
    );
  }
  throw new Error(`Erro ao ${action}: ${error.message}`);
}

/**
 * Cria ou atualiza a promoção e os produtos dela numa transação só
 * (save_promotion). Devolve o id.
 */
export async function savePromotion(
  storeId: string,
  input: PromotionInput,
): Promise<string> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc(
    "save_promotion",
    {
      p_store_id: storeId,
      p_promotion_id: input.id,
      p_name: input.name,
      p_kind: input.kind,
      p_rule: input.rule as Json,
      p_schedule: input.schedule as Json,
      p_is_active: input.isActive,
      p_product_ids:
        input.kind === "product_discount"
          ? input.productIds
          : [],
    },
  );
  if (error) throwSaveError(error, "salvar promoção");
  return data;
}

/** Liga ou desliga, direto da lista. */
export async function setPromotionActive(
  storeId: string,
  promotionId: string,
  isActive: boolean,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("promotions")
    .update({ is_active: isActive })
    .eq("id", promotionId)
    .eq("store_id", storeId)
    .is("deleted_at", null);
  if (error) {
    if (error.code === "P0001") {
      throw new UserFacingError(
        `${error.message.replace(/\.$/, "")}. Pause aquela promoção antes.`,
      );
    }
    throwSaveError(error, "alterar promoção");
  }
}

/**
 * Copia a promoção, com os mesmos produtos, como "Nome (cópia)" e
 * pausada: assim não disputa os produtos com a original. Devolve o id novo.
 */
export async function duplicatePromotion(
  storeId: string,
  promotionId: string,
): Promise<string> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("promotions")
    .select(
      "*, promotion_products(product_id, created_at, products(deleted_at))",
    )
    .eq("id", promotionId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Erro ao carregar promoção: ${error.message}`,
    );
  }
  if (!data) {
    throw new UserFacingError("Promoção não encontrada.");
  }

  const { promotion_products: links, ...row } = data;
  const original = readPromotion(row);
  return savePromotion(storeId, {
    ...original,
    id: undefined,
    name: `${original.name} (cópia)`,
    isActive: false,
    productIds: activeProductIds(links),
  });
}

/** Exclusão lógica: some do painel e do cardápio; pedidos já feitos não mudam. */
export async function deletePromotion(
  storeId: string,
  promotionId: string,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("promotions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", promotionId)
    .eq("store_id", storeId)
    .is("deleted_at", null);
  if (error) {
    throw new Error(
      `Erro ao excluir promoção: ${error.message}`,
    );
  }
}
