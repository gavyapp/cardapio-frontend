import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryList } from "@/components/organisms/category-list";
import {
  CatalogPageSkeleton,
  CatalogPageTemplate,
} from "@/components/templates/catalog-page-template";
import { listPanelCategories } from "@/lib/data/categories";
import { requirePanelAccess } from "@/lib/panel-access";

import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
  reorderCategoriesAction,
  setCategoryAvailabilityAction,
} from "./category-actions";

export const metadata: Metadata = { title: "Produtos" };

const ROUTE = "/painel/cardapio/produtos";

async function Products() {
  const access = await requirePanelAccess(ROUTE);
  // Sem loja, o layout do painel já mostra o aviso.
  if (access.status !== "with-store") return null;

  const categories = await listPanelCategories(
    access.store.id,
  );
  const productCount = categories.reduce(
    (total, category) => total + category.productCount,
    0,
  );

  return (
    <CatalogPageTemplate
      title="Produtos"
      count={productCount}
    >
      <CategoryList
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          isAvailable: category.isAvailable,
          productCount: category.productCount,
        }))}
        actions={{
          create: createCategoryAction,
          rename: renameCategoryAction,
          setAvailability: setCategoryAvailabilityAction,
          reorder: reorderCategoriesAction,
          remove: deleteCategoryAction,
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
