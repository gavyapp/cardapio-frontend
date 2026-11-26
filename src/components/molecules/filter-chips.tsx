import { cn } from "@/lib/utils";

export type FilterChip<T extends string> = {
  id: T;
  label: string;
  count: number;
  /** Contagem em vermelho, para o que pede atenção (ex.: não pagos). */
  alert?: boolean;
};

/**
 * Filtros de uma lista em botões com a contagem ao lado; o escolhido fica
 * em preto. Clicar no escolhido chama onChange com o mesmo id: quem usa
 * decide se isso limpa o filtro.
 */
export function FilterChips<T extends string>({
  label = "Filtrar",
  chips,
  value,
  onChange,
}: {
  label?: string;
  chips: readonly FilterChip<T>[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-2"
    >
      {chips.map(
        ({ id, label: chipLabel, count, alert }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(id)}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-control border px-3 text-support whitespace-nowrap outline-none hover:border-muted-foreground focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1 lg:h-9",
                active
                  ? "border-foreground bg-foreground font-semibold text-background hover:border-foreground"
                  : "bg-card text-foreground",
              )}
            >
              {chipLabel}
              <span
                className={cn(
                  "tabular inline-flex h-5 min-w-5 items-center justify-center rounded-control text-caption font-semibold",
                  alert && count > 0
                    ? "bg-destructive px-1 text-destructive-foreground"
                    : active
                      ? "text-background"
                      : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        },
      )}
    </div>
  );
}
