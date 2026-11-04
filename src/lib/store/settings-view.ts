// Traduz o que vem do banco para o que a tela de configurações mostra.
import type { Enums } from "@/lib/database.types";
import type { StoreShift } from "@/lib/data/store-details";
import {
  formatAmountInput,
  formatPhone,
} from "@/lib/format";
import { rootDomain } from "@/lib/routing/subdomain";

/** Host público do cardápio no domínio raiz; em dev, localhost:3000. */
export function menuHostFor(slug: string): string {
  const root = rootDomain() || "localhost:3000";
  return `${slug}.${root}`;
}

// Semana começando na segunda, como no protótipo.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const WEEKDAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

/** "18:30:00" → "18:30". */
function formatTime(time: string): string {
  return time.slice(0, 5);
}

export type DayShiftView = {
  id: string | null;
  weekday: number;
  label: string;
  opensAt: string | null;
  closesAt: string | null;
};

/**
 * Um item por dia, segunda a domingo, com o primeiro turno do dia ou null
 * ("Fechado"). O editor trabalha com um turno por dia.
 */
export function dayShifts(
  shifts: readonly StoreShift[],
): DayShiftView[] {
  return WEEK_ORDER.map((weekday) => {
    const first = shifts.find(
      (shift) => shift.weekday === weekday,
    );
    return {
      id: first?.id ?? null,
      weekday,
      label: WEEKDAY_LABELS[weekday],
      opensAt: first ? formatTime(first.opensAt) : null,
      closesAt: first ? formatTime(first.closesAt) : null,
    };
  });
}

const PAYMENT_LABELS: Record<
  Enums<"payment_method">,
  string
> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão na maquininha",
};

const PAYMENT_ORDER: Enums<"payment_method">[] = [
  "PIX",
  "DINHEIRO",
  "CARTAO",
];

export type PaymentMethodView = {
  id: string;
  label: string;
  enabled: boolean;
};

/** Todas as formas, marcando as aceitas pela loja. */
export function paymentMethodsView(
  accepted: readonly Enums<"payment_method">[],
): PaymentMethodView[] {
  return PAYMENT_ORDER.map((method) => ({
    id: method,
    label: PAYMENT_LABELS[method],
    enabled: accepted.includes(method),
  }));
}

export function deliveryFeeView(fee: number): string {
  return formatAmountInput(fee);
}

export function phoneView(phone: string | null): string {
  return phone ? formatPhone(phone) : "";
}
