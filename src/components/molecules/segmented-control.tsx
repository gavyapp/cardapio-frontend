import { cn } from "@/lib/utils";

/**
 * Escolha entre poucas opções lado a lado (radiogroup), no visual único do
 * protótipo: blocos colados com 1px de divisão e a opção escolhida em preto.
 */
export function SegmentedControl<
  T extends string | boolean,
>({
  label,
  labelledBy,
  value,
  options,
  onChange,
  fullWidth = false,
}: {
  /** Nome acessível, quando não há rótulo visível. */
  label?: string;
  /** Id do rótulo visível, no lugar de label. */
  labelledBy?: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
  /** Ocupa a largura disponível, com as opções divididas por igual. */
  fullWidth?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cn(
        "flex gap-px overflow-hidden rounded-control border bg-border",
        fullWidth ? "w-full" : "w-fit self-start",
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
              "h-11 px-4 text-support focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-current lg:h-10.5",
              fullWidth && "flex-1",
              selected
                ? "bg-foreground font-semibold text-background"
                : "bg-card text-foreground hover:bg-muted",
            )}
          >
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}
