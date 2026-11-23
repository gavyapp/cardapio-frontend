"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import type { StoreOpening } from "@/lib/data/store-opening";
import type { ActionResult } from "@/lib/panel/action-result";
import {
  activeOverride,
  isOpenBySchedule,
  type OpeningMode,
  type Shift,
} from "@/lib/store/opening";

// O status pelo horário muda com a hora; meio minuto basta para o selo virar
// perto da hora certa.
const TICK_MS = 30_000;

type StoreOpeningState = {
  /** Escolha que vale agora; prazo vencido volta a "schedule". */
  mode: OpeningMode;
  isOpen: boolean;
  /** Prazo da escolha manual em vigor. */
  until: Date | null;
  shifts: Shift[];
  now: Date;
  saving: boolean;
  /** Grava a escolha; devolve a mensagem de erro ou null. */
  choose: (mode: OpeningMode) => Promise<string | null>;
};

const StoreOpeningContext =
  createContext<StoreOpeningState | null>(null);

/** Botão de abrir e fechar a loja; null fora do provider. */
export function useStoreOpening(): StoreOpeningState | null {
  return useContext(StoreOpeningContext);
}

/**
 * Status da loja no painel (aberta ou fechada, pelo horário ou à mão),
 * compartilhado pelo selo do cabeçalho e pela barra de loja fechada.
 */
export function StoreOpeningProvider({
  opening,
  renderedAt,
  setOpening,
  children,
}: {
  opening: StoreOpening;
  /** Hora do servidor, para a primeira renderização bater com a dele. */
  renderedAt: number;
  setOpening: (mode: OpeningMode) => Promise<ActionResult>;
  children: ReactNode;
}) {
  const [now, setNow] = useState(
    () => new Date(renderedAt),
  );
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const until = opening.until
    ? new Date(opening.until)
    : null;
  const manual = activeOverride(
    opening.override,
    until,
    now,
  );

  function choose(
    mode: OpeningMode,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      startSaving(async () => {
        const result = await setOpening(mode);
        if (!result.ok) {
          resolve(result.error);
          return;
        }
        setNow(new Date());
        resolve(null);
      });
    });
  }

  return (
    <StoreOpeningContext
      value={{
        mode:
          manual === null
            ? "schedule"
            : manual
              ? "open"
              : "closed",
        isOpen:
          manual ?? isOpenBySchedule(opening.shifts, now),
        until: manual === null ? null : until,
        shifts: opening.shifts,
        now,
        saving,
        choose,
      }}
    >
      {children}
    </StoreOpeningContext>
  );
}
