"use client";

import { useSyncExternalStore } from "react";

/**
 * Se a media query vale agora, acompanhando mudanças (girar o celular,
 * redimensionar a janela). No servidor, devolve `serverValue`.
 */
export function useMediaQuery(
  query: string,
  serverValue = false,
): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () =>
        list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
