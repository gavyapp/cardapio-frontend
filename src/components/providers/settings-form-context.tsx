"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

// Liga o formulário de uma seção à barra de salvar no rodapé da página:
// a barra submete o formulário pelo id e mostra o carregamento dele.

type SettingsFormContextValue = {
  formId: string;
  pending: boolean;
  setPending: (pending: boolean) => void;
};

const SettingsFormContext =
  createContext<SettingsFormContextValue | null>(null);

export function SettingsFormProvider({
  formId,
  children,
}: {
  formId: string;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <SettingsFormContext.Provider
      value={{ formId, pending, setPending }}
    >
      {children}
    </SettingsFormContext.Provider>
  );
}

export function useSettingsForm(): SettingsFormContextValue {
  const value = useContext(SettingsFormContext);
  if (!value) {
    throw new Error(
      "useSettingsForm precisa de um SettingsFormProvider.",
    );
  }
  return value;
}
