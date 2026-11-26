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
import type { OrderDiscount } from "@/lib/promotions/order-discount";

// Pedido que o cliente monta no cardápio. Guarda o carrinho no aparelho, um
// por loja, e o confere com o cardápio de agora. Também controla o que está
// aberto: o detalhe de um produto e o carrinho no celular. Fica no layout da
// loja, para o cardápio e o checkout verem o mesmo carrinho.

/** Produto aberto no detalhe; com `editKey`, é um item do carrinho em edição. */
export type DetailTarget = {
  productId: string;
  editKey?: string;
  /**
   * Aberto a partir do carrinho no celular (editar um item, ou sugestão que
   * pede uma escolha): ao fechar o detalhe, o carrinho volta a aparecer.
   */
  returnsToCart?: boolean;
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

  /** Recusa do servidor ao enviar o pedido, mostrada no carrinho. */
  refusal: CartRefusal | null;
  /** Guarda a recusa e abre o carrinho no celular. */
  reportRefusal: (refusal: CartRefusal) => void;
};

/** Por que o pedido voltou ao carrinho e quais itens causaram. */
export type CartRefusal = {
  message: string;
  itemKeys: string[];
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
    /** Descontos no pedido vigentes agora. */
    orderDiscounts: readonly OrderDiscount[];
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
  const [refusal, setRefusal] =
    useState<CartRefusal | null>(null);

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
      // O cliente mexeu no carrinho: o aviso da recusa já cumpriu o papel.
      setRefusal(null);
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
          // Precisa de uma escolha antes de entrar: abre o detalhe e,
          // depois, volta ao carrinho, como a sugestão que entra direto.
          setDetail({
            productId: product.id,
            returnsToCart: isCartOpen,
          });
          setCartOpen(false);
          return;
        }
        update((lines) =>
          upsertLine(lines, newLine(product.id, {}, "", 1)),
        );
      },

      detail,
      openProduct: (productId, editKey) => {
        // Aberto de dentro do carrinho (editar um item): ao salvar ou
        // fechar, o carrinho volta a aparecer.
        setDetail({
          productId,
          editKey,
          returnsToCart: isCartOpen,
        });
        setCartOpen(false);
      },
      closeProduct: () => {
        if (detail?.returnsToCart) setCartOpen(true);
        setDetail(null);
      },

      isCartOpen,
      setCartOpen,

      refusal,
      reportRefusal: (reported) => {
        setRefusal(reported);
        setCartOpen(true);
      },
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
      refusal,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
