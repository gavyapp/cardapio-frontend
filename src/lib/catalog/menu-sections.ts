// Âncora da seção de uma categoria no cardápio público. As abas de
// categoria rolam até ela e a leem para marcar a aba da categoria visível.
export function menuSectionId(categoryId: string): string {
  return `categoria-${categoryId}`;
}
