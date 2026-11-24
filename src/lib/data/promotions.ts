// Formato das promoções (colunas promotions.kind, rule e schedule).
//
// Mesmas regras dos checks do banco (ADR 0006): o formulário do painel usa
// este schema para recusar antes de salvar, e quem lê promoções do banco
// valida com readPromotion. Tipo ou campo novo entra aqui e na migration.
import { z } from "zod";

import type { Tables } from "@/lib/database.types";

export const promotionKinds = [
  "product_discount",
  "free_delivery",
  "order_discount",
] as const;

export type PromotionKind = (typeof promotionKinds)[number];

/** Reais com até 2 casas. */
function hasCents(value: number) {
  return (
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-9
  );
}

const amount = z
  .number({ error: "Informe um valor." })
  .finite()
  .refine(hasCents, "Use no máximo 2 casas decimais.");

const discountValue = amount.refine(
  (value) => value > 0,
  "Informe o desconto.",
);

const minSubtotal = amount.refine(
  (value) => value >= 0,
  "O valor mínimo não pode ser negativo.",
);

const percentBelow100 = <
  T extends { mode: string; value: number },
>(
  rule: T,
) => rule.mode !== "percent" || rule.value < 100;

const percentMessage = {
  message: "O desconto em % precisa ser menor que 100.",
  path: ["value"],
};

// Desconto em produtos: os produtos ficam em promotion_products.
export const productDiscountRuleSchema = z
  .strictObject({
    mode: z.enum(["percent", "amount_off", "fixed_price"]),
    value: discountValue,
  })
  .refine(percentBelow100, percentMessage);

// Entrega grátis a partir do subtotal. 0 = qualquer pedido com entrega.
export const freeDeliveryRuleSchema = z.strictObject({
  min_subtotal: minSubtotal,
});

// Desconto no pedido a partir do subtotal.
export const orderDiscountRuleSchema = z
  .strictObject({
    min_subtotal: minSubtotal.refine(
      (value) => value > 0,
      "Informe o valor mínimo do pedido.",
    ),
    mode: z.enum(["percent", "amount_off"]),
    value: discountValue,
  })
  .refine(percentBelow100, percentMessage)
  .refine(
    (rule) =>
      rule.mode !== "amount_off" ||
      rule.value < rule.min_subtotal,
    {
      message:
        "O desconto precisa ser menor que o valor mínimo.",
      path: ["value"],
    },
  );

export type ProductDiscountRule = z.infer<
  typeof productDiscountRuleSchema
>;
export type FreeDeliveryRule = z.infer<
  typeof freeDeliveryRuleSchema
>;
export type OrderDiscountRule = z.infer<
  typeof orderDiscountRuleSchema
>;

const hour = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "Use o formato HH:MM.",
  );

/** "AAAA-MM-DD" de uma data que existe. */
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data.")
  .refine((text) => {
    const [y, m, d] = text.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return (
      date.getUTCFullYear() === y &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === d
    );
  }, "Informe uma data válida.");

// Quando vale, no fuso de São Paulo. weekdays: 0 = domingo … 6 = sábado.
// Sem from e to, vale o dia todo; com eles, de from (inclusive) até to
// (exclusive), sem atravessar a meia-noite. dates vale de start a end, dias
// inteiros.
export const promotionScheduleSchema = z.discriminatedUnion(
  "type",
  [
    z.strictObject({ type: z.literal("always") }),
    z
      .strictObject({
        type: z.literal("weekly"),
        weekdays: z
          .array(z.int().min(0).max(6))
          .min(1, "Escolha pelo menos 1 dia.")
          .refine(
            (days) => new Set(days).size === days.length,
            "Cada dia entra uma vez só.",
          ),
        from: hour.optional(),
        to: hour.optional(),
      })
      .refine(
        (s) =>
          (s.from === undefined) === (s.to === undefined),
        {
          message: "Informe o início e o fim.",
          path: ["to"],
        },
      )
      .refine((s) => !s.from || !s.to || s.from < s.to, {
        message:
          "O horário de início precisa ser antes do fim.",
        path: ["to"],
      }),
    z
      .strictObject({
        type: z.literal("dates"),
        start: day,
        end: day,
      })
      .refine((s) => s.start <= s.end, {
        message:
          "A data de início precisa ser antes da data de fim.",
        path: ["end"],
      }),
  ],
);

export type PromotionSchedule = z.infer<
  typeof promotionScheduleSchema
>;

const promotionFormatSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("product_discount"),
    rule: productDiscountRuleSchema,
  }),
  z.object({
    kind: z.literal("free_delivery"),
    rule: freeDeliveryRuleSchema,
  }),
  z.object({
    kind: z.literal("order_discount"),
    rule: orderDiscountRuleSchema,
  }),
]);

/** Tipo e regra juntos: a regra depende do tipo. */
export type PromotionFormat = z.infer<
  typeof promotionFormatSchema
>;

export type Promotion = PromotionFormat & {
  id: string;
  storeId: string;
  name: string;
  schedule: PromotionSchedule;
  isActive: boolean;
};

/** Valida tipo, regra e período, como os checks do banco. */
export function parsePromotionFormat(input: {
  kind: string;
  rule: unknown;
  schedule: unknown;
}) {
  return z
    .object({ schedule: promotionScheduleSchema })
    .and(promotionFormatSchema)
    .safeParse(input);
}

/**
 * Lê uma linha de promotions. Lança erro se o formato não bate, o que só
 * acontece se o banco e este schema divergirem.
 */
export function readPromotion(
  row: Tables<"promotions">,
): Promotion {
  const format = promotionFormatSchema.parse(row);

  return {
    ...format,
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    schedule: promotionScheduleSchema.parse(row.schedule),
    isActive: row.is_active,
  };
}
