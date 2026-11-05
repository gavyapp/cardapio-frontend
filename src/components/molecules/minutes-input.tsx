import type { ComponentProps } from "react";

import { Input } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

/** Campo de minutos: só dígitos, com o sufixo "min" dentro do campo. */
export function MinutesInput({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        className={cn("tabular pr-12", className)}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[15px] text-muted-foreground"
      >
        min
      </span>
    </div>
  );
}
