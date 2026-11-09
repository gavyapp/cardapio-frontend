import type { Metadata } from "next";

export const metadata: Metadata = { title: "Promoções" };

// Página provisória; o conteúdo entra na task da tela.
export default function PromotionsPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-6">
      <h1 className="text-title font-semibold">
        Promoções
      </h1>
    </div>
  );
}
