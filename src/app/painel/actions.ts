"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { afterMenuChange } from "@/lib/catalog/menu-cache";
import { signOutOfPanel } from "@/lib/data/panel-auth";
import {
  findStoreOpening,
  saveStoreOpening,
} from "@/lib/data/store-opening";
import {
  LOGIN_ROUTE,
  requireStoreForAction,
} from "@/lib/panel/access";
import {
  errorMessage,
  type ActionResult,
} from "@/lib/panel/action-result";
import { manualOpeningFor } from "@/lib/store/opening";

export async function signOut() {
  await signOutOfPanel();
  redirect(LOGIN_ROUTE);
}

const openingMode = z.enum(["schedule", "open", "closed"]);

/**
 * Botão do painel: seguir o horário, abrir agora ou fechar agora. O prazo de
 * abrir ou fechar é calculado aqui, com os turnos de agora.
 */
export async function setStoreOpeningAction(
  input: unknown,
): Promise<ActionResult> {
  const mode = openingMode.safeParse(input);
  if (!mode.success) {
    return {
      ok: false,
      error: "Escolha uma opção válida.",
    };
  }
  try {
    const store = await requireStoreForAction();
    const { shifts } = await findStoreOpening(store.id);
    await saveStoreOpening(
      store.id,
      manualOpeningFor(mode.data, shifts, new Date()),
    );
    // O cardápio mostra "Aberto" ou "Fechado" com a previsão do botão.
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
