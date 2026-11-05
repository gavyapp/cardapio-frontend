"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/atoms/button";
import { setSearchParam } from "@/lib/hooks/use-search-param-state";

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
    <Button
      onClick={() => setSearchParam(name, value)}
      // Botão de ação do cabeçalho, como no protótipo: altura e canto da
      // busca ao lado (44px no celular, 36px no computador, canto de 4px).
      className="rounded-[4px] font-semibold lg:h-9"
    >
      <Plus aria-hidden />
      {children}
    </Button>
  );
}
