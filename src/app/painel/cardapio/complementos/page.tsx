import type { Metadata } from "next";
import { Suspense } from "react";

import { NewItemButton } from "@/components/molecules/new-item-button";
import { ComplementGroupList } from "@/components/organisms/complement-group-list";
import {
  CatalogPageSkeleton,
  CatalogPageTemplate,
} from "@/components/templates/catalog-page-template";
import { GROUP_PARAM } from "@/lib/catalog/params";
import { listComplementGroups } from "@/lib/data/complement-groups";
import { requirePanelAccess } from "@/lib/panel/access";

import {
  deleteComplementGroupAction,
  reorderComplementGroupsAction,
  saveComplementGroupAction,
  setComplementAvailabilityAction,
} from "./actions";

export const metadata: Metadata = { title: "Complementos" };

const ROUTE = "/painel/cardapio/complementos";

async function ComplementGroups() {
  const access = await requirePanelAccess(ROUTE);
  if (access.status !== "with-store") return null;

  const groups = await listComplementGroups(
    access.store.id,
  );

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
        actions={{
          save: saveComplementGroupAction,
          setOptionAvailability:
            setComplementAvailabilityAction,
          reorder: reorderComplementGroupsAction,
          remove: deleteComplementGroupAction,
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
