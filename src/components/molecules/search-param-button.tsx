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
      // Botão de ação do cabeçalho com a medida dos controles de 36px do
      // protótipo (filtros e busca): no computador, texto de 13px, ícone de
      // 14px e 12px de respiro; no celular, 44px e 15px. Canto de 4px.
      className="rounded-[4px] font-semibold lg:h-9 lg:px-3 lg:text-[13px]"
    >
      <Plus aria-hidden className="size-4 lg:size-3.5" />
      {children}
    </Button>
  );
}
