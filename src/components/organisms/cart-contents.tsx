"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { useCart } from "@/components/providers/cart-provider";
import {
  MAX_ITEM_QUANTITY,
  type CartItem,
} from "@/lib/catalog/cart";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Conteúdo do carrinho: itens com editar e remover, entrega grátis, pedido
 * mínimo, "Peça também" e o subtotal. Usado no cupom ao lado do cardápio e
 * na folha do carrinho no celular.
 */
export function CartContents() {
  const {
    items,
    summary,
    suggestions,
    canOrder,
    nextOpeningLabel,
    addSuggestion,
  } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-4 text-center">
        <p className="font-mono text-support">
          — nenhum item ainda —
        </p>
        <p className="text-support text-muted-foreground">
          Escolha algo no cardápio e ele aparece aqui.
        </p>
      </div>
    );
  }

  const { freeDelivery, minimumOrder } = summary;

  return (
    <div className="flex flex-col gap-4 text-left">
      <ul className="flex flex-col divide-y">
        {items.map((item) => (
          <CartLineRow key={item.key} item={item} />
        ))}
      </ul>

      {freeDelivery ? (
        <div className="flex flex-col gap-1.5">
          <p
            className={cn(
              "text-support font-semibold",
              freeDelivery.reached && "text-success",
            )}
          >
            {freeDelivery.reached
              ? "Você ganhou entrega grátis"
              : `Faltam ${formatCurrency(freeDelivery.missing)} para entrega grátis`}
          </p>
          <div
            role="progressbar"
            aria-label="Progresso para a entrega grátis"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={freeDelivery.progress}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                freeDelivery.reached
                  ? "bg-success"
                  : "bg-primary",
              )}
              style={{ width: `${freeDelivery.progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-support font-semibold">
            Peça também
          </h3>
          <ul className="flex flex-col gap-2">
            {suggestions.map((product) => (
              <li
                key={product.id}
                className="flex items-center gap-3 rounded-control border p-2"
              >
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="size-11 shrink-0 rounded-control bg-muted object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-support font-semibold">
                    {product.name}
                  </p>
                  <p className="tabular text-caption text-muted-foreground">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Adicionar ${product.name}`}
                  disabled={!canOrder}
                  onClick={() => addSuggestion(product)}
                >
                  <Plus />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <dl className="flex flex-col gap-1 border-t border-dashed border-border-strong pt-3">
        <div className="flex items-baseline justify-between text-body font-semibold">
          <dt>Subtotal</dt>
          <dd className="tabular">
            {formatCurrency(summary.subtotal)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between text-support text-muted-foreground">
          <dt>Entrega</dt>
          <dd>calculada na próxima etapa</dd>
        </div>
      </dl>

      {minimumOrder ? (
        <p
          role="status"
          className="rounded-control bg-muted px-3 py-2 text-support"
        >
          Pedido mínimo de{" "}
          {formatCurrency(minimumOrder.value)}. Faltam{" "}
          <strong className="font-semibold">
            {formatCurrency(minimumOrder.missing)}
          </strong>
          .
        </p>
      ) : null}

      {!canOrder ? (
        <p
          role="status"
          className="text-support text-muted-foreground"
        >
          A loja está fechada agora
          {nextOpeningLabel ? ` e ${nextOpeningLabel}` : ""}
          .
        </p>
      ) : null}

      {/* O checkout ainda não existe: o botão fica sem ação. */}
      <Button
        size="lg"
        className="justify-between"
        disabled={!canOrder || Boolean(minimumOrder)}
      >
        <span>Continuar</span>
        <span className="tabular">
          {formatCurrency(summary.subtotal)}
        </span>
      </Button>
    </div>
  );
}

function CartLineRow({ item }: { item: CartItem }) {
  const { setQuantity, openProduct } = useCart();
  const options = item.options
    .map((option) =>
      option.quantity > 1
        ? `${option.quantity}× ${option.name}`
        : option.name,
    )
    .join(" · ");
  const single = item.quantity === 1;

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-semibold">
            {item.product.name}
          </p>
          {options ? (
            <p className="text-support text-muted-foreground">
              {options}
            </p>
          ) : null}
          {item.notes ? (
            <p className="text-support text-muted-foreground">
              Obs.: {item.notes}
            </p>
          ) : null}
        </div>
        <p className="tabular shrink-0 text-body font-semibold">
          {formatCurrency(item.total)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label={`Quantidade de ${item.product.name}`}
          className="flex h-9 items-center rounded-control border"
        >
          <button
            type="button"
            aria-label={
              single ? "Remover item" : "Diminuir"
            }
            onClick={() =>
              setQuantity(item.key, item.quantity - 1)
            }
            className="flex size-9 items-center justify-center rounded-control outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-foreground [&_svg]:size-4"
          >
            {single ? <Trash2 /> : <Minus />}
          </button>
          <span className="tabular w-7 text-center text-support font-semibold">
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label="Aumentar"
            disabled={item.quantity >= MAX_ITEM_QUANTITY}
            onClick={() =>
              setQuantity(item.key, item.quantity + 1)
            }
            className="flex size-9 items-center justify-center rounded-control outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-foreground disabled:opacity-35 [&_svg]:size-4"
          >
            <Plus />
          </button>
        </div>
        <button
          type="button"
          onClick={() =>
            openProduct(item.product.id, item.key)
          }
          className="h-9 rounded-control px-2 text-support font-semibold outline-none hover:underline focus-visible:ring-1 focus-visible:ring-foreground"
        >
          Editar
        </button>
        {single ? null : (
          <button
            type="button"
            onClick={() => setQuantity(item.key, 0)}
            className="h-9 rounded-control px-2 text-support font-semibold text-muted-foreground outline-none hover:underline focus-visible:ring-1 focus-visible:ring-foreground"
          >
            Remover
          </button>
        )}
      </div>
    </li>
  );
}
