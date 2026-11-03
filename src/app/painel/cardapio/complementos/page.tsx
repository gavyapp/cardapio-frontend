import type { Metadata } from "next";
import { Suspense } from "react";

import { ComplementGroupList } from "@/components/organisms/complement-group-list";
import {
  CatalogPageSkeleton,
  CatalogPageTemplate,
} from "@/components/templates/catalog-page-template";
import { listComplementGroups } from "@/lib/data/complement-groups";
import { requirePanelAccess } from "@/lib/panel-access";

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
  const total = groups.length;

  return (
    <CatalogPageTemplate
      title="Complementos"
      summary={total === 1 ? "1 grupo" : `${total} grupos`}
      description="Os grupos são compartilhados. O que mudar aqui vale para todos os produtos que usam o grupo. Para ligar um grupo a um produto, abra o produto."
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
