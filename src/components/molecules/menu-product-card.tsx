import { Badge } from "@/components/atoms/badge";
import { formatCurrency } from "@/lib/format";
import { discountTag } from "@/lib/promotions/describe";
import { cn } from "@/lib/utils";

export type MenuProductCardProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  /** Promoção que vale agora; null sem promoção. */
  promotion: { originalPrice: number } | null;
  imageUrl: string | null;
  badges: string[];
  /** false = esgotado. */
  isAvailable: boolean;
};

/**
 * Produto no cardápio do cliente. É um botão: o toque abre o detalhe do
 * produto. Sem foto, o card fica só com o texto, sem espaço reservado.
 * Esgotado aparece acinzentado, com o selo. Em promoção, o preço antigo
 * vem riscado e o selo diz o desconto ("−17%"), como no protótipo: ao lado
 * do preço na lista, acima dele na grade.
 */
export function MenuProductCard({
  product,
  layout,
  onSelect,
}: {
  product: MenuProductCardProduct;
  layout: "lista" | "grade";
  onSelect?: (productId: string) => void;
}) {
  const soldOut = !product.isAvailable;
  const grid = layout === "grade";
  const promotion = product.promotion;

  const oldPrice = promotion ? (
    <s className="tabular text-support text-muted-foreground">
      {formatCurrency(promotion.originalPrice)}
    </s>
  ) : null;

  const photo = product.imageUrl ? (
    // A foto já chega reduzida em WebP; o otimizador do Next não acrescenta nada.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.imageUrl}
      alt={product.name}
      loading="lazy"
      className={cn(
        "shrink-0 rounded-control bg-muted object-cover",
        grid ? "aspect-[4/3] w-full" : "size-24",
        soldOut && "grayscale",
      )}
    />
  ) : null;

  return (
    <button
      type="button"
      onClick={
        onSelect ? () => onSelect(product.id) : undefined
      }
      className={cn(
        "flex w-full rounded-surface border bg-card p-3 text-left transition-colors outline-none hover:border-border-strong focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground",
        grid ? "flex-col gap-3" : "items-stretch gap-3",
        soldOut && "opacity-60",
      )}
    >
      {grid ? photo : null}

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body font-semibold">
          {product.name}
        </span>
        {product.description ? (
          <span className="line-clamp-2 text-support text-muted-foreground">
            {product.description}
          </span>
        ) : null}
        <span className="mt-auto flex flex-col pt-2">
          {grid ? oldPrice : null}
          <span className="flex flex-wrap items-center gap-2">
            <span className="tabular text-body font-semibold">
              {formatCurrency(product.price)}
            </span>
            {grid ? null : oldPrice}
            {soldOut ? (
              <Badge variant="muted">Esgotado</Badge>
            ) : (
              <>
                {promotion ? (
                  <Badge>
                    {discountTag(
                      promotion.originalPrice,
                      product.price,
                    )}
                  </Badge>
                ) : null}
                {product.badges.map((badge) => (
                  <Badge
                    key={badge}
                    className="bg-primary-soft text-primary-soft-foreground"
                  >
                    {badge}
                  </Badge>
                ))}
              </>
            )}
          </span>
        </span>
      </span>

      {grid ? null : photo}
    </button>
  );
}
