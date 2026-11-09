"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/atoms/button";
import { NEW_ITEM } from "@/lib/catalog/params";
import { setSearchParam } from "@/lib/hooks/use-search-param-state";

/**
 * Botão "Novo …" do cabeçalho da página: abre o editor de um item novo.
 * O editor vive na lista da página, então o botão só grava `?<param>=novo`
 * na URL e a lista, que lê o mesmo parâmetro, abre o editor.
 */
export function NewItemButton({
  param,
  children,
}: {
  /** Parâmetro que abre o editor (ex.: PRODUCT_PARAM). */
  param: string;
  children: ReactNode;
}) {
  return (
    <Button
      onClick={() => setSearchParam(param, NEW_ITEM)}
      // Mesma medida da busca ao lado: compacto do protótipo.
      size="compact"
      className="font-semibold"
    >
      <Plus aria-hidden className="size-4 lg:size-3.5" />
      {children}
    </Button>
  );
}
