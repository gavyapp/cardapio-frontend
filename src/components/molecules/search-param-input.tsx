"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/atoms/input";
import {
  setSearchParam,
  useSearchParamState,
} from "@/lib/hooks/use-search-param-state";

/**
 * Campo de busca do cabeçalho da página. Grava o texto num parâmetro da URL
 * que a lista da página lê para filtrar.
 */
export function SearchParamInput({
  name,
  placeholder,
  label = placeholder,
}: {
  name: string;
  placeholder: string;
  /** Nome acessível, quando há mais de uma busca na página. */
  label?: string;
}) {
  const [param] = useSearchParamState(name);
  const [value, setValue] = useState(param ?? "");
  const [lastParam, setLastParam] = useState(param);

  // A busca pode ser limpa por fora (botão "Limpar busca" da lista).
  if (param !== lastParam) {
    setLastParam(param);
    const typed = value.trim() ? value : null;
    if (param !== typed) setValue(param ?? "");
  }

  function change(next: string) {
    setValue(next);
    setSearchParam(name, next.trim() ? next : null, {
      replace: true,
    });
  }

  return (
    <div className="relative w-full text-muted-foreground sm:w-64">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        className="bg-card px-9 [&::-webkit-search-cancel-button]:hidden"
        value={value}
        onChange={(event) => change(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => change("")}
          className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
