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

/**
 * replace troca a entrada atual do histórico em vez de criar outra (para a
 * busca, que muda a cada tecla).
 */
export function setSearchParam(
  name: string,
  value: string | null,
  options: { replace?: boolean } = {},
) {
  setSearchParams({ [name]: value }, options);
}

/** Muda vários parâmetros numa entrada só do histórico. */
export function setSearchParams(
  values: Record<string, string | null>,
  { replace = false }: { replace?: boolean } = {},
) {
  const params = new URLSearchParams(
    window.location.search,
  );
  for (const [name, value] of Object.entries(values)) {
    if (value === null) params.delete(name);
    else params.set(name, value);
  }
  const query = params.toString();
  const url = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}
