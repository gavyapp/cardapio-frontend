// Textos das promoções no painel, como no protótipo: tipo, regra, quando
// vale e o nome automático. Puro, sem React.
import type {
  PromotionFormat,
  PromotionKind,
  PromotionSchedule,
} from "@/lib/data/promotions";
import { formatCurrency } from "@/lib/format";

export const PROMOTION_KIND_LABEL: Record<
  PromotionKind,
  string
> = {
  product_discount: "Desconto em produtos",
  free_delivery: "Entrega grátis",
  order_discount: "Desconto no pedido",
};

/** Produto como a promoção precisa: nome e preço cheio. */
export type PromotionProduct = {
  id: string;
  name: string;
  price: number;
};

type ProductRule = Extract<
  PromotionFormat,
  { kind: "product_discount" }
>["rule"];

/**
 * Preço com o desconto, arredondado para centavos (meio para cima), como
 * private.promotional_price. Null quando não fica entre 0 e o preço cheio:
 * aí a promoção não vale para o produto.
 */
export function promotionalPrice(
  price: number,
  rule: ProductRule,
): number | null {
  const cents = Math.round(price * 100);
  const valueCents = Math.round(rule.value * 100);
  const result =
    rule.mode === "percent"
      ? Math.round((cents * (100 - rule.value)) / 100)
      : rule.mode === "amount_off"
        ? cents - valueCents
        : valueCents;
  return result > 0 && result < cents ? result / 100 : null;
}

/** 42 → 37: "−12%". */
export function discountTag(
  price: number,
  promotional: number,
): string {
  return `−${Math.round((1 - promotional / price) * 100)}%`;
}

/**
 * Valor curto para nomes e banners: 70 → "R$ 70"; 9.9 → "R$ 9,90". Com o
 * mesmo espaço sem quebra de formatCurrency.
 */
export function formatShortCurrency(value: number): string {
  return Number.isInteger(value)
    ? `R$\u00a0${value}`
    : formatCurrency(value);
}

function percentText(value: number): string {
  return `${String(value).replace(".", ",")}%`;
}

/** "The Classic: R$ 42,00 → R$ 37,00 (−12%)" de um produto. */
export function productResultLine(
  product: PromotionProduct,
  rule: ProductRule,
): { text: string; applies: boolean } {
  const promotional = promotionalPrice(product.price, rule);
  if (promotional === null) {
    return {
      text: `${product.name}: ${formatCurrency(product.price)}`,
      applies: false,
    };
  }
  return {
    text: `${product.name}: ${formatCurrency(product.price)} → ${formatCurrency(promotional)} (${discountTag(product.price, promotional)})`,
    applies: true,
  };
}

/** Regra da linha da lista: "3 produtos · 20% de desconto". */
export function describeRule(
  format: PromotionFormat,
  products: readonly PromotionProduct[],
): string {
  switch (format.kind) {
    case "free_delivery":
      return format.rule.min_subtotal
        ? `Pedidos com entrega acima de ${formatCurrency(format.rule.min_subtotal)}`
        : "Todos os pedidos com entrega";
    case "order_discount":
      return `${format.rule.mode === "percent" ? percentText(format.rule.value) : formatCurrency(format.rule.value)} de desconto em pedidos acima de ${formatCurrency(format.rule.min_subtotal)}`;
    case "product_discount": {
      const { rule } = format;
      if (products.length === 1) {
        return productResultLine(products[0], rule).text;
      }
      const discount =
        rule.mode === "percent"
          ? `${percentText(rule.value)} de desconto`
          : rule.mode === "amount_off"
            ? `${formatCurrency(rule.value)} a menos`
            : `novo preço ${formatCurrency(rule.value)}`;
      return `${products.length} produtos · ${discount}`;
    }
  }
}

const WEEKDAY_SHORT = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

/** Ordem da semana na tela: segunda primeiro, domingo por último. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function weekdayShort(weekday: number): string {
  return WEEKDAY_SHORT[weekday];
}

/** "18:00" → "18h"; "18:30" → "18h30". */
function hourText(time: string): string {
  return time.replace(":00", "h").replace(":", "h");
}

/** "AAAA-MM-DD" → "DD/MM". */
function dayText(date: string): string {
  return date
    ? date.split("-").reverse().slice(0, 2).join("/")
    : "…";
}

/** "Sempre", "Sex, Sáb e Dom, 18h às 20h", "De 01/12 a 24/12". */
export function describeSchedule(
  schedule: PromotionSchedule,
): string {
  switch (schedule.type) {
    case "always":
      return "Sempre";
    case "dates":
      return `De ${dayText(schedule.start)} a ${dayText(schedule.end)}`;
    case "weekly": {
      const days = WEEK_ORDER.filter((day) =>
        schedule.weekdays.includes(day),
      ).map(weekdayShort);
      const text =
        days.length === 7
          ? "Todos os dias"
          : days.length === 0
            ? "Nenhum dia"
            : days.length === 1
              ? days[0]
              : `${days.slice(0, -1).join(", ")} e ${days[days.length - 1]}`;
      return schedule.from && schedule.to
        ? `${text}, ${hourText(schedule.from)} às ${hourText(schedule.to)}`
        : text;
    }
  }
}

/** Regra ainda sendo preenchida no editor: valores podem faltar. */
export type RuleDraft =
  | {
      kind: "product_discount";
      mode: ProductRule["mode"];
      value: number | null;
    }
  | { kind: "free_delivery"; minSubtotal: number | null }
  | {
      kind: "order_discount";
      minSubtotal: number | null;
      mode: "percent" | "amount_off";
      value: number | null;
    };

/**
 * Nome a partir da regra: "Entrega grátis acima de R$ 70", "R$ 10 off em
 * pedidos acima de R$ 100", "The Classic −12%", "3 produtos −20%".
 */
export function automaticName(
  rule: RuleDraft,
  products: readonly PromotionProduct[],
): string {
  if (rule.kind === "free_delivery") {
    return rule.minSubtotal
      ? `Entrega grátis acima de ${formatShortCurrency(rule.minSubtotal)}`
      : "Entrega grátis";
  }
  if (rule.kind === "order_discount") {
    const discount = rule.value
      ? rule.mode === "percent"
        ? `${percentText(rule.value)} off`
        : `${formatShortCurrency(rule.value)} off`
      : "Desconto";
    return rule.minSubtotal
      ? `${discount} em pedidos acima de ${formatShortCurrency(rule.minSubtotal)}`
      : `${discount} no pedido`;
  }

  if (products.length === 0) return "Desconto em produtos";
  const one = products.length === 1 ? products[0] : null;
  let discount = "";
  if (rule.value) {
    const promotional = one
      ? promotionalPrice(one.price, {
          mode: rule.mode,
          value: rule.value,
        })
      : null;
    discount =
      one && promotional !== null
        ? discountTag(one.price, promotional)
        : rule.mode === "percent"
          ? `−${percentText(rule.value)}`
          : rule.mode === "amount_off"
            ? `${formatShortCurrency(rule.value)} off`
            : `por ${formatShortCurrency(rule.value)}`;
  }
  const subject = one
    ? one.name
    : `${products.length} produtos`;
  return discount ? `${subject} ${discount}` : subject;
}
