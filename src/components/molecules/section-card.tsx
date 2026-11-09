import type { ReactNode } from "react";

import { Separator } from "@/components/atoms/separator";

/** Card de seção: título, explicação, ação opcional à direita e conteúdo. */
export function SectionCard({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-32 rounded-surface border bg-card"
    >
      <header className="flex items-start justify-between gap-4 px-6 py-5">
        <div>
          <h2
            id={`${id}-title`}
            className="text-section font-semibold"
          >
            {title}
          </h2>
          {description ? (
            <p className="text-meta text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </header>
      <Separator />
      {children}
    </section>
  );
}
