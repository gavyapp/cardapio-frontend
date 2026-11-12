// Âncora da seção de uma categoria no cardápio público. As abas de
// categoria rolam até ela e a leem para marcar a aba da categoria visível.
export function menuSectionId(categoryId: string): string {
  return `categoria-${categoryId}`;
}

export type SectionPosition = {
  id: string;
  /** Topo da seção em relação à janela (getBoundingClientRect().top). */
  top: number;
};

/**
 * Categoria que as abas marcam durante a rolagem: a última cujo título já
 * passou da linha de leitura, logo abaixo da barra fixa.
 *
 * No trecho final da página as últimas categorias não têm como chegar ao
 * topo, porque a rolagem acaba antes. Ali a linha de leitura desce aos
 * poucos até o pé da janela, e cada categoria é marcada na sua vez, em vez
 * de pular direto para a última.
 */
export function pickActiveSection({
  sections,
  readingLine,
  viewportHeight,
  scrollY,
  maxScrollY,
}: {
  sections: readonly SectionPosition[];
  /** Posição da linha de leitura na janela, com a página fora do fim. */
  readingLine: number;
  viewportHeight: number;
  scrollY: number;
  /** Maior rolagem possível: altura do documento menos a da janela. */
  maxScrollY: number;
}): string | null {
  if (!sections.length) return null;

  // Distância que a linha percorre até o pé da janela, e o trecho final de
  // rolagem em que ela faz esse caminho.
  const sweep = Math.max(0, viewportHeight - readingLine);
  const range = Math.min(sweep, Math.max(0, maxScrollY));
  const progress =
    range > 0
      ? Math.min(
          1,
          Math.max(
            0,
            (scrollY - (maxScrollY - range)) / range,
          ),
        )
      : 0;
  const line = readingLine + progress * sweep;

  let current = sections[0].id;
  for (const section of sections) {
    if (section.top <= line + 1) current = section.id;
  }
  return current;
}
