import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductList } from "@/components/organisms/product-list";
import {
  CatalogPageSkeleton,
  CatalogPageTemplate,
} from "@/components/templates/catalog-page-template";
import { listPanelCategories } from "@/lib/data/categories";
import { listComplementGroups } from "@/lib/data/complement-groups";
import { listPanelProducts } from "@/lib/data/products";
import { describeGroupRule } from "@/lib/complement-rules";
import { requirePanelAccess } from "@/lib/panel-access";

import {
  deleteProductAction,
  duplicateProductAction,
  reorderProductsAction,
  saveProductAction,
  setProductAvailabilityAction,
} from "./actions";

export const metadata: Metadata = { title: "Produtos" };

const ROUTE = "/painel/cardapio/produtos";

async function Products() {
  const access = await requirePanelAccess(ROUTE);
  if (access.status !== "with-store") return null;
  const storeId = access.store.id;

  const [categories, products, groups] = await Promise.all([
    listPanelCategories(storeId),
    listPanelProducts(storeId),
    listComplementGroups(storeId),
  ]);
  const total = products.length;
  const soldOut = products.filter(
    (product) => !product.isAvailable,
  ).length;

  return (
    <CatalogPageTemplate
      title="Produtos"
      summary={`${total === 1 ? "1 produto" : `${total} produtos`}${soldOut ? ` · ${soldOut} esgotado${soldOut > 1 ? "s" : ""}` : ""}`}
      description="Clique no produto para editar. A chave na linha esgota ou volta o produto na hora. Arraste pela alça para mudar a ordem dentro da categoria."
    >
      <ProductList
        storeId={storeId}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          isAvailable: category.isAvailable,
        }))}
        products={products}
        groups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          rule: describeGroupRule(
            group.minSelect,
            group.maxSelect,
          ),
          optionNames:
            group.options
              .map((option) => option.name)
              .join(", ") || "Sem opções",
          hasNoActiveOption: !group.options.some(
            (option) => option.isAvailable,
          ),
        }))}
        actions={{
          save: saveProductAction,
          duplicate: duplicateProductAction,
          setAvailability: setProductAvailabilityAction,
          reorder: reorderProductsAction,
          remove: deleteProductAction,
        }}
      />
    </CatalogPageTemplate>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={<CatalogPageSkeleton title="Produtos" />}
    >
      <Products />
    </Suspense>
  );
}
