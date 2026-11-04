import type { ReactNode } from "react";

/** Cartão de seção dos editores laterais: título, descrição e conteúdo. */
export function EditorCard({
  title,
  description,
  toolbar,
  children,
}: {
  title: ReactNode;
  description?: string;
  /** Controles logo abaixo da descrição, ainda no cabeçalho. */
  toolbar?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header className="flex min-h-14 flex-col justify-center gap-1 border-b px-4 py-3 last:border-b-0 sm:px-6">
        <h3 className="text-[15px] leading-tight font-semibold">
          {title}
        </h3>
        {description ? (
          <p className="text-[13px] text-muted-foreground">
            {description}
          </p>
        ) : null}
        {toolbar ? (
          <div className="pt-2">{toolbar}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}
