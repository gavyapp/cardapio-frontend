"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Search } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/atoms/dialog";
import { MenuProductCard } from "@/components/molecules/menu-product-card";
import { useCart } from "@/components/providers/cart-provider";
import { searchProducts } from "@/lib/catalog/menu-search";

// Busca do cardápio: guarda se a tela de busca está aberta e a desenha uma
// vez só. Os botões de lupa espalhados pela página só pedem para abrir.

const MenuSearchContext = createContext<{
  open: () => void;
} | null>(null);

/** Abre a busca do cardápio. Só dentro de MenuSearchProvider. */
export function useMenuSearch(): { open: () => void } {
  const value = useContext(MenuSearchContext);
  if (!value) {
    throw new Error(
      "useMenuSearch precisa de um MenuSearchProvider.",
    );
  }
  return value;
}

export function MenuSearchProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Os produtos vêm do carrinho, que já tem o cardápio inteiro.
  const { products, openProduct } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => searchProducts(products, query),
    [products, query],
  );
  const context = useMemo(
    () => ({
      open: () => {
        setQuery("");
        setIsOpen(true);
      },
    }),
    [],
  );

  // Escolher um resultado fecha a busca e abre o detalhe do produto.
  function selectProduct(productId: string) {
    setIsOpen(false);
    openProduct(productId);
  }

  const typed = query.trim();

  return (
    <MenuSearchContext.Provider value={context}>
      {children}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:top-[10dvh] sm:left-1/2 sm:h-auto sm:max-h-[80dvh] sm:max-w-lg sm:-translate-x-1/2 sm:translate-y-0 sm:rounded-surface sm:border"
        >
          <DialogTitle className="sr-only">
            Buscar no cardápio
          </DialogTitle>

          <div className="flex items-center gap-2 border-b p-3">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-control bg-muted px-3 focus-within:ring-1 focus-within:ring-foreground">
              <Search
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Buscar no cardápio"
                aria-label="Buscar no cardápio"
                enterKeyHint="search"
                className="h-full min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
              />
            </label>
            <DialogClose className="h-11 shrink-0 rounded-control px-2 text-support font-semibold outline-none hover:underline focus-visible:ring-1 focus-visible:ring-foreground">
              Fechar
            </DialogClose>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto p-3"
            aria-live="polite"
          >
            {!typed ? (
              <p className="px-1 py-6 text-center text-support text-muted-foreground">
                Digite o nome de um produto ou ingrediente.
              </p>
            ) : results.length === 0 ? (
              <p className="px-1 py-6 text-center text-support text-muted-foreground">
                Nenhum produto encontrado para “{typed}”.
              </p>
            ) : (
              <ul className="grid gap-2">
                {results.map((product) => (
                  <li key={product.id} className="flex">
                    <MenuProductCard
                      product={product}
                      layout="lista"
                      onSelect={selectProduct}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MenuSearchContext.Provider>
  );
}
