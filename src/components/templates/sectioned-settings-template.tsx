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
  title,
  sections,
  navLabel,
  formId,
  saveMessage,
  children,
}: {
  /** Título da página, acima do menu e das seções. */
  title?: string;
  sections: readonly NavSection[];
  navLabel: string;
  formId: string;
  saveMessage: string;
  children: ReactNode;
}) {
  return (
    <SettingsFormProvider formId={formId}>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-4 sm:p-6">
        {title ? (
          <h1 className="text-2xl leading-tight font-semibold">
            {title}
          </h1>
        ) : null}
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
