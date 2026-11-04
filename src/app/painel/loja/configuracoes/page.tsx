import type { Metadata } from "next";

import {
  AlertsSection,
  DeliverySection,
  HoursSection,
  PaymentSection,
  StoreDataSection,
} from "@/components/organisms/store-settings-sections";
import { SectionedSettingsTemplate } from "@/components/templates/sectioned-settings-template";

import { saveOrderAlertsAction } from "./actions";

export const metadata: Metadata = {
  title: "Configurações da loja",
};

const SECTIONS = [
  { id: "dados-da-loja", label: "Dados da loja" },
  { id: "horario", label: "Horário de funcionamento" },
  { id: "entrega", label: "Entrega e retirada" },
  { id: "pagamento", label: "Pagamento" },
  { id: "pedidos", label: "Pedidos e avisos" },
] as const;

// Valores de exemplo da loja do seed; a leitura real entra depois.
const SAMPLE = {
  store: {
    name: "Stack Burguer",
    cnpj: "41.228.903/0001-17",
    address: "Rua das Acácias, 214 – Centro",
    menuHost: "stack-burguer.gavy.com",
  },
  hours: [
    { day: "Segunda", hours: null },
    { day: "Terça", hours: null },
    { day: "Quarta", hours: null },
    { day: "Quinta", hours: "18:30 – 23:00" },
    { day: "Sexta", hours: "18:30 – 23:00" },
    { day: "Sábado", hours: "18:30 – 23:00" },
    { day: "Domingo", hours: null },
  ],
  delivery: {
    deliveryFee: "6,00",
    deliveryTime: "35–50 min",
    pickupTime: "15 min",
  },
  payment: [
    { id: "pix", label: "Pix", enabled: true },
    { id: "cash", label: "Dinheiro", enabled: true },
    {
      id: "card",
      label: "Cartão na maquininha",
      enabled: true,
    },
  ],
};

export default function StoreSettingsPage() {
  return (
    <SectionedSettingsTemplate
      sections={SECTIONS}
      navLabel="Seções das configurações"
      saveMessage="Os dados aparecem no cardápio assim que você salva."
    >
      <StoreDataSection
        id={SECTIONS[0].id}
        values={SAMPLE.store}
      />
      <HoursSection
        id={SECTIONS[1].id}
        days={SAMPLE.hours}
      />
      <DeliverySection
        id={SECTIONS[2].id}
        values={SAMPLE.delivery}
      />
      <PaymentSection
        id={SECTIONS[3].id}
        methods={SAMPLE.payment}
      />
      <AlertsSection
        id={SECTIONS[4].id}
        save={saveOrderAlertsAction}
      />
    </SectionedSettingsTemplate>
  );
}
