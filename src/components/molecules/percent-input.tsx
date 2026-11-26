import type { ComponentProps } from "react";

import { Input } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

/**
 * Campo de percentual com o "%" dentro do campo, à direita. Aceita só
 * números e uma vírgula com até 2 casas ("12,5"); quem usa recebe o texto
 * já limpo no onChange.
 */
export function PercentInput({
  className,
  onChange,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        className={cn("tabular pr-10", className)}
        {...props}
        onChange={(event) => {
          event.target.value = cleanPercent(
            event.target.value,
          );
          onChange?.(event);
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-body text-muted-foreground"
      >
        %
      </span>
    </div>
  );
}

/** "12.5a" → "12,5"; "1,234" → "1,23". */
function cleanPercent(typed: string): string {
  const [whole, ...rest] = typed
    .replace(/\./g, ",")
    .replace(/[^\d,]/g, "")
    .split(",");
  const digits = whole.slice(0, 2);
  return rest.length
    ? `${digits},${rest.join("").slice(0, 2)}`
    : digits;
}
