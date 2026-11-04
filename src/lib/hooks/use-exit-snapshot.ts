"use client";

import { useState } from "react";

/**
 * Mantém o conteúdo de um painel na tela enquanto ele sai animado. Quem
 * abre o painel costuma limpar o item ao fechar (ex.: tira o "?produto="
 * da URL); sem isto o painel sairia vazio. Passe onOpenChangeComplete
 * para o Sheet e renderize o conteúdo só enquanto isMounted.
 */
export function useExitSnapshot<T>(
  open: boolean,
  value: T,
) {
  const [isMounted, setIsMounted] = useState(open);
  const [lastValue, setLastValue] = useState(value);
  if (open && !isMounted) setIsMounted(true);
  if (open && !Object.is(lastValue, value))
    setLastValue(value);

  return {
    isMounted,
    value: open ? value : lastValue,
    onOpenChangeComplete: (isOpen: boolean) => {
      if (!isOpen) setIsMounted(false);
    },
  };
}
