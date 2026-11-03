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
} from "./actions";

export const metadata: Metadata = { title: "Categorias" };

const ROUTE = "/painel/cardapio/categorias";

async function Categories() {
  const access = await requirePanelAccess(ROUTE);
  // Sem loja, o layout do painel já mostra o aviso.
  if (access.status !== "with-store") return null;

  const categories = await listPanelCategories(
    access.store.id,
  );
  const total = categories.length;

  return (
    <CatalogPageTemplate
      title="Categorias"
      summary={
        total === 1 ? "1 categoria" : `${total} categorias`
      }
      description="Arraste pela alça para mudar a ordem do cardápio. Categoria desligada some do cardápio com todos os produtos dela."
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

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={<CatalogPageSkeleton title="Categorias" />}
    >
      <Categories />
    </Suspense>
  );
}
