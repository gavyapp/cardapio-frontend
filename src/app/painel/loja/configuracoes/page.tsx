import type { Metadata } from "next";
import { Suspense } from "react";

import {
  AlertsSection,
  DeliverySection,
  PaymentSection,
} from "@/components/organisms/store-settings-sections";
import { StoreHoursSection } from "@/components/organisms/store-hours-section";
import { StoreProfileSection } from "@/components/organisms/store-profile-section";
import { SectionedSettingsTemplate } from "@/components/templates/sectioned-settings-template";
import {
  findStoreDetails,
  listStoreHours,
} from "@/lib/data/store-details";
import { requirePanelAccess } from "@/lib/panel/access";

import {
  saveOrderAlertsAction,
  saveStoreHoursAction,
  saveStoreSettingsAction,
} from "./actions";
import {
  deliveryFeeView,
  dayShifts,
  menuHostFor,
  paymentMethodsView,
  phoneView,
} from "@/lib/store/settings-view";

export const metadata: Metadata = {
  title: "Configurações da loja",
};

const ROUTE = "/painel/loja/configuracoes";

const SECTIONS = [
  { id: "dados-da-loja", label: "Dados da loja" },
  { id: "horario", label: "Horário de funcionamento" },
  { id: "entrega", label: "Entrega e retirada" },
  { id: "pagamento", label: "Pagamento" },
  { id: "pedidos", label: "Pedidos e avisos" },
] as const;

async function StoreSettings() {
  const access = await requirePanelAccess(ROUTE);
  // Sem loja, o layout do painel já mostra o aviso.
  if (access.status !== "with-store") return null;
  const storeId = access.store.id;

  const [store, shifts] = await Promise.all([
    findStoreDetails(storeId),
    listStoreHours(storeId),
  ]);
  if (!store) return null;

  return (
    <SectionedSettingsTemplate
      sections={SECTIONS}
      navLabel="Seções das configurações"
      formId="store-profile-form"
      saveMessage="Os dados aparecem no cardápio assim que você salva."
    >
      <StoreProfileSection
        id={SECTIONS[0].id}
        values={{
          name: store.name,
          phone: phoneView(store.phone),
          street: store.address.street ?? "",
          number: store.address.number ?? "",
          district: store.address.district ?? "",
          city: store.address.city ?? "",
          state: store.address.state ?? "",
          menuHost: menuHostFor(store.slug),
        }}
        onSave={saveStoreSettingsAction}
      />
      <StoreHoursSection
        id={SECTIONS[1].id}
        days={dayShifts(shifts)}
        onSave={saveStoreHoursAction}
      />
      <DeliverySection
        id={SECTIONS[2].id}
        values={{
          deliveryFee: deliveryFeeView(
            store.rules.deliveryFee,
          ),
          deliveryTimeMinutes:
            store.rules.deliveryTimeMinutes,
          pickupTimeMinutes: store.rules.pickupTimeMinutes,
        }}
      />
      <PaymentSection
        id={SECTIONS[3].id}
        methods={paymentMethodsView(
          store.rules.paymentMethods,
        )}
      />
      <AlertsSection
        id={SECTIONS[4].id}
        save={saveOrderAlertsAction}
      />
    </SectionedSettingsTemplate>
  );
}

export default function StoreSettingsPage() {
  return (
    <Suspense fallback={null}>
      <StoreSettings />
    </Suspense>
  );
}
