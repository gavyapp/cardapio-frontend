import type { ComponentProps } from "react";

import { Input } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

/** Campo de valor em reais com o prefixo "R$" dentro do campo. */
export function CurrencyInput({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[15px] text-muted-foreground"
      >
        R$
      </span>
      <Input
        inputMode="decimal"
        className={cn("tabular pl-10", className)}
        {...props}
      />
    </div>
  );
}
