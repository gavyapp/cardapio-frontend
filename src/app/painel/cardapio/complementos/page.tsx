import type { Metadata } from "next";
import { Suspense } from "react";

import { NewItemButton } from "@/components/molecules/new-item-button";
import { ComplementGroupList } from "@/components/organisms/complement-group-list";
import {
  CatalogPageSkeleton,
  CatalogPageTemplate,
} from "@/components/templates/catalog-page-template";
import { GROUP_PARAM } from "@/lib/catalog/params";
import { productChoices } from "@/lib/catalog/group-products";
import { listPanelCategories } from "@/lib/data/categories";
import { listComplementGroups } from "@/lib/data/complement-groups";
import { listPanelProducts } from "@/lib/data/products";
import { requirePanelAccess } from "@/lib/panel/access";

import {
  deleteComplementGroupAction,
  reorderComplementGroupsAction,
  saveComplementGroupAction,
  setComplementAvailabilityAction,
  setComplementGroupProductsAction,
} from "./actions";

export const metadata: Metadata = { title: "Complementos" };

const ROUTE = "/painel/cardapio/complementos";

async function ComplementGroups() {
  const access = await requirePanelAccess(ROUTE);
  if (access.status !== "with-store") return null;

  const [groups, categories, products] = await Promise.all([
    listComplementGroups(access.store.id),
    listPanelCategories(access.store.id),
    listPanelProducts(access.store.id),
  ]);

  return (
    <CatalogPageTemplate
      title="Complementos"
      count={groups.length}
      action={
        <NewItemButton param={GROUP_PARAM}>
          Novo grupo
        </NewItemButton>
      }
    >
      <ComplementGroupList
        groups={groups}
        productCategories={productChoices(
          categories,
          products,
        )}
        actions={{
          save: saveComplementGroupAction,
          setOptionAvailability:
            setComplementAvailabilityAction,
          reorder: reorderComplementGroupsAction,
          remove: deleteComplementGroupAction,
          setProducts: setComplementGroupProductsAction,
        }}
      />
    </CatalogPageTemplate>
  );
}

export default function ComplementsPage() {
  return (
    <Suspense
      fallback={
        <CatalogPageSkeleton title="Complementos" />
      }
    >
      <ComplementGroups />
    </Suspense>
  );
}
