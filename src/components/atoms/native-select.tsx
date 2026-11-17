import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Lista de escolha nativa do aparelho, no visual dos campos de texto. Para
 * formulário do cliente no celular, onde a lista do sistema é mais fácil de
 * usar que um menu desenhado.
 */
function NativeSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-11 w-full min-w-0 rounded-control border border-input bg-card px-3 text-body transition-colors outline-none focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
