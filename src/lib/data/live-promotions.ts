// Promoções que valem agora numa loja, calculadas pelo banco
// (live_promotions), as mesmas que o create_order aplica. Depende da hora:
// não pode ficar em cache junto com o cardápio.
import "server-only";

import { z } from "zod";

import type { OrderPromotionRules } from "@/lib/promotions/order-discount";
import { createAnonymousSupabase } from "@/lib/supabase/anonymous";

const livePromotionsSchema = z.object({
  products: z.array(
    z.object({
      product_id: z.uuid(),
      price: z.number(),
      promotion_id: z.uuid(),
      promotion_name: z.string(),
    }),
  ),
  free_delivery: z
    .object({
      id: z.uuid(),
      name: z.string(),
      min_subtotal: z.number(),
    })
    .nullable(),
  order_discounts: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      min_subtotal: z.number(),
      mode: z.enum(["percent", "amount_off"]),
      value: z.number(),
    }),
  ),
});

/** Preço promocional de um produto agora. */
export type ProductPromotion = {
  price: number;
  promotionName: string;
};

export type LivePromotions = OrderPromotionRules & {
  /** Por id do produto; produto sem promoção não aparece. */
  products: Map<string, ProductPromotion>;
};

export async function findLivePromotions(
  storeId: string,
): Promise<LivePromotions> {
  const supabase = createAnonymousSupabase();
  const { data, error } = await supabase.rpc(
    "live_promotions",
    { p_store_id: storeId },
  );
  if (error) throw error;

  const parsed = livePromotionsSchema.parse(data);
  return {
    products: new Map(
      parsed.products.map((product) => [
        product.product_id,
        {
          price: product.price,
          promotionName: product.promotion_name,
        },
      ]),
    ),
    freeDeliveryAbove:
      parsed.free_delivery?.min_subtotal ?? null,
    orderDiscounts: parsed.order_discounts.map(
      (discount) => ({
        id: discount.id,
        name: discount.name,
        minSubtotal: discount.min_subtotal,
        mode: discount.mode,
        value: discount.value,
      }),
    ),
  };
}
