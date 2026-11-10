import type { Metadata } from "next";

import { PageHeader } from "@/components/molecules/page-header";

export const metadata: Metadata = { title: "Dashboard" };

// Página provisória; o conteúdo entra na task da tela.
export default function DashboardPage() {
  return (
    <div className="w-full px-page py-4 sm:py-6">
      <PageHeader title="Dashboard" />
    </div>
  );
}
