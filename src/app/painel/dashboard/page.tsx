import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

// Página provisória; o conteúdo entra na task da tela.
export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
    </div>
  );
}
