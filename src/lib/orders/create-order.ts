// Contrato da criação de pedido: o que o checkout manda para
// POST /api/pedidos e o que a rota responde. Checkout e rota importam daqui.
//
// O navegador manda só ids e quantidades. Nome, preço, taxa e total são
// calculados pelo banco (create_order), nunca aceitos de fora.
import { z } from "zod";

import { Constants } from "@/lib/database.types";

export const CREATE_ORDER_PATH = "/api/pedidos";

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max);
const optionalText = (max: number) =>
  text(max)
    .optional()
    .transform((value) => value || undefined);

const phone = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine(
    (digits) =>
      digits.length === 10 || digits.length === 11,
    "Informe o celular com DDD.",
  );

const addressSchema = z.object({
  street: requiredText(120, "Informe a rua."),
  number: requiredText(20, "Informe o número."),
  district: requiredText(80, "Informe o bairro."),
  complement: optionalText(80),
  reference: optionalText(120),
});

const itemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(20),
  notes: optionalText(140),
  complements: z
    .array(
      z.object({
        complementId: z.uuid(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .max(50)
    .default([]),
});

export const createOrderSchema = z
  .object({
    storeId: z.uuid(),
    mode: z.enum(Constants.public.Enums.order_mode),
    customer: z.object({
      name: requiredText(80, "Informe seu nome."),
      phone,
    }),
    /** Obrigatório em ENTREGA; ignorado em RETIRADA. */
    address: addressSchema.optional(),
    paymentMethod: z.enum(
      Constants.public.Enums.payment_method,
    ),
    /** "Troco para": só vale com DINHEIRO. */
    changeFor: z.number().positive().max(99999).optional(),
    notes: optionalText(280),
    items: z
      .array(itemSchema)
      .min(1, "O pedido está vazio.")
      .max(50),
  })
  .superRefine((order, context) => {
    if (order.mode === "ENTREGA" && !order.address) {
      context.addIssue({
        code: "custom",
        path: ["address"],
        message: "Informe o endereço de entrega.",
      });
    }
  })
  .transform((order) => ({
    ...order,
    address:
      order.mode === "ENTREGA" ? order.address : undefined,
    changeFor:
      order.paymentMethod === "DINHEIRO"
        ? order.changeFor
        : undefined,
  }));

/** O que o checkout envia (antes da validação). */
export type CreateOrderRequest = z.input<
  typeof createOrderSchema
>;
/** O pedido já validado, como a rota repassa ao banco. */
export type CreateOrderInput = z.output<
  typeof createOrderSchema
>;

export type CreatedOrder = {
  number: number;
  /** Para o link de acompanhamento do cliente. */
  publicToken: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
};

/**
 * Motivos de recusa. Os que vêm do banco têm o mesmo nome do HINT do
 * create_order; "rate_limited" e "unexpected" nascem na rota.
 */
export const CREATE_ORDER_ERROR_CODES = [
  "invalid_request",
  "rate_limited",
  "store_unavailable",
  "store_closed",
  "item_unavailable",
  "invalid_complement",
  "minimum_order",
  "payment_not_accepted",
  "invalid_change",
  "unexpected",
] as const;

export type CreateOrderErrorCode =
  (typeof CREATE_ORDER_ERROR_CODES)[number];

export type CreateOrderError = {
  code: CreateOrderErrorCode;
  /** Texto pronto para mostrar ao cliente. */
  message: string;
  /** Posições, em `items`, dos itens que causaram a recusa. */
  itemIndexes?: number[];
  /** Erros de preenchimento por campo ("customer.phone" → mensagem). */
  fields?: Record<string, string>;
};

export type CreateOrderResponse =
  | { ok: true; order: CreatedOrder }
  | { ok: false; error: CreateOrderError };

const MESSAGES: Record<CreateOrderErrorCode, string> = {
  invalid_request: "Confira os dados do pedido.",
  rate_limited:
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  store_unavailable: "Loja não encontrada.",
  store_closed: "A loja está fechada agora.",
  item_unavailable:
    "Um item do pedido não está mais disponível.",
  invalid_complement:
    "As opções de um item mudaram. Revise o item e tente de novo.",
  minimum_order:
    "O pedido não atinge o valor mínimo da loja.",
  payment_not_accepted:
    "A loja não aceita essa forma de pagamento.",
  invalid_change:
    "O troco precisa ser maior ou igual ao total do pedido.",
  unexpected:
    "Não foi possível enviar o pedido. Tente de novo.",
};

const STATUS: Record<CreateOrderErrorCode, number> = {
  invalid_request: 400,
  rate_limited: 429,
  store_unavailable: 404,
  store_closed: 409,
  item_unavailable: 409,
  invalid_complement: 409,
  minimum_order: 409,
  payment_not_accepted: 409,
  invalid_change: 409,
  unexpected: 500,
};

export function createOrderError(
  code: CreateOrderErrorCode,
  extra: Pick<
    CreateOrderError,
    "itemIndexes" | "fields"
  > = {},
): { status: number; body: CreateOrderResponse } {
  return {
    status: STATUS[code],
    body: {
      ok: false,
      error: { code, message: MESSAGES[code], ...extra },
    },
  };
}

/** Erros do zod por campo: { "customer.phone": "Informe o celular com DDD." }. */
export function fieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "pedido";
    fields[path] ??= issue.message;
  }
  return fields;
}

// Recusas que o create_order sinaliza no HINT.
const DATABASE_REFUSALS = new Set<CreateOrderErrorCode>([
  "invalid_request",
  "store_unavailable",
  "store_closed",
  "item_unavailable",
  "invalid_complement",
  "minimum_order",
  "payment_not_accepted",
  "invalid_change",
]);

/**
 * Traduz a recusa do banco (HINT e DETAIL) para o erro da rota. Nas recusas
 * de item, o DETAIL é o id do produto: viram as posições dos itens desse
 * produto no pedido. HINT desconhecido devolve null, e a rota trata como
 * erro inesperado.
 */
export function refusalFromDatabase(
  refusal: { hint: string | null; detail: string | null },
  items: readonly { productId: string }[],
): Pick<CreateOrderError, "code" | "itemIndexes"> | null {
  const code = refusal.hint as CreateOrderErrorCode | null;
  if (!code || !DATABASE_REFUSALS.has(code)) return null;

  if (
    code !== "item_unavailable" &&
    code !== "invalid_complement"
  ) {
    return { code };
  }
  const itemIndexes = items.flatMap((item, index) =>
    item.productId === refusal.detail ? [index] : [],
  );
  return itemIndexes.length
    ? { code, itemIndexes }
    : { code };
}
