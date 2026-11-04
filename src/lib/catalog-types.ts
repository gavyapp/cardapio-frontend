// Formatos do catálogo que as telas do painel trocam entre si: o que as
// listas recebem da página e o que os editores devolvem para as actions.

export type CategoryItem = {
  id: string;
  name: string;
  isAvailable: boolean;
  productCount: number;
};

export type ComplementOption = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

export type ComplementGroupItem = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  allowRepeat: boolean;
  options: ComplementOption[];
  usedBy: { id: string; name: string }[];
};

/** O que o editor de grupo manda salvar. Sem id: grupo novo. */
export type ComplementGroupDraft = {
  id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  allowRepeat: boolean;
  options: (Omit<ComplementOption, "id"> & {
    id?: string;
  })[];
};

/** O que o editor de produto manda salvar. Sem id: produto novo. */
export type ProductDraft = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  badges: string[];
  isAvailable: boolean;
  isSuggested: boolean;
  /** Grupos ligados, na ordem em que o cliente vê. */
  groupIds: string[];
};

export type EditableProduct = ProductDraft & { id: string };

/** Grupo aberto no editor, com quantos produtos o usam. */
export type EditableComplementGroup =
  ComplementGroupDraft & {
    id: string;
    usedByCount: number;
  };
