import type { Metadata } from "next";
import { Suspense } from "react";

import {
  APPEARANCE_SECTIONS,
  AppearanceSections,
} from "@/components/organisms/appearance-sections";
import { SectionedSettingsTemplate } from "@/components/templates/sectioned-settings-template";
import { findStoreAppearance } from "@/lib/data/store-appearance";
import { requirePanelAccess } from "@/lib/panel/access";

import { saveAppearanceAction } from "./actions";

export const metadata: Metadata = { title: "Aparência" };

const ROUTE = "/painel/loja/aparencia";

async function Appearance() {
  const access = await requirePanelAccess(ROUTE);
  // Sem loja, o layout do painel já mostra o aviso.
  if (access.status !== "with-store") return null;
  const storeId = access.store.id;

  const appearance = await findStoreAppearance(storeId);

  return (
    <SectionedSettingsTemplate
      title="Aparência"
      sections={APPEARANCE_SECTIONS}
      navLabel="Seções da aparência"
      formId="appearance-form"
      saveMessage="As mudanças valem para o cardápio público depois de salvar."
    >
      <AppearanceSections
        storeId={storeId}
        values={appearance}
        onSave={saveAppearanceAction}
      />
    </SectionedSettingsTemplate>
  );
}

export default function AppearancePage() {
  return (
    <Suspense fallback={null}>
      <Appearance />
    </Suspense>
  );
}
