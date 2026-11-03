import type { ReactNode } from "react";

import { SaveBar } from "@/components/molecules/save-bar";
import {
  SectionNav,
  type NavSection,
} from "@/components/organisms/section-nav";

/** Página de configurações: menu lateral fixo, seções empilhadas e barra de salvar. */
export function SectionedSettingsTemplate({
  sections,
  navLabel,
  saveMessage,
  children,
}: {
  sections: readonly NavSection[];
  navLabel: string;
  saveMessage: string;
  children: ReactNode;
}) {
  return (
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
  );
}
