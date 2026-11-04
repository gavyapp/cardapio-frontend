"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/panel/action-result";

/**
 * Lista que muda na tela antes da resposta do servidor e volta ao estado
 * anterior se ele recusar, com o erro num toast. Quando a página manda
 * dados novos (depois de salvar), eles substituem o estado local.
 */
export function useOptimisticList<T>(serverItems: T[]) {
  const [items, setItems] = useState(serverItems);
  const [source, setSource] = useState(serverItems);
  const [, startTransition] = useTransition();

  if (source !== serverItems) {
    setSource(serverItems);
    setItems(serverItems);
  }

  function optimistic(
    next: T[],
    save: () => Promise<ActionResult>,
    successMessage?: string,
  ) {
    const previous = items;
    setItems(next);
    startTransition(async () => {
      // Falha de rede chega como exceção, não como resposta.
      const result = await save().catch(
        (): ActionResult => ({
          ok: false,
          error: "Sem conexão. A mudança não foi salva.",
        }),
      );
      if (!result.ok) {
        setItems(previous);
        toast.error(result.error);
      } else if (successMessage) {
        toast.success(successMessage);
      }
    });
  }

  return { items, optimistic };
}
