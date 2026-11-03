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
            className="text-[15px]"
            squareClassName="bg-background"
          />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-16">
        <section className="w-full max-w-sm rounded-xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">
            {title}
          </h1>
          <div className="mt-1.5 text-[15px] text-muted-foreground">
            {description}
          </div>
          <div className="mt-6">{children}</div>
        </section>
      </main>
    </div>
  );
}
