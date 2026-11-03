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

/** 6.5 → "6,50", para preencher campo de valor (sem "R$"). */
export function formatAmountInput(value: number): string {
  return value.toFixed(2).replace(".", ",");
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
