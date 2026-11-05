// Formatadores de exibição em pt-BR.

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 → "R$ 1.234,50". Aceita string numérica do banco (numeric). */
export function formatCurrency(
  value: number | string,
): string {
  const n =
    typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return currency.format(0);
  return currency.format(n);
}

/**
 * "48999990000" → "(48) 99999-9999"; "4833334444" → "(48) 3333-4444".
 * Aceita +55, espaços e pontuação. Fora desses dois tamanhos, devolve
 * só os dígitos, sem inventar máscara.
 */
export function formatPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

const amount = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 6.5 → "6,50"; 1234.5 → "1.234,50". Campo de valor, sem "R$". */
export function formatAmountInput(value: number): string {
  return amount.format(value);
}

/** Maior valor que o campo aceita: 99.999,99. */
const MAX_AMOUNT_DIGITS = 7;

/**
 * Máscara do campo de valor enquanto digita: os números entram pelos
 * centavos, como em maquininha. "5" → "0,05"; "2990" → "29,90";
 * "123450" → "1.234,50". Sem número, devolve "".
 */
export function maskAmountInput(typed: string): string {
  const digits = typed
    .replace(/\D/g, "")
    .replace(/^0+/, "")
    .slice(0, MAX_AMOUNT_DIGITS);
  if (!digits) return "";
  return formatAmountInput(Number(digits) / 100);
}

/**
 * Valor digitado em reais → número. Aceita "6,50", "6.50", "1.234,50" e
 * "R$ 6,50". Devolve null se não for um valor válido.
 */
export function parseAmountInput(
  input: string,
): number | null {
  let text = input.replace(/R\$|\s/g, "");
  if (!text) return null;
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return Number(text);
}

/** (1, "produto", "produtos") → "1 produto"; (3, …) → "3 produtos". */
export function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Texto para comparar em buscas: minúsculo e sem acento. */
export function normalizeSearch(text: string): string {
  return text
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Duração em minutos para a tela, sempre compacta e com a unidade colada ao
 * número: 45 → "45min"; 60 → "1h"; 110 → "1h 50min". Assim "45min" e
 * "1h 50min" seguem o mesmo padrão e cabem nos cards do quadro.
 */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  if (total < 60) return `${total}min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}

const storeTime = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** "2026-11-04T22:42:00Z" → "19:42", no horário de Brasília. */
export function formatStoreTime(isoDate: string): string {
  return storeTime.format(new Date(isoDate));
}

/**
 * Máscara do campo de telefone enquanto digita: "4899" → "(48) 99",
 * "4899995027" → "(48) 9999-5027", "48999950272" → "(48) 99999-0272".
 * Aceita até 11 dígitos; o DDD vem sempre nos dois primeiros.
 */
export function maskPhoneInput(typed: string): string {
  const digits = typed.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length === 9 ? 5 : 4;
  if (rest.length <= split) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
