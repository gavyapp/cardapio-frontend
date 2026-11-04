import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchParamButton } from "@/components/molecules/search-param-button";
import { SearchParamInput } from "@/components/molecules/search-param-input";
import { ProductList } from "@/components/organisms/product-list";
import {
  CatalogPageSkeleton,
  CatalogPageTemplate,
} from "@/components/templates/catalog-page-template";
import {
  NEW_ITEM,
  PRODUCT_PARAM,
  SEARCH_PARAM,
} from "@/lib/catalog/params";
import { listPanelCategories } from "@/lib/data/categories";
import { listComplementGroups } from "@/lib/data/complement-groups";
import { listPanelProducts } from "@/lib/data/products";
import { requirePanelAccess } from "@/lib/panel/access";

import { saveComplementGroupAction } from "../complementos/actions";
import {
  deleteProductAction,
  duplicateProductAction,
  reorderProductsAction,
  saveProductAction,
  setProductAvailabilityAction,
  setProductSuggestedAction,
} from "./actions";
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
  const storeId = access.store.id;

  const [categories, products, groups] = await Promise.all([
    listPanelCategories(storeId),
    listPanelProducts(storeId),
    listComplementGroups(storeId),
  ]);

  return (
    <CatalogPageTemplate
      title="Produtos"
      count={products.length}
      action={
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <SearchParamInput
            name={SEARCH_PARAM}
            placeholder="Buscar produto"
          />
          <SearchParamButton
            name={PRODUCT_PARAM}
            value={NEW_ITEM}
          >
            Novo produto
          </SearchParamButton>
        </div>
      }
    >
      <ProductList
        storeId={storeId}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          isAvailable: category.isAvailable,
          productCount: category.productCount,
        }))}
        products={products}
        groups={groups}
        actions={{
          save: saveProductAction,
          duplicate: duplicateProductAction,
          setAvailability: setProductAvailabilityAction,
          setSuggested: setProductSuggestedAction,
          reorder: reorderProductsAction,
          remove: deleteProductAction,
          saveGroup: saveComplementGroupAction,
        }}
        categoryActions={{
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
