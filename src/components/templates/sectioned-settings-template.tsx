import type { ReactNode } from "react";

import { SaveBar } from "@/components/molecules/save-bar";
import {
  SectionNav,
  type NavSection,
} from "@/components/organisms/section-nav";
import { SettingsFormProvider } from "@/components/organisms/settings-form-context";

/**
 * Página de configurações: menu lateral fixo, seções empilhadas e barra de
 * salvar, que submete o formulário identificado por `formId`.
 */
export function SectionedSettingsTemplate({
  sections,
  navLabel,
  formId,
  saveMessage,
  children,
}: {
  sections: readonly NavSection[];
  navLabel: string;
  formId: string;
  saveMessage: string;
  children: ReactNode;
}) {
  return (
    <SettingsFormProvider formId={formId}>
      <div className="p-4 sm:p-6">
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
