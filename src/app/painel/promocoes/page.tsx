import type { Metadata } from "next";
import { Suspense } from "react";

import { NewItemButton } from "@/components/molecules/new-item-button";
import { PromotionList } from "@/components/organisms/promotion-list";
import {
  CatalogPageSkeleton,
  CatalogPageTemplate,
} from "@/components/templates/catalog-page-template";
import { listPanelCategories } from "@/lib/data/categories";
import { listPanelPromotions } from "@/lib/data/panel-promotions";
import { listPanelProducts } from "@/lib/data/products";
import { requirePanelAccess } from "@/lib/panel/access";
import { PROMOTION_PARAM } from "@/lib/promotions/draft";

import {
  deletePromotionAction,
  duplicatePromotionAction,
  savePromotionAction,
  setPromotionActiveAction,
} from "./actions";

export const metadata: Metadata = { title: "Promoções" };

const ROUTE = "/painel/promocoes";

async function Promotions() {
  const access = await requirePanelAccess(ROUTE);
  // Sem loja, o layout do painel já mostra o aviso.
  if (access.status !== "with-store") return null;
  const storeId = access.store.id;

  const [promotions, products, categories] =
    await Promise.all([
      listPanelPromotions(storeId),
      listPanelProducts(storeId),
      listPanelCategories(storeId),
    ]);

  // Produtos na ordem do cardápio, com o nome da categoria para a busca.
  const categoryOrder = new Map(
    categories.map((category, index) => [
      category.id,
      { index, name: category.name },
    ]),
  );
  const productOptions = products
    .filter((product) =>
      categoryOrder.has(product.categoryId),
    )
    .sort(
      (a, b) =>
        categoryOrder.get(a.categoryId)!.index -
        categoryOrder.get(b.categoryId)!.index,
    )
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      categoryName: categoryOrder.get(product.categoryId)!
        .name,
    }));

  return (
    <CatalogPageTemplate
      title="Promoções"
      count={promotions.length}
      action={
        <NewItemButton param={PROMOTION_PARAM}>
          Nova promoção
        </NewItemButton>
      }
    >
      <PromotionList
        promotions={promotions}
        products={productOptions}
        now={new Date().toISOString()}
        actions={{
          save: savePromotionAction,
          setActive: setPromotionActiveAction,
          duplicate: duplicatePromotionAction,
          remove: deletePromotionAction,
        }}
      />
    </CatalogPageTemplate>
  );
}

export default function PromotionsPage() {
  return (
    <Suspense
      fallback={<CatalogPageSkeleton title="Promoções" />}
    >
      <Promotions />
    </Suspense>
  );
}
