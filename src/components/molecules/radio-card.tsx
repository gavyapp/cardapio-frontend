import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Opção de escolha única em forma de cartão, com título e uma linha de
 * apoio. Vai dentro de um elemento com role="radiogroup". O conteúdo
 * (`children`) aparece dentro do cartão, abaixo da opção.
 */
export function RadioCard({
  selected,
  title,
  description,
  invalid = false,
  onSelect,
  children,
}: {
  selected: boolean;
  title: string;
  description?: string;
  /** Grupo com erro: a borda fica vermelha. */
  invalid?: boolean;
  onSelect: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-control border bg-card",
        invalid && "border-destructive",
        selected &&
          "border-primary bg-primary-soft text-primary-soft-foreground",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="flex min-h-13 w-full items-center gap-3 rounded-control px-4 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        <span
          aria-hidden
          className={cn(
            "size-5 shrink-0 rounded-full border border-border-strong bg-card",
            selected && "border-6 border-primary",
          )}
        />
        <span className="flex min-w-0 flex-col">
          <span className="text-body font-semibold">
            {title}
          </span>
          {description ? (
            <span
              className={cn(
                "text-support",
                !selected && "text-muted-foreground",
              )}
            >
              {description}
            </span>
          ) : null}
        </span>
      </button>
      {children ? (
        <div className="px-4 pb-4">{children}</div>
      ) : null}
    </div>
  );
}
