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
  deliveryFeeFor,
  findZoneByName,
  OTHER_ZONE,
  type DeliveryZone,
} from "@/lib/store/delivery-zones";

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
  /**
   * Bairro escolhido na lista da loja: id do bairro, OTHER_ZONE para "Outro
   * bairro" ou "" enquanto não escolheu. Só vale em loja que cobra por
   * bairro.
   */
  zoneId: string;
  /** Nome do bairro: o do cadastro, ou o que o cliente digitou. */
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
  zoneId: "",
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
  /**
   * A loja cobra por bairro e o cliente ainda não escolheu o dele: a taxa
   * não entrou no total.
   */
  isDeliveryFeePending: boolean;
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
    deliveryZones?: readonly DeliveryZone[];
  },
  mode: OrderMode,
  zoneId = "",
): CheckoutTotals {
  const zones = rules.deliveryZones ?? [];
  const delivery = mode === "ENTREGA";
  const isFree =
    rules.freeDeliveryAbove !== null &&
    subtotal >= rules.freeDeliveryAbove;
  const needsZone = zones.length > 0 && zoneId === "";
  const isDeliveryFeePending =
    delivery && !isFree && needsZone;
  const zoneFee = deliveryFeeFor(
    {
      deliveryFee: rules.deliveryFee,
      deliveryZones: zones,
    },
    zoneId,
  );
  const deliveryFee =
    delivery && !isFree && !needsZone ? zoneFee : 0;
  // Ainda não há cupom nem promoção: o desconto é sempre zero.
  const discount = 0;

  return {
    subtotal,
    deliveryFee,
    isDeliveryFeePending,
    // Sem bairro escolhido não dá para dizer quanto deixou de ser cobrado.
    waivedDeliveryFee:
      delivery && isFree && !needsZone && zoneFee > 0
        ? zoneFee
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
  "address.zoneId": "zoneId",
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
    /** Bairros com taxa própria; vazio em loja de taxa única. */
    deliveryZones?: readonly DeliveryZone[];
  },
): CheckoutValidation {
  const errors: CheckoutErrors = {};
  const zones = order.deliveryZones ?? [];
  const zone = zones.find(
    (candidate) => candidate.id === fields.zoneId,
  );

  // Em loja que cobra por bairro, o bairro sai da lista (ou "Outro bairro").
  if (
    fields.mode === "ENTREGA" &&
    zones.length > 0 &&
    !zone &&
    fields.zoneId !== OTHER_ZONE
  ) {
    errors.zoneId = "Escolha o bairro.";
  }

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
            // Bairro da lista vai com o nome do cadastro; se ainda falta
            // escolher, o erro já está acima e o texto só evita outro.
            district: zone
              ? zone.name
              : errors.zoneId
                ? "—"
                : fields.district,
            zoneId: zone?.id,
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
  "zoneId",
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

// Recusas que se resolvem no carrinho, não no formulário.
const CART_REFUSALS = new Set<CreateOrderError["code"]>([
  "store_closed",
  "item_unavailable",
  "invalid_complement",
  "minimum_order",
]);

/**
 * A recusa manda o cliente de volta ao carrinho (loja fechou, item esgotou,
 * complemento mudou, pedido abaixo do mínimo)? As demais ficam no checkout.
 */
export function returnsToCart(
  error: CreateOrderError,
): boolean {
  return CART_REFUSALS.has(error.code);
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

/**
 * Formulário inicial: vazio, ou com os dados do último pedido. Em loja que
 * cobra por bairro, o bairro guardado como texto vira o da lista quando o
 * nome bate; senão, cai em "Outro bairro" com o texto dele.
 */
export function prefillCheckout(
  saved: SavedCustomer | null,
  zones: readonly DeliveryZone[] = [],
): CheckoutFields {
  if (!saved) return EMPTY_CHECKOUT;
  const fields: CheckoutFields = {
    ...EMPTY_CHECKOUT,
    name: saved.name,
    phone: saved.phone,
    ...saved.address,
  };
  if (zones.length === 0 || !fields.district) return fields;

  const zone = findZoneByName(zones, fields.district);
  return zone
    ? { ...fields, zoneId: zone.id, district: zone.name }
    : { ...fields, zoneId: OTHER_ZONE };
}
