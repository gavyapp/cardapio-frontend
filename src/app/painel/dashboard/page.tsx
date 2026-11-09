import type { Metadata } from "next";

import { PageHeader } from "@/components/molecules/page-header";

export const metadata: Metadata = { title: "Dashboard" };

// Página provisória; o conteúdo entra na task da tela.
export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-6">
      <PageHeader title="Dashboard" />
    </div>
  );
}
