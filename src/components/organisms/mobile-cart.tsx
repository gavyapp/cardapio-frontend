"use client";

import { X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/atoms/dialog";
import { CartContents } from "@/components/organisms/cart-contents";
import { useCart } from "@/components/providers/cart-provider";
import { formatCurrency, pluralize } from "@/lib/format";

/**
 * Carrinho no celular: a barra fixa no pé da tela, que aparece quando há
 * itens, e a folha com o pedido. No computador o carrinho é o cupom ao lado.
 */
export function MobileCart() {
  const { summary, isCartOpen, setCartOpen } = useCart();

  return (
    <>
      {summary.itemCount > 0 ? (
        <div className="sticky bottom-0 z-30 -mx-4 border-t bg-background px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex h-12 w-full items-center gap-3 rounded-control bg-primary px-4 text-body font-semibold text-primary-foreground outline-none hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="tabular flex size-7 items-center justify-center rounded-full bg-primary-foreground/20 text-support">
              {summary.itemCount}
            </span>
            <span className="flex-1 text-left">
              Ver pedido
            </span>
            <span className="tabular">
              {formatCurrency(summary.subtotal)}
            </span>
          </button>
        </div>
      ) : null}

      <Dialog open={isCartOpen} onOpenChange={setCartOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-auto bottom-0 left-0 flex max-h-[92dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none border-x-0 border-b-0 p-0 sm:max-w-none"
        >
          <header className="flex items-center justify-between gap-3 border-b py-2 pr-2 pl-4">
            <div>
              <DialogTitle>Seu pedido</DialogTitle>
              <p className="text-support text-muted-foreground">
                {pluralize(
                  summary.itemCount,
                  "item",
                  "itens",
                )}
              </p>
            </div>
            <DialogClose
              aria-label="Fechar"
              className="flex size-11 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground"
            >
              <X aria-hidden className="size-5" />
            </DialogClose>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <CartContents />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
