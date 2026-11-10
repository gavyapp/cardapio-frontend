"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

// Trilho 44×24 com 2px de folga; polegar branco de 20px com sombra leve.
// Ligado: trilho na cor primária. Desligado: trilho na cor de borda.
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card aria-invalid:ring-2 aria-invalid:ring-destructive/40 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-4 data-[size=sm]:w-7 data-checked:bg-primary data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-card shadow-[0_1px_2px_rgb(22_25_29_/_25%)] transition-transform duration-150 group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-5 group-data-[size=sm]/switch:data-checked:translate-x-3 data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
