import type { ReactNode } from "react";

import { PlatformMark } from "@/components/atoms/platform-mark";

/**
 * Telas de acesso ao painel (login, conta sem loja): faixa escura com a
 * marca, como o cabeçalho do painel, e um cartão centralizado.
 */
export function PanelAccessTemplate({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="bg-foreground text-background">
        <div className="flex h-16 items-center px-4 sm:px-6">
          <PlatformMark
            className="text-body"
            squareClassName="bg-background"
          />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-16">
        <section className="w-full max-w-sm rounded-surface border bg-card p-6 sm:p-8">
          <h1 className="text-section font-semibold">
            {title}
          </h1>
          <div className="mt-1.5 text-body text-muted-foreground">
            {description}
          </div>
          <div className="mt-6">{children}</div>
        </section>
      </main>
    </div>
  );
}
