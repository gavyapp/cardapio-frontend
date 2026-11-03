"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/atoms/button";
import { setSearchParam } from "@/lib/use-search-param-state";

/**
 * Botão "Novo …" do cabeçalho da página: grava o parâmetro na URL e a lista
 * da página, que lê o mesmo parâmetro, abre o editor.
 */
export function SearchParamButton({
  name,
  value,
  children,
}: {
  name: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <Button onClick={() => setSearchParam(name, value)}>
      <Plus aria-hidden />
      {children}
    </Button>
  );
}
