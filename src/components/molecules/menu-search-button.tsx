"use client";

import { Search } from "lucide-react";

import { useMenuSearch } from "@/components/providers/menu-search-provider";
import { cn } from "@/lib/utils";

const STYLES = {
  // Círculo escuro sobre a capa da loja.
  overlay:
    "size-11 justify-center rounded-full bg-black/55 text-white hover:bg-black/70 focus-visible:ring-white",
  // Só a lupa, ao lado do nome da loja.
  icon: "size-11 justify-center rounded-control text-foreground hover:bg-muted focus-visible:ring-foreground",
  // Aparência de campo, na barra fixa do computador.
  field:
    "h-11 w-64 gap-2 rounded-control bg-muted px-3 text-body text-muted-foreground hover:bg-border focus-visible:ring-foreground",
} as const;

/** Abre a busca do cardápio. */
export function MenuSearchButton({
  variant,
  className,
}: {
  variant: keyof typeof STYLES;
  className?: string;
}) {
  const { open } = useMenuSearch();

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Buscar no cardápio"
      className={cn(
        "flex shrink-0 items-center transition-colors outline-none focus-visible:ring-2",
        STYLES[variant],
        className,
      )}
    >
      <Search aria-hidden className="size-5 shrink-0" />
      {variant === "field" ? (
        <span aria-hidden>Buscar no cardápio</span>
      ) : null}
    </button>
  );
}
