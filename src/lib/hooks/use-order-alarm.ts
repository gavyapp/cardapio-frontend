"use client";

import { useEffect, useState } from "react";

import {
  CHIME_INTERVAL_MS,
  isAudioUnlocked,
  playOrderChime,
  unlockAudio,
} from "@/lib/orders/alarm";

/**
 * Toca o alarme em loop enquanto `active`. Devolve `blocked` quando o alarme
 * deveria tocar mas o navegador ainda não liberou o som; o primeiro clique ou
 * tecla em qualquer lugar da página libera.
 */
export function useOrderAlarm(active: boolean): {
  blocked: boolean;
} {
  // No primeiro carregamento o som sempre começa bloqueado; numa nova
  // montagem dentro da mesma página ele pode já estar liberado.
  const [unlocked, setUnlocked] = useState(
    () =>
      typeof window !== "undefined" && isAudioUnlocked(),
  );

  useEffect(() => {
    if (unlocked) return;
    async function unlock() {
      if (await unlockAudio()) {
        setUnlocked(true);
        remove();
      }
    }
    function remove() {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return remove;
  }, [unlocked]);

  useEffect(() => {
    if (!active || !unlocked) return;
    playOrderChime();
    const timer = window.setInterval(
      playOrderChime,
      CHIME_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [active, unlocked]);

  return { blocked: active && !unlocked };
}
