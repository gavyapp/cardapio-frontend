"use client";

import { useSearchParams } from "next/navigation";

/**
 * Estado guardado num parâmetro da URL (ex.: "?grupo=novo" abre o editor de
 * grupo). Muda a URL pelo History do navegador, que o Next sincroniza com
 * useSearchParams sem buscar a página de novo no servidor. Assim o botão
 * do cabeçalho da página abre o editor da lista, o link pode ser
 * compartilhado e o "voltar" do celular fecha o editor.
 */
export function useSearchParamState(
  name: string,
): [string | null, (value: string | null) => void] {
  const searchParams = useSearchParams();
  return [
    searchParams.get(name),
    (value) => setSearchParam(name, value),
  ];
}

export function setSearchParam(
  name: string,
  value: string | null,
) {
  const params = new URLSearchParams(
    window.location.search,
  );
  if (value === null) params.delete(name);
  else params.set(name, value);
  const query = params.toString();
  window.history.pushState(
    null,
    "",
    query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname,
  );
}
