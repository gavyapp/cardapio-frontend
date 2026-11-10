import type { ReactNode } from "react";

import { PageHeader } from "@/components/molecules/page-header";
import { SaveBar } from "@/components/molecules/save-bar";
import {
  SectionNav,
  type NavSection,
} from "@/components/organisms/section-nav";
import { SettingsFormProvider } from "@/components/providers/settings-form-context";

/**
 * Página de configurações: menu lateral fixo, seções empilhadas e barra de
 * salvar, que submete o formulário identificado por `formId`.
 */
export function SectionedSettingsTemplate({
  title,
  sections,
  navLabel,
  formId,
  saveMessage,
  children,
}: {
  /** Título da página, acima do menu e das seções. */
  title: string;
  sections: readonly NavSection[];
  navLabel: string;
  formId: string;
  saveMessage: string;
  children: ReactNode;
}) {
  return (
    <SettingsFormProvider formId={formId}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-page py-4 sm:py-6">
        <PageHeader title={title} />
        <div className="grid items-start gap-4 lg:grid-cols-[280px_1fr]">
          <SectionNav
            sections={sections}
            ariaLabel={navLabel}
          />
          <div className="flex flex-col gap-4">
            {children}
            <SaveBar message={saveMessage} />
          </div>
        </div>
      </div>
    </SettingsFormProvider>
  );
}
