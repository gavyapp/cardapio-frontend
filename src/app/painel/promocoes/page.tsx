import type { Metadata } from "next";

import { PageHeader } from "@/components/molecules/page-header";

export const metadata: Metadata = { title: "Promoções" };

// Página provisória; o conteúdo entra na task da tela.
export default function PromotionsPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-6">
      <PageHeader title="Promoções" />
    </div>
  );
}
