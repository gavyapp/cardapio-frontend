// Regras de escolha de um grupo de complementos, em texto para o lojista e
// para o cliente. Mínimo maior que 0 torna o grupo obrigatório.

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
