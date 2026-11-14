"use client";

import { useEffect } from "react";

import { PageErrorTemplate } from "@/components/templates/page-error-template";

// Falha ao montar uma página da loja (cardápio, checkout, pedido): mostra a
// tela de erro no lugar do conteúdo.
export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na página da loja:", error);
  }, [error]);

  return <PageErrorTemplate onRetry={reset} />;
}
