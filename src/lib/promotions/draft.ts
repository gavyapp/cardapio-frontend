// Formulário do editor de promoções: o que o lojista preenche em cada passo
// (Tipo, Regra, Quando vale), as mensagens de erro do protótipo e a
// promoção pronta para salvar. Puro, sem React.
import {
  parsePromotionFormat,
  type PromotionKind,
  type PromotionSchedule,
} from "@/lib/data/promotions";
import {
  formatAmountInput,
  formatCurrency,
  parseAmountInput,
} from "@/lib/format";

import {
  automaticName,
  promotionalPrice,
  type PromotionProduct,
  type RuleDraft,
} from "./describe";

/** "?promocao=novo" ou "?promocao=<id>" abre o editor de promoção. */
export const PROMOTION_PARAM = "promocao";

export type ProductMode =
  "percent" | "amount_off" | "fixed_price";
export type OrderMode = "amount_off" | "percent";
export type ScheduleType = PromotionSchedule["type"];

export type PromotionForm = {
  kind: PromotionKind | null;
  productMode: ProductMode;
  /** Texto do campo: "20" em %, "5,00" em reais. */
  productValue: string;
  productIds: string[];
  minSubtotal: string;
  orderMode: OrderMode;
  orderValue: string;
  name: string;
  /** O nome sai da regra até o lojista escrever outro. */
  autoName: boolean;
  scheduleType: ScheduleType;
  weekdays: number[];
  allDay: boolean;
  from: string;
  to: string;
  start: string;
  end: string;
  isActive: boolean;
};

/** Promoção como a action recebe; o formato é conferido de novo lá. */
export type PromotionDraft = {
  id?: string;
  name: string;
  kind: string;
  rule: unknown;
  schedule: unknown;
  isActive: boolean;
  productIds: string[];
};

/** Promoção salva, como o editor recebe. */
export type EditablePromotion = {
  id: string;
  name: string;
  isActive: boolean;
  schedule: PromotionSchedule;
  productIds: string[];
} & (
  | {
      kind: "product_discount";
      rule: { mode: ProductMode; value: number };
    }
  | {
      kind: "free_delivery";
      rule: { min_subtotal: number };
    }
  | {
      kind: "order_discount";
      rule: {
        min_subtotal: number;
        mode: OrderMode;
        value: number;
      };
    }
);

const DEFAULT_HOURS = { from: "18:00", to: "20:00" };

/** Texto do campo de desconto: % sem casas fixas, reais com centavos. */
function valueText(mode: string, value: number): string {
  return mode === "percent"
    ? String(value).replace(".", ",")
    : formatAmountInput(value);
}

export function initialForm(
  promotion: EditablePromotion | null,
  products: readonly PromotionProduct[],
): PromotionForm {
  const form: PromotionForm = {
    kind: null,
    productMode: "percent",
    productValue: "",
    productIds: [],
    minSubtotal: "",
    orderMode: "amount_off",
    orderValue: "",
    name: "",
    autoName: true,
    scheduleType: "always",
    weekdays: [],
    allDay: true,
    ...DEFAULT_HOURS,
    start: "",
    end: "",
    isActive: true,
  };
  if (!promotion) return form;

  form.kind = promotion.kind;
  form.name = promotion.name;
  form.isActive = promotion.isActive;
  form.productIds = [...promotion.productIds];
  switch (promotion.kind) {
    case "product_discount":
      form.productMode = promotion.rule.mode;
      form.productValue = valueText(
        promotion.rule.mode,
        promotion.rule.value,
      );
      break;
    case "free_delivery":
      form.minSubtotal = promotion.rule.min_subtotal
        ? formatAmountInput(promotion.rule.min_subtotal)
        : "";
      break;
    case "order_discount":
      form.minSubtotal = formatAmountInput(
        promotion.rule.min_subtotal,
      );
      form.orderMode = promotion.rule.mode;
      form.orderValue = valueText(
        promotion.rule.mode,
        promotion.rule.value,
      );
      break;
  }

  const schedule = promotion.schedule;
  form.scheduleType = schedule.type;
  if (schedule.type === "weekly") {
    form.weekdays = [...schedule.weekdays];
    form.allDay = !schedule.from;
    form.from = schedule.from ?? DEFAULT_HOURS.from;
    form.to = schedule.to ?? DEFAULT_HOURS.to;
  }
  if (schedule.type === "dates") {
    form.start = schedule.start;
    form.end = schedule.end;
  }

  // Sem coluna para o "nome automático": é automático enquanto o nome
  // salvo for igual ao que a regra gera.
  form.autoName =
    promotion.name ===
    automaticName(
      ruleDraft(form),
      selectedProducts(form, products),
    );
  return form;
}

/** Valor digitado → número; vazio ou inválido vira null. */
function number(text: string): number | null {
  return parseAmountInput(text);
}

export function ruleDraft(form: PromotionForm): RuleDraft {
  switch (form.kind) {
    case "free_delivery":
      return {
        kind: "free_delivery",
        minSubtotal: number(form.minSubtotal),
      };
    case "order_discount":
      return {
        kind: "order_discount",
        minSubtotal: number(form.minSubtotal),
        mode: form.orderMode,
        value: number(form.orderValue),
      };
    default:
      return {
        kind: "product_discount",
        mode: form.productMode,
        value: number(form.productValue),
      };
  }
}

/** Produtos escolhidos que ainda existem, na ordem da escolha. */
export function selectedProducts(
  form: PromotionForm,
  products: readonly PromotionProduct[],
): PromotionProduct[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return form.productIds.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

/** Nome que vai ser salvo. */
export function promotionName(
  form: PromotionForm,
  products: readonly PromotionProduct[],
): string {
  return form.autoName
    ? automaticName(
        ruleDraft(form),
        selectedProducts(form, products),
      )
    : form.name;
}

export function scheduleOf(
  form: PromotionForm,
): PromotionSchedule {
  switch (form.scheduleType) {
    case "always":
      return { type: "always" };
    case "dates":
      return {
        type: "dates",
        start: form.start,
        end: form.end,
      };
    case "weekly":
      return form.allDay
        ? { type: "weekly", weekdays: [...form.weekdays] }
        : {
            type: "weekly",
            weekdays: [...form.weekdays],
            from: form.from,
            to: form.to,
          };
  }
}

/**
 * Promoção de produto em uso, por produto: quem já segura cada produto. O
 * editor não deixa escolher esses produtos (ADR 0006).
 */
export type HeldProducts = ReadonlyMap<string, string>;

/**
 * Primeiro erro do passo, com as mensagens do protótipo. Null quando o
 * passo está completo.
 */
export function stepError(
  form: PromotionForm,
  step: 0 | 1 | 2,
  products: readonly PromotionProduct[],
  held: HeldProducts,
): string | null {
  if (step === 0) {
    return form.kind ? null : "Escolha o tipo de promoção.";
  }

  if (step === 1) {
    const rule = ruleDraft(form);
    if (rule.kind === "product_discount") {
      const chosen = selectedProducts(form, products);
      if (chosen.length === 0)
        return "Escolha pelo menos 1 produto.";
      if (!rule.value) return "Informe o desconto.";
      if (rule.mode === "percent" && rule.value >= 100) {
        return "O desconto em % precisa ser menor que 100.";
      }
      const bad = chosen.find(
        (product) =>
          promotionalPrice(product.price, {
            mode: rule.mode,
            value: rule.value ?? 0,
          }) === null,
      );
      if (bad) {
        return `O preço com desconto de ${bad.name} precisa ficar entre R$ 0,00 e ${formatCurrency(bad.price)}.`;
      }
      const taken = chosen.find((product) =>
        held.has(product.id),
      );
      if (taken && form.isActive) {
        return `${taken.name} já está em "${held.get(taken.id)}".`;
      }
    } else {
      if (
        !rule.minSubtotal &&
        rule.kind !== "free_delivery"
      ) {
        return "Informe o valor mínimo do pedido.";
      }
      if (rule.kind === "order_discount") {
        if (!rule.value) return "Informe o desconto.";
        if (rule.mode === "percent" && rule.value >= 100) {
          return "O desconto em % precisa ser menor que 100.";
        }
        if (
          rule.mode === "amount_off" &&
          rule.value >= (rule.minSubtotal ?? 0)
        ) {
          return "O desconto precisa ser menor que o valor mínimo.";
        }
      }
    }
    if (!form.autoName && !form.name.trim()) {
      return "Dê um nome à promoção.";
    }
    return null;
  }

  if (form.scheduleType === "weekly") {
    if (form.weekdays.length === 0)
      return "Escolha pelo menos 1 dia.";
    if (!form.allDay && form.from >= form.to) {
      return "O horário de início precisa ser antes do fim.";
    }
  }
  if (form.scheduleType === "dates") {
    if (!form.start || !form.end)
      return "Informe as datas de início e fim.";
    if (form.start > form.end) {
      return "A data de início precisa ser antes da data de fim.";
    }
  }
  return null;
}

/**
 * Promoção pronta para salvar, conferida pelo schema zod do formato (o
 * mesmo dos checks do banco). Devolve a mensagem do primeiro erro.
 */
export function toDraft(
  form: PromotionForm,
  id: string | undefined,
  products: readonly PromotionProduct[],
):
  | { ok: true; draft: PromotionDraft }
  | { ok: false; error: string } {
  const rule = ruleDraft(form);
  const draft: PromotionDraft = {
    id,
    name: promotionName(form, products).trim(),
    kind: rule.kind,
    rule:
      rule.kind === "product_discount"
        ? { mode: rule.mode, value: rule.value }
        : rule.kind === "free_delivery"
          ? { min_subtotal: rule.minSubtotal ?? 0 }
          : {
              min_subtotal: rule.minSubtotal,
              mode: rule.mode,
              value: rule.value,
            },
    schedule: scheduleOf(form),
    isActive: form.isActive,
    productIds:
      rule.kind === "product_discount"
        ? selectedProducts(form, products).map((p) => p.id)
        : [],
  };
  const parsed = parsePromotionFormat(draft);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Confira os dados da promoção.",
    };
  }
  return { ok: true, draft };
}
