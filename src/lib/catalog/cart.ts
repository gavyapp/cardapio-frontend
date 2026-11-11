// Regras do pedido que o cliente monta no cardápio: escolha de complementos,
// itens do carrinho e os totais. Tudo puro, para a tela só desenhar.
//
// O carrinho guardado no aparelho tem só ids, quantidades e observações.
// Nome, preço e disponibilidade vêm sempre do cardápio de agora
// (resolveCart), nunca do que ficou salvo.
import { z } from "zod";

import { isBlockingGroup } from "@/lib/catalog/complement-rules";
import type {
  MenuComplementGroup,
  MenuProduct,
} from "@/lib/data/menu";

export const MAX_ITEM_QUANTITY = 20;
export const MAX_NOTES_LENGTH = 140;

/** Opções escolhidas por grupo. Opção repetida aparece mais de uma vez. */
export type Selection = Record<string, string[]>;

/** Um item do carrinho como fica guardado no aparelho. */
export type CartLine = {
  key: string;
  productId: string;
  selection: Selection;
  notes: string;
  quantity: number;
};

const round = (value: number) =>
  Math.round(value * 100) / 100;

// ---------------------------------------------------------------------------
// Escolha de complementos
// ---------------------------------------------------------------------------

/**
 * Como o grupo é escolhido: "repeat" (contador de − e +) quando permite
 * repetir, "single" (uma opção) quando o máximo é 1, senão "multiple".
 */
export function groupKind(
  group: Pick<
    MenuComplementGroup,
    "maxSelect" | "allowRepeat"
  >,
): "single" | "multiple" | "repeat" {
  if (group.allowRepeat) return "repeat";
  return group.maxSelect === 1 ? "single" : "multiple";
}

function isSelectable(
  group: MenuComplementGroup,
  optionId: string,
): boolean {
  return group.options.some(
    (option) =>
      option.id === optionId && option.isAvailable,
  );
}

/** Toque numa opção de grupo "single" ou "multiple". */
export function toggleOption(
  group: MenuComplementGroup,
  chosen: readonly string[],
  optionId: string,
): string[] {
  if (!isSelectable(group, optionId)) return [...chosen];

  if (groupKind(group) === "single") {
    // Em grupo opcional, tocar de novo desmarca.
    const isSame = chosen[0] === optionId;
    return isSame && group.minSelect === 0
      ? []
      : [optionId];
  }
  if (chosen.includes(optionId)) {
    return chosen.filter((id) => id !== optionId);
  }
  return chosen.length >= group.maxSelect
    ? [...chosen]
    : [...chosen, optionId];
}

/** Mais ou menos uma unidade de uma opção, em grupo que permite repetir. */
export function stepOption(
  group: MenuComplementGroup,
  chosen: readonly string[],
  optionId: string,
  delta: 1 | -1,
): string[] {
  if (delta === 1) {
    if (
      !isSelectable(group, optionId) ||
      chosen.length >= group.maxSelect
    ) {
      return [...chosen];
    }
    return [...chosen, optionId];
  }
  const index = chosen.lastIndexOf(optionId);
  return index < 0
    ? [...chosen]
    : chosen.filter((_, position) => position !== index);
}

/**
 * A seleção só com o que ainda vale no produto: grupos dele, opções
 * disponíveis, sem passar do máximo e sem repetir onde não pode.
 */
export function cleanSelection(
  product: MenuProduct,
  selection: Selection,
): Selection {
  const clean: Selection = {};
  for (const group of product.complementGroups) {
    let chosen = (selection[group.id] ?? []).filter((id) =>
      isSelectable(group, id),
    );
    if (!group.allowRepeat) chosen = [...new Set(chosen)];
    chosen = chosen.slice(0, group.maxSelect);
    if (chosen.length) clean[group.id] = chosen;
  }
  return clean;
}

/** Grupos obrigatórios ainda sem o mínimo de escolhas. */
export function missingGroups(
  product: MenuProduct,
  selection: Selection,
): MenuComplementGroup[] {
  return product.complementGroups.filter(
    (group) =>
      (selection[group.id]?.length ?? 0) < group.minSelect,
  );
}

/** Produto que não dá para pedir: esgotado, ou grupo obrigatório sem opção. */
export function isBlockedProduct(
  product: MenuProduct,
): boolean {
  return (
    !product.isAvailable ||
    product.complementGroups.some(isBlockingGroup)
  );
}

/** Preço de uma unidade: produto mais os complementos escolhidos. */
export function unitPrice(
  product: MenuProduct,
  selection: Selection,
): number {
  let total = product.price;
  for (const group of product.complementGroups) {
    for (const optionId of selection[group.id] ?? []) {
      total +=
        group.options.find(
          (option) => option.id === optionId,
        )?.price ?? 0;
    }
  }
  return round(total);
}

// ---------------------------------------------------------------------------
// Itens do carrinho
// ---------------------------------------------------------------------------

/** Identidade do item: mesmo produto, mesmas escolhas e mesma observação. */
export function lineKey(
  productId: string,
  selection: Selection,
  notes: string,
): string {
  const choices = Object.keys(selection)
    .sort()
    .map((groupId) => [
      groupId,
      [...selection[groupId]].sort(),
    ]);
  return `${productId}|${JSON.stringify(choices)}|${notes.trim()}`;
}

export function newLine(
  productId: string,
  selection: Selection,
  notes: string,
  quantity: number,
): CartLine {
  return {
    key: lineKey(productId, selection, notes),
    productId,
    selection,
    notes: notes.trim().slice(0, MAX_NOTES_LENGTH),
    quantity: clampQuantity(quantity),
  };
}

function clampQuantity(quantity: number): number {
  return Math.min(
    MAX_ITEM_QUANTITY,
    Math.max(1, Math.floor(quantity)),
  );
}

/**
 * Coloca o item no carrinho. Item igual a um que já está soma a quantidade.
 * Com `replaceKey`, o item editado sai e o novo entra no lugar dele.
 */
export function upsertLine(
  lines: readonly CartLine[],
  line: CartLine,
  replaceKey?: string,
): CartLine[] {
  const position = replaceKey
    ? lines.findIndex(
        (existing) => existing.key === replaceKey,
      )
    : -1;
  const rest = lines.filter(
    (existing) => existing.key !== replaceKey,
  );

  const same = rest.findIndex(
    (existing) => existing.key === line.key,
  );
  if (same >= 0) {
    return rest.map((existing, index) =>
      index === same
        ? {
            ...existing,
            quantity: clampQuantity(
              existing.quantity + line.quantity,
            ),
          }
        : existing,
    );
  }
  if (position < 0) return [...rest, line];
  return [
    ...rest.slice(0, position),
    line,
    ...rest.slice(position),
  ];
}

/** Muda a quantidade de um item; zero ou menos remove. */
export function changeQuantity(
  lines: readonly CartLine[],
  key: string,
  quantity: number,
): CartLine[] {
  if (quantity <= 0)
    return lines.filter((line) => line.key !== key);
  return lines.map((line) =>
    line.key === key
      ? { ...line, quantity: clampQuantity(quantity) }
      : line,
  );
}

// ---------------------------------------------------------------------------
// Carrinho conferido com o cardápio
// ---------------------------------------------------------------------------

export type CartItemOption = {
  groupName: string;
  name: string;
  price: number;
  quantity: number;
};

/** Item do carrinho com os dados de agora do cardápio. */
export type CartItem = {
  key: string;
  product: MenuProduct;
  selection: Selection;
  options: CartItemOption[];
  notes: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

/**
 * Confere o carrinho guardado com o cardápio de agora. Fica de fora o item
 * cujo produto saiu ou esgotou, cuja escolha deixou de existir ou ficou
 * indisponível, ou que não cumpre mais um grupo obrigatório.
 */
export function resolveCart(
  lines: readonly CartLine[],
  products: readonly MenuProduct[],
): CartItem[] {
  const byId = new Map(
    products.map((product) => [product.id, product]),
  );
  const items: CartItem[] = [];

  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product || isBlockedProduct(product)) continue;

    const selection = cleanSelection(
      product,
      line.selection,
    );
    const kept = Object.values(selection).flat().length;
    const asked = Object.values(line.selection).flat()
      .length;
    if (kept !== asked) continue;
    if (missingGroups(product, selection).length) continue;

    const options: CartItemOption[] = [];
    for (const group of product.complementGroups) {
      const chosen = selection[group.id] ?? [];
      for (const option of group.options) {
        const quantity = chosen.filter(
          (id) => id === option.id,
        ).length;
        if (!quantity) continue;
        options.push({
          groupName: group.name,
          name: option.name,
          price: option.price,
          quantity,
        });
      }
    }

    const unit = unitPrice(product, selection);
    items.push({
      key: line.key,
      product,
      selection,
      options,
      notes: line.notes,
      quantity: line.quantity,
      unitPrice: unit,
      total: round(unit * line.quantity),
    });
  }
  return items;
}

export type CartSummary = {
  /** Soma das quantidades. */
  itemCount: number;
  subtotal: number;
  /** Null quando a loja não oferece entrega grátis. */
  freeDelivery: {
    reached: boolean;
    /** Quanto falta para a entrega sair grátis. */
    missing: number;
    /** 0 a 100, para a barra. */
    progress: number;
  } | null;
  /** Null quando o pedido mínimo já foi atingido ou a loja não tem. */
  minimumOrder: { value: number; missing: number } | null;
};

/** Totais do carrinho pelas regras de stores.settings. */
export function summarizeCart(
  items: readonly CartItem[],
  rules: {
    minimumOrder: number;
    freeDeliveryAbove: number | null;
  },
): CartSummary {
  const subtotal = round(
    items.reduce((sum, item) => sum + item.total, 0),
  );
  const itemCount = items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const threshold = rules.freeDeliveryAbove;
  const freeDelivery =
    threshold === null
      ? null
      : {
          reached: subtotal >= threshold,
          missing: round(Math.max(0, threshold - subtotal)),
          progress:
            threshold > 0
              ? Math.min(
                  100,
                  Math.round((subtotal / threshold) * 100),
                )
              : 100,
        };

  const minimumOrder =
    rules.minimumOrder > 0 && subtotal < rules.minimumOrder
      ? {
          value: rules.minimumOrder,
          missing: round(rules.minimumOrder - subtotal),
        }
      : null;

  return {
    itemCount,
    subtotal,
    freeDelivery,
    minimumOrder,
  };
}

/** "Peça também": sugeridos que dá para pedir e ainda não estão no carrinho. */
export function suggestProducts(
  products: readonly MenuProduct[],
  items: readonly CartItem[],
  limit = 3,
): MenuProduct[] {
  const inCart = new Set(
    items.map((item) => item.product.id),
  );
  return products
    .filter(
      (product) =>
        product.isSuggested &&
        !inCart.has(product.id) &&
        !isBlockedProduct(product),
    )
    .slice(0, limit);
}

/** Produto que entra direto no carrinho, sem passar pelo detalhe. */
export function hasRequiredGroup(
  product: MenuProduct,
): boolean {
  return product.complementGroups.some(
    (group) => group.minSelect > 0,
  );
}

// ---------------------------------------------------------------------------
// Carrinho guardado no aparelho
// ---------------------------------------------------------------------------

/** Chave do localStorage: um carrinho por loja. */
export function cartStorageKey(storeId: string): string {
  return `cardapio:carrinho:${storeId}`;
}

const storedLines = z.array(
  z.object({
    productId: z.string().min(1),
    selection: z.record(z.string(), z.array(z.string())),
    notes: z.string(),
    quantity: z.number().int().positive(),
  }),
);

/** Lê o que está guardado. Conteúdo estragado vira carrinho vazio. */
export function parseStoredCart(
  raw: string | null,
): CartLine[] {
  if (!raw) return [];
  try {
    const parsed = storedLines.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data.map((line) =>
      newLine(
        line.productId,
        line.selection,
        line.notes,
        line.quantity,
      ),
    );
  } catch {
    return [];
  }
}

export function serializeCart(
  lines: readonly CartLine[],
): string {
  return JSON.stringify(
    lines.map(
      ({ productId, selection, notes, quantity }) => ({
        productId,
        selection,
        notes,
        quantity,
      }),
    ),
  );
}
