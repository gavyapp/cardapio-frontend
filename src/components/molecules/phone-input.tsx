import type { ComponentProps } from "react";

import { Input } from "@/components/atoms/input";
import { maskPhoneInput } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Campo de telefone com máscara enquanto digita: "(48) 99999-9999" ou
 * "(48) 3333-4444". Quem usa recebe o texto já formatado no onChange; a
 * gravação fica só com os dígitos.
 */
export function PhoneInput({
  className,
  onChange,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(48) 99999-9999"
      maxLength={15}
      className={cn("tabular", className)}
      {...props}
      onChange={(event) => {
        event.target.value = maskPhoneInput(
          event.target.value,
        );
        onChange?.(event);
      }}
    />
  );
}
