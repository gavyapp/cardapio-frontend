import type { ComponentProps } from "react";

import { Input } from "@/components/atoms/input";
import { maskAmountInput } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Campo de valor em reais com o prefixo "R$" dentro do campo. Formata
 * enquanto digita (os números entram pelos centavos: "2990" vira "29,90");
 * quem usa recebe o texto já formatado no onChange.
 */
export function CurrencyInput({
  className,
  onChange,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-body text-muted-foreground"
      >
        R$
      </span>
      <Input
        inputMode="numeric"
        className={cn("tabular pl-10", className)}
        {...props}
        onChange={(event) => {
          event.target.value = maskAmountInput(
            event.target.value,
          );
          onChange?.(event);
        }}
      />
    </div>
  );
}
