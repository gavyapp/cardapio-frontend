import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aparência" };

// Página provisória; o conteúdo entra na task da tela.
export default function AppearancePage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Aparência</h1>
    </div>
  );
}
