// Regras de escolha de um grupo de complementos, em texto para o lojista e
// para o cliente. Mínimo maior que 0 torna o grupo obrigatório.

import { formatAmountInput } from "@/lib/format";

export function isRequiredGroup(
  minSelect: number,
): boolean {
  return minSelect > 0;
}

/** 1/1 → "Escolha 1"; 0/3 → "Escolha até 3"; 1/3 → "Escolha de 1 a 3". */
export function describeChoiceRule(
  minSelect: number,
  maxSelect: number,
): string {
  if (minSelect === maxSelect)
    return `Escolha ${maxSelect}`;
  if (minSelect === 0) return `Escolha até ${maxSelect}`;
  return `Escolha de ${minSelect} a ${maxSelect}`;
}

/** "Obrigatório · Escolha 1" */
export function describeGroupRule(
  minSelect: number,
  maxSelect: number,
): string {
  const kind = isRequiredGroup(minSelect)
    ? "Obrigatório"
    : "Opcional";
  return `${kind} · ${describeChoiceRule(minSelect, maxSelect)}`;
}

type GroupOption = {
  name: string;
  price: number;
  isAvailable: boolean;
};

/** "Mal passado · Bacon +5,00 · Cheddar (pausado)" */
export function describeGroupOptions(
  options: GroupOption[],
): string {
  if (options.length === 0) return "Sem opções";
  return options
    .map(
      (option) =>
        option.name +
        (option.price > 0
          ? ` +${formatAmountInput(option.price)}`
          : "") +
        (option.isAvailable ? "" : " (pausado)"),
    )
    .join(" · ");
}

/** Grupo obrigatório sem opção disponível: o produto não pode ser pedido. */
export function isBlockingGroup(group: {
  minSelect: number;
  options: GroupOption[];
}): boolean {
  return (
    isRequiredGroup(group.minSelect) &&
    !group.options.some((option) => option.isAvailable)
  );
}
