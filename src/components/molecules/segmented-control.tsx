import { cn } from "@/lib/utils";

/**
 * Escolha entre poucas opções lado a lado (radiogroup). "pill" é o
 * alternador discreto (Com foto / Sem foto); "solid" destaca a escolhida em
 * preto (Obrigatório / Opcional), como no protótipo.
 */
export function SegmentedControl<
  T extends string | boolean,
>({
  label,
  labelledBy,
  value,
  options,
  onChange,
  variant = "pill",
}: {
  /** Nome acessível, quando não há rótulo visível. */
  label?: string;
  /** Id do rótulo visível, no lugar de label. */
  labelledBy?: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
  variant?: "pill" | "solid";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cn(
        "flex w-fit self-start",
        variant === "pill"
          ? "rounded-md border bg-muted p-0.5"
          : "overflow-hidden rounded-md border",
      )}
    >
      {options.map(([optionValue, optionLabel]) => {
        const selected = optionValue === value;
        return (
          <button
            key={optionLabel}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(optionValue)}
            className={cn(
              "text-[13px] outline-none focus-visible:ring-1 focus-visible:ring-foreground",
              variant === "pill"
                ? cn(
                    "h-8 rounded-[5px] px-3 font-medium text-muted-foreground",
                    selected &&
                      "bg-card text-foreground shadow-sm",
                  )
                : cn(
                    "h-11 px-4 focus-visible:ring-inset",
                    selected
                      ? "bg-foreground font-semibold text-background"
                      : "bg-card hover:bg-muted",
                  ),
            )}
          >
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}
