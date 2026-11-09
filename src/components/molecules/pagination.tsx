import { ChevronLeft, ChevronRight } from "lucide-react";

import { pageNumbers } from "@/lib/panel/pagination";
import { cn } from "@/lib/utils";

const BUTTON =
  "tabular flex h-11 min-w-11 items-center justify-center gap-1 rounded-control border bg-card px-3 text-meta whitespace-nowrap outline-none hover:border-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground disabled:pointer-events-none disabled:opacity-40 lg:h-9 lg:min-w-9";

/**
 * Rodapé de lista paginada: "1–20 de 47" à esquerda; Anterior, os números
 * (no computador) e Próxima à direita.
 */
export function Pagination({
  page,
  pageCount,
  first,
  last,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  first: number;
  last: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Páginas"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <p className="tabular text-meta text-muted-foreground">
        {first}–{last} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={BUTTON}
        >
          <ChevronLeft aria-hidden className="size-4" />
          Anterior
        </button>
        {pageNumbers(page, pageCount).map((n, index) =>
          n === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden
              className="w-6 text-center text-meta text-muted-foreground max-sm:hidden"
            >
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-label={`Página ${n}`}
              aria-current={n === page ? "page" : undefined}
              onClick={() => onPageChange(n)}
              className={cn(
                BUTTON,
                "max-sm:hidden",
                n === page &&
                  "border-foreground bg-foreground font-semibold text-background hover:border-foreground",
              )}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className={BUTTON}
        >
          Próxima
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
    </nav>
  );
}
