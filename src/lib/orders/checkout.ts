// Regras do checkout do cliente: totais, validação do formulário, montagem
// do pedido para POST /api/pedidos e os dados do cliente guardados no
// aparelho. Puro, sem React, para ser testável.
import { z } from "zod";

import type { CartItem } from "@/lib/catalog/cart";
import type { Enums } from "@/lib/database.types";
import {
  formatCurrency,
  parseAmountInput,
} from "@/lib/format";

import {
  createOrderSchema,
  fieldErrors,
  type CreateOrderError,
  type CreateOrderRequest,
} from "./create-order";

type OrderMode = Enums<"order_mode">;
type PaymentMethod = Enums<"payment_method">;

/** O formulário como o cliente digita. */
export type CheckoutFields = {
  mode: OrderMode;
  name: string;
  phone: string;
  street: string;
  number: string;
  district: string;
  complement: string;
  reference: string;
  /** Null até o cliente escolher: nenhuma vem marcada. */
  paymentMethod: PaymentMethod | null;
  /** "Troco para", com a máscara do campo ("50,00"). */
  changeFor: string;
};

export type CheckoutField = keyof CheckoutFields;
export type CheckoutErrors = Partial<
  Record<CheckoutField, string>
>;

export const EMPTY_CHECKOUT: CheckoutFields = {
  mode: "ENTREGA",
  name: "",
  phone: "",
  street: "",
  number: "",
  district: "",
  complement: "",
  reference: "",
  paymentMethod: null,
  changeFor: "",
};

// ---------------------------------------------------------------------------
// Totais
// ---------------------------------------------------------------------------

export type CheckoutTotals = {
  subtotal: number;
  deliveryFee: number;
  /** Taxa que deixou de ser cobrada pela entrega grátis; null se não houve. */
  waivedDeliveryFee: number | null;
  discount: number;
  total: number;
};

const round = (value: number) =>
  Math.round(value * 100) / 100;

/** Totais mostrados no resumo, pela mesma regra do create_order. */
export function checkoutTotals(
  subtotal: number,
  rules: {
    deliveryFee: number;
    freeDeliveryAbove: number | null;
  },
  mode: OrderMode,
): CheckoutTotals {
  const isFree =
    rules.freeDeliveryAbove !== null &&
    subtotal >= rules.freeDeliveryAbove;
  const deliveryFee =
    mode === "ENTREGA" && !isFree ? rules.deliveryFee : 0;
  // Ainda não há cupom nem promoção: o desconto é sempre zero.
  const discount = 0;

  return {
    subtotal,
    deliveryFee,
    waivedDeliveryFee:
      mode === "ENTREGA" && isFree && rules.deliveryFee > 0
        ? rules.deliveryFee
        : null,
    discount,
    total: round(subtotal + deliveryFee - discount),
  };
}

// ---------------------------------------------------------------------------
// Do formulário para o pedido
// ---------------------------------------------------------------------------

/** Itens do carrinho como a rota espera: só ids e quantidades. */
export function orderItemsFrom(
  items: readonly CartItem[],
): CreateOrderRequest["items"] {
  return items.map((item) => {
    const counts = new Map<string, number>();
    for (const optionId of Object.values(
      item.selection,
    ).flat()) {
      counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
    }
    return {
      productId: item.product.id,
      quantity: item.quantity,
      notes: item.notes || undefined,
      complements: [...counts].map(
        ([complementId, quantity]) => ({
          complementId,
          quantity,
        }),
      ),
    };
  });
}

// Caminho do erro na rota → campo do formulário.
const FIELD_BY_PATH: Record<string, CheckoutField> = {
  "customer.name": "name",
  "customer.phone": "phone",
  address: "street",
  "address.street": "street",
  "address.number": "number",
  "address.district": "district",
  "address.complement": "complement",
  "address.reference": "reference",
  paymentMethod: "paymentMethod",
  changeFor: "changeFor",
};

function errorsByField(
  fields: Record<string, string>,
): CheckoutErrors {
  const errors: CheckoutErrors = {};
  for (const [path, message] of Object.entries(fields)) {
    const field = FIELD_BY_PATH[path];
    if (field) errors[field] ??= message;
  }
  return errors;
}

export type CheckoutValidation =
  | { ok: true; request: CreateOrderRequest }
  | { ok: false; errors: CheckoutErrors };

/**
 * Confere o formulário antes de enviar. Usa o mesmo schema da rota e
 * acrescenta o que só o checkout sabe: pagamento ainda não escolhido e
 * troco menor que o total.
 */
export function validateCheckout(
  fields: CheckoutFields,
  order: {
    storeId: string;
    items: readonly CartItem[];
    total: number;
  },
): CheckoutValidation {
  const errors: CheckoutErrors = {};

  if (!fields.paymentMethod) {
    errors.paymentMethod = "Escolha a forma de pagamento.";
  }

  let changeFor: number | undefined;
  if (
    fields.paymentMethod === "DINHEIRO" &&
    fields.changeFor.trim()
  ) {
    const value = parseAmountInput(fields.changeFor);
    if (value === null || value <= 0) {
      errors.changeFor = "Informe um valor válido.";
    } else if (value < order.total) {
      errors.changeFor = `O troco precisa ser para ${formatCurrency(order.total)} ou mais.`;
    } else {
      changeFor = value;
    }
  }

  const request: CreateOrderRequest = {
    storeId: order.storeId,
    mode: fields.mode,
    customer: { name: fields.name, phone: fields.phone },
    address:
      fields.mode === "ENTREGA"
        ? {
            street: fields.street,
            number: fields.number,
            district: fields.district,
            complement: fields.complement,
            reference: fields.reference,
          }
        : undefined,
    // Sem escolha, o erro já está registrado acima; o valor aqui só deixa
    // o schema conferir os outros campos.
    paymentMethod: fields.paymentMethod ?? "PIX",
    changeFor,
    items: orderItemsFrom(order.items),
  };

  const parsed = createOrderSchema.safeParse(request);
  const all: CheckoutErrors = parsed.success
    ? errors
    : {
        ...errorsByField(fieldErrors(parsed.error)),
        ...errors,
      };

  return Object.keys(all).length
    ? { ok: false, errors: all }
    : { ok: true, request };
}

/** Campos na ordem da tela, para focar o primeiro com erro. */
export const CHECKOUT_FIELD_ORDER: CheckoutField[] = [
  "name",
  "phone",
  "street",
  "number",
  "district",
  "complement",
  "reference",
  "paymentMethod",
  "changeFor",
];

// ---------------------------------------------------------------------------
// Recusa da rota
// ---------------------------------------------------------------------------

/** Erros da rota que pertencem a um campo do formulário. */
export function fieldErrorsFromServer(
  error: CreateOrderError,
): CheckoutErrors {
  const errors = errorsByField(error.fields ?? {});
  if (error.code === "invalid_change") {
    errors.changeFor ??= error.message;
  }
  if (error.code === "payment_not_accepted") {
    errors.paymentMethod ??= error.message;
  }
  return errors;
}

/** Itens do carrinho apontados pela recusa (mesma ordem do pedido enviado). */
export function affectedItemKeys(
  error: CreateOrderError,
  items: readonly CartItem[],
): string[] {
  return (error.itemIndexes ?? []).flatMap((index) =>
    items[index] ? [items[index].key] : [],
  );
}

// ---------------------------------------------------------------------------
// Dados do cliente guardados no aparelho
// ---------------------------------------------------------------------------

/** Chave do localStorage: nome, celular e último endereço do cliente. */
export const CUSTOMER_STORAGE_KEY = "cardapio:cliente";

const savedCustomer = z.object({
  name: z.string(),
  phone: z.string(),
  address: z
    .object({
      street: z.string(),
      number: z.string(),
      district: z.string(),
      complement: z.string(),
      reference: z.string(),
    })
    .optional(),
});

export type SavedCustomer = z.infer<typeof savedCustomer>;

/** Lê o que está guardado. Conteúdo estragado vira null. */
export function parseSavedCustomer(
  raw: string | null,
): SavedCustomer | null {
  if (!raw) return null;
  try {
    const parsed = savedCustomer.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * O que guardar depois de um pedido. Pedido de retirada mantém o endereço
 * da última entrega.
 */
export function rememberCustomer(
  previous: SavedCustomer | null,
  fields: CheckoutFields,
): SavedCustomer {
  return {
    name: fields.name.trim(),
    phone: fields.phone.trim(),
    address:
      fields.mode === "ENTREGA"
        ? {
            street: fields.street.trim(),
            number: fields.number.trim(),
            district: fields.district.trim(),
            complement: fields.complement.trim(),
            reference: fields.reference.trim(),
          }
        : previous?.address,
  };
}

/** Formulário inicial: vazio, ou com os dados do último pedido. */
export function prefillCheckout(
  saved: SavedCustomer | null,
): CheckoutFields {
  if (!saved) return EMPTY_CHECKOUT;
  return {
    ...EMPTY_CHECKOUT,
    name: saved.name,
    phone: saved.phone,
    ...saved.address,
  };
}
