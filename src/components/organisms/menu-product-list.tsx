"use client";

import {
  MenuProductCard,
  type MenuProductCardProduct,
} from "@/components/molecules/menu-product-card";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/utils";

/** Produtos de uma categoria. Tocar num card abre o detalhe do produto. */
export function MenuProductList({
  products,
  layout,
}: {
  products: readonly MenuProductCardProduct[];
  layout: "lista" | "grade";
}) {
  const { openProduct } = useCart();

  return (
    <ul
      className={cn(
        "grid gap-3",
        layout === "grade" && "grid-cols-2 sm:grid-cols-3",
      )}
    >
      {products.map((product) => (
        <li key={product.id} className="flex">
          <MenuProductCard
            product={product}
            layout={layout}
            onSelect={openProduct}
          />
        </li>
      ))}
    </ul>
  );
}
