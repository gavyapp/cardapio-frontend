"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Textarea } from "@/components/atoms/textarea";
import { ComplementGroupPicker } from "@/components/molecules/complement-group-picker";
import { NumberStepper } from "@/components/molecules/number-stepper";
import { useCart } from "@/components/providers/cart-provider";
import {
  cleanSelection,
  isBlockedProduct,
  MAX_ITEM_QUANTITY,
  MAX_NOTES_LENGTH,
  missingGroups,
  newLine,
  unitPrice,
  type CartItem,
  type Selection,
} from "@/lib/catalog/cart";
import type { MenuProduct } from "@/lib/data/menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Detalhe do produto: folha que sobe de baixo no celular e diálogo no
 * computador. Abre por cima do cardápio, que fica na mesma posição.
 */
export function ProductDetail() {
  const { detail, products, items, closeProduct } =
    useCart();
  const product = detail
    ? products.find(
        (candidate) => candidate.id === detail.productId,
      )
    : undefined;
  const editing = detail?.editKey
    ? items.find((item) => item.key === detail.editKey)
    : undefined;

  return (
    <Dialog
      open={Boolean(product)}
      onOpenChange={(open) => {
        if (!open) closeProduct();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="top-auto bottom-0 left-0 flex max-h-[92dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none border-x-0 border-b-0 p-0 sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[88dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-surface sm:border"
      >
        {product ? (
          // Monta de novo a cada produto, com as escolhas do item em edição.
          <ProductForm
            key={`${product.id}:${detail?.editKey ?? ""}`}
            product={product}
            editing={editing}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProductForm({
  product,
  editing,
}: {
  product: MenuProduct;
  editing: CartItem | undefined;
}) {
  const { canOrder, nextOpeningLabel, save, closeProduct } =
    useCart();
  const [selection, setSelection] = useState<Selection>(
    editing ? editing.selection : {},
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [quantity, setQuantity] = useState(
    editing?.quantity ?? 1,
  );
  // Só destaca o que falta depois que a pessoa tentou adicionar.
  const [tried, setTried] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const blocked = isBlockedProduct(product);
  const clean = cleanSelection(product, selection);
  const missing = missingGroups(product, clean);
  const total = unitPrice(product, clean) * quantity;
  const cannotAdd = !canOrder || blocked;

  const label = !canOrder
    ? "Loja fechada"
    : blocked
      ? "Indisponível"
      : editing
        ? "Salvar"
        : "Adicionar";

  function submit() {
    if (cannotAdd) return;
    if (missing.length) {
      setTried(true);
      scrollRef.current
        ?.querySelector(`[data-group="${missing[0].id}"]`)
        ?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      return;
    }
    save(
      newLine(product.id, clean, notes, quantity),
      editing?.key,
    );
    closeProduct();
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="relative">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="aspect-[16/10] w-full bg-muted object-cover"
            />
          ) : null}
          <DialogClose
            aria-label="Fechar"
            className={cn(
              "flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2",
              product.imageUrl
                ? "absolute top-3 right-3 bg-black/55 text-white hover:bg-black/70 focus-visible:ring-white"
                : "absolute top-2 right-2 text-foreground hover:bg-muted focus-visible:ring-foreground",
            )}
          >
            <X aria-hidden className="size-5" />
          </DialogClose>
        </div>

        <div
          className={cn(
            "flex flex-col gap-2 p-4",
            !product.imageUrl && "pr-14",
          )}
        >
          <DialogTitle className="text-page-title">
            {product.name}
          </DialogTitle>
          {product.description ? (
            <DialogDescription className="text-body">
              {product.description}
            </DialogDescription>
          ) : null}
          <p className="tabular text-section-title font-semibold">
            {formatCurrency(product.price)}
          </p>
        </div>

        {product.complementGroups.map((group) => (
          <ComplementGroupPicker
            key={group.id}
            group={group}
            chosen={clean[group.id] ?? []}
            onChange={(chosen) =>
              setSelection({ ...clean, [group.id]: chosen })
            }
            showMissing={tried}
            disabled={cannotAdd}
          />
        ))}

        <div className="flex flex-col gap-2 p-4">
          <label
            htmlFor="observacao-do-item"
            className="text-body font-semibold"
          >
            Alguma observação?
          </label>
          <Textarea
            id="observacao-do-item"
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            maxLength={MAX_NOTES_LENGTH}
            placeholder="Ex.: sem cebola, ponto certinho"
            disabled={cannotAdd}
          />
          <p className="tabular text-right text-caption text-muted-foreground">
            {notes.length}/{MAX_NOTES_LENGTH}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t p-3">
        {!canOrder ? (
          <p
            role="status"
            className="text-support text-muted-foreground"
          >
            A loja está fechada agora
            {nextOpeningLabel
              ? ` e ${nextOpeningLabel}`
              : ""}
            .
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <NumberStepper
            label="Quantidade"
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={MAX_ITEM_QUANTITY}
          />
          <Button
            size="lg"
            className={cn(
              "min-w-0 flex-1 justify-between gap-2 px-3",
              // Com grupo obrigatório em aberto o botão fica apagado, mas o
              // toque ainda mostra o que falta escolher.
              missing.length > 0 &&
                !cannotAdd &&
                "opacity-50",
            )}
            disabled={cannotAdd}
            aria-disabled={missing.length > 0 || undefined}
            onClick={submit}
          >
            <span className="truncate">{label}</span>
            <span className="tabular shrink-0">
              {formatCurrency(total)}
            </span>
          </Button>
        </div>
      </div>
    </>
  );
}
