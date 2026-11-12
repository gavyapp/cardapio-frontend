// O que o cardápio público mostra sobre a loja em "Mais informações" e no
// rodapé: endereço, contatos, semana de funcionamento e entrega.
import type { Enums } from "@/lib/database.types";
import type { StoreRules } from "@/lib/data/store-settings";
import {
  formatCurrency,
  formatDuration,
  formatPhone,
} from "@/lib/format";
import type { Shift } from "@/lib/store/opening";

export type StoreAddress = {
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
};

/** "Rua das Acácias, 214 – Centro · Orleans – SC". Ignora partes vazias. */
export function formatFullAddress(
  address: StoreAddress,
): string {
  const street = [address.street, address.number]
    .filter(Boolean)
    .join(", ");
  const local = [street, address.district]
    .filter(Boolean)
    .join(" – ");
  const city = [address.city, address.state]
    .filter(Boolean)
    .join(" – ");
  return [local, city].filter(Boolean).join(" · ");
}

/** Busca do endereço no Google Maps, ou null sem endereço. */
export function mapUrlFor(
  address: StoreAddress,
): string | null {
  const query = formatFullAddress(address);
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export type PhoneLinks = {
  label: string;
  callUrl: string;
  whatsappUrl: string;
};

/** Telefone formatado e os links de ligar e de WhatsApp (Brasil, +55). */
export function phoneLinksFor(
  phone: string | null,
): PhoneLinks | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 11)
    return null;
  return {
    label: formatPhone(digits),
    callUrl: `tel:+55${digits}`,
    whatsappUrl: `https://wa.me/55${digits}`,
  };
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

export type WeekDay = {
  weekday: number;
  label: string;
  /** "18:30 – 23:00", dois turnos com " e "; null = fechado. */
  hours: string | null;
  isToday: boolean;
};

/** Os sete dias, de segunda a domingo, com o dia de hoje marcado. */
export function weekHours(
  shifts: readonly Shift[],
  todayWeekday: number,
): WeekDay[] {
  return WEEK_ORDER.map((weekday) => {
    const ranges = shifts
      .filter((shift) => shift.weekday === weekday)
      .map(
        (shift) =>
          `${shift.opensAt.slice(0, 5)} – ${shift.closesAt.slice(0, 5)}`,
      );
    return {
      weekday,
      label: WEEKDAY_LABELS[weekday],
      hours: ranges.length ? ranges.join(" e ") : null,
      isToday: weekday === todayWeekday,
    };
  });
}

const PAYMENT_LABELS: Record<
  Enums<"payment_method">,
  string
> = {
  PIX: "Pix",
  DINHEIRO: "dinheiro",
  CARTAO: "cartão na maquininha",
};
const PAYMENT_ORDER: Enums<"payment_method">[] = [
  "PIX",
  "DINHEIRO",
  "CARTAO",
];

const listFormat = new Intl.ListFormat("pt-BR", {
  style: "long",
  type: "conjunction",
});

export type InfoRow = { label: string; value: string };

/** Linhas da aba "Entrega e pagamento", só com o que a loja configurou. */
export function deliveryRows(rules: StoreRules): InfoRow[] {
  const rows: InfoRow[] = [
    {
      label: "Taxa de entrega",
      value:
        rules.deliveryFee > 0
          ? formatCurrency(rules.deliveryFee)
          : "Grátis",
    },
  ];
  if (rules.deliveryTimeMinutes) {
    rows.push({
      label: "Tempo de entrega",
      value: formatDuration(rules.deliveryTimeMinutes),
    });
  }
  rows.push({
    label: "Retirada no balcão",
    value: rules.pickupTimeMinutes
      ? `Grátis · pronto em ${formatDuration(rules.pickupTimeMinutes)}`
      : "Grátis",
  });
  if (rules.freeDeliveryAbove !== null) {
    rows.push({
      label: "Entrega grátis",
      value: `Em pedidos acima de ${formatCurrency(rules.freeDeliveryAbove)}`,
    });
  }
  if (rules.minimumOrder > 0) {
    rows.push({
      label: "Pedido mínimo",
      value: formatCurrency(rules.minimumOrder),
    });
  }
  const methods = PAYMENT_ORDER.filter((method) =>
    rules.paymentMethods.includes(method),
  ).map((method) => PAYMENT_LABELS[method]);
  if (methods.length) {
    const text = listFormat.format(methods);
    rows.push({
      label: "Formas de pagamento",
      value: text.charAt(0).toUpperCase() + text.slice(1),
    });
  }
  return rows;
}
