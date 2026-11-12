"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  cartStorageKey,
  changeQuantity,
  hasRequiredGroup,
  newLine,
  parseStoredCart,
  resolveCart,
  serializeCart,
  suggestProducts,
  summarizeCart,
  upsertLine,
  type CartItem,
  type CartLine,
  type CartSummary,
} from "@/lib/catalog/cart";
import type { MenuProduct } from "@/lib/data/menu";

// Pedido que o cliente monta no cardápio. Guarda o carrinho no aparelho, um
// por loja, e o confere com o cardápio de agora. Também controla o que está
// aberto: o detalhe de um produto e o carrinho no celular. Fica no layout da
// loja, para o cardápio e o checkout verem o mesmo carrinho.

/** Produto aberto no detalhe; com `editKey`, é um item do carrinho em edição. */
export type DetailTarget = {
  productId: string;
  editKey?: string;
};

type CartContextValue = {
  products: readonly MenuProduct[];
  items: CartItem[];
  summary: CartSummary;
  suggestions: MenuProduct[];
  /** Loja aberta: só assim dá para adicionar. */
  canOrder: boolean;
  /** "abre hoje às 18h", quando a loja está fechada pelo horário. */
  nextOpeningLabel: string | null;

  save: (line: CartLine, replaceKey?: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  /** Esvazia o carrinho, depois que o pedido foi enviado. */
  clear: () => void;
  /** Sugestão: entra direto, ou abre o detalhe se tiver grupo obrigatório. */
  addSuggestion: (product: MenuProduct) => void;

  detail: DetailTarget | null;
  openProduct: (
    productId: string,
    editKey?: string,
  ) => void;
  closeProduct: () => void;

  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(
  null,
);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart precisa de um CartProvider.");
  }
  return value;
}

// O localStorage não avisa a própria aba quando muda; este evento avisa.
const CART_CHANGED = "cardapio:carrinho-mudou";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CART_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CART_CHANGED, onChange);
  };
}

// Navegação privada ou armazenamento cheio: o carrinho só não é guardado.
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, lines: readonly CartLine[]) {
  try {
    if (lines.length) {
      window.localStorage.setItem(
        key,
        serializeCart(lines),
      );
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Sem armazenamento, segue sem guardar.
  }
  window.dispatchEvent(new Event(CART_CHANGED));
}

export function CartProvider({
  storeId,
  products,
  rules,
  canOrder,
  nextOpeningLabel,
  children,
}: {
  storeId: string;
  /** Produtos do cardápio de agora, com grupos e complementos. */
  products: readonly MenuProduct[];
  rules: {
    minimumOrder: number;
    freeDeliveryAbove: number | null;
  };
  canOrder: boolean;
  nextOpeningLabel: string | null;
  children: ReactNode;
}) {
  const storageKey = cartStorageKey(storeId);
  const stored = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    // No servidor não há carrinho: a página chega vazia e o aparelho preenche.
    () => null,
  );

  const items = useMemo(
    () => resolveCart(parseStoredCart(stored), products),
    [stored, products],
  );
  const summary = useMemo(
    () => summarizeCart(items, rules),
    [items, rules],
  );
  const suggestions = useMemo(
    () => suggestProducts(products, items),
    [products, items],
  );

  const [detail, setDetail] = useState<DetailTarget | null>(
    null,
  );
  const [isCartOpen, setCartOpen] = useState(false);

  // Lê o guardado na hora de mudar e leva junto só o que ainda vale no
  // cardápio, para o item que saiu do ar não voltar.
  const update = useCallback(
    (change: (lines: CartLine[]) => CartLine[]) => {
      const valid = resolveCart(
        parseStoredCart(read(storageKey)),
        products,
      ).map((item) =>
        newLine(
          item.product.id,
          item.selection,
          item.notes,
          item.quantity,
        ),
      );
      write(storageKey, change(valid));
    },
    [storageKey, products],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      products,
      items,
      summary,
      suggestions,
      canOrder,
      nextOpeningLabel,

      save: (line, replaceKey) =>
        update((lines) =>
          upsertLine(lines, line, replaceKey),
        ),
      setQuantity: (key, quantity) =>
        update((lines) =>
          changeQuantity(lines, key, quantity),
        ),
      clear: () => update(() => []),
      addSuggestion: (product) => {
        if (hasRequiredGroup(product)) {
          setCartOpen(false);
          setDetail({ productId: product.id });
          return;
        }
        update((lines) =>
          upsertLine(lines, newLine(product.id, {}, "", 1)),
        );
      },

      detail,
      openProduct: (productId, editKey) => {
        setCartOpen(false);
        setDetail({ productId, editKey });
      },
      closeProduct: () => setDetail(null),

      isCartOpen,
      setCartOpen,
    }),
    [
      products,
      items,
      summary,
      suggestions,
      canOrder,
      nextOpeningLabel,
      update,
      detail,
      isCartOpen,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
