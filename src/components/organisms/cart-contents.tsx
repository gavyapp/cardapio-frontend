"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/atoms/button";
import { useCart } from "@/components/providers/cart-provider";
import {
  MAX_ITEM_QUANTITY,
  type CartItem,
} from "@/lib/catalog/cart";
import { formatCurrency } from "@/lib/format";
import { checkoutPathFrom } from "@/lib/routing/store-paths";
import { cn } from "@/lib/utils";

/**
 * Conteúdo do carrinho: itens com editar e remover, entrega grátis, pedido
 * mínimo, "Peça também", o subtotal e o desconto no pedido. Usado no cupom ao lado do cardápio e
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
    setCartOpen,
    refusal,
  } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  const refusalNotice = refusal ? (
    <p
      role="alert"
      className="rounded-control bg-destructive-soft px-3 py-2 text-left text-support font-semibold text-destructive"
    >
      {refusal.message}
    </p>
  ) : null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-4 text-center">
        {refusalNotice}
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
      {refusalNotice}
      <ul className="flex flex-col divide-y">
        {items.map((item) => (
          <CartLineRow
            key={item.key}
            item={item}
            needsReview={
              refusal?.itemKeys.includes(item.key) ?? false
            }
          />
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
          <h3 className="text-body font-semibold">
            Peça também
          </h3>
          {/* Cartões lado a lado, com rolagem horizontal: o último aparece
              cortado para mostrar que há mais. */}
          <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
            {suggestions.map((product) => (
              <li
                key={product.id}
                className="flex w-36 shrink-0 snap-start flex-col justify-between gap-4 rounded-surface border bg-card p-3"
              >
                <p className="line-clamp-2 text-support font-semibold">
                  {product.name}
                </p>
                <div className="flex items-end justify-between gap-2">
                  <p className="flex flex-col">
                    {product.promotion ? (
                      <s className="tabular text-caption text-muted-foreground">
                        {formatCurrency(
                          product.promotion.originalPrice,
                        )}
                      </s>
                    ) : null}
                    <span className="tabular text-support font-semibold">
                      {formatCurrency(product.price)}
                    </span>
                  </p>
                  <Button
                    size="icon-sm"
                    className="rounded-full"
                    aria-label={`Adicionar ${product.name}`}
                    disabled={!canOrder}
                    onClick={() => addSuggestion(product)}
                  >
                    <Plus />
                  </Button>
                </div>
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
        {summary.discount ? (
          <div className="flex items-baseline justify-between gap-3 text-support">
            <dt className="text-muted-foreground">
              {summary.discount.label}
            </dt>
            <dd className="tabular font-semibold whitespace-nowrap text-success">
              − {formatCurrency(summary.discount.amount)}
            </dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between text-support text-muted-foreground">
          <dt>Entrega</dt>
          {freeDelivery?.reached ? (
            <dd className="font-semibold text-success">
              grátis
            </dd>
          ) : (
            <dd>calculada na próxima etapa</dd>
          )}
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

      <Button
        size="lg"
        className="justify-between"
        disabled={!canOrder || Boolean(minimumOrder)}
        onClick={() => {
          setCartOpen(false);
          router.push(checkoutPathFrom(pathname));
        }}
      >
        <span>Continuar</span>
        {/* Como no protótipo: o que vai pagar até aqui, já sem o desconto. */}
        <span className="tabular">
          {formatCurrency(
            summary.subtotal -
              (summary.discount?.amount ?? 0),
          )}
        </span>
      </Button>
    </div>
  );
}

function CartLineRow({
  item,
  needsReview,
}: {
  item: CartItem;
  /** Item apontado pela recusa do servidor. */
  needsReview: boolean;
}) {
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
        {needsReview ? (
          <p className="text-support font-semibold text-destructive">
            Revise ou remova este item.
          </p>
        ) : null}
      </div>

      {/* Preço à esquerda; editar e quantidade à direita. */}
      <div className="flex items-center justify-between gap-3">
        <p className="tabular text-body font-semibold">
          {formatCurrency(item.total)}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openProduct(item.product.id, item.key)
            }
          >
            Editar
          </Button>
          <div
            role="group"
            aria-label={`Quantidade de ${item.product.name}`}
            className="flex h-9 items-center rounded-control border bg-card"
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
        </div>
      </div>
    </li>
  );
}
