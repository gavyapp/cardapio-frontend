// Acesso ao painel. O layout do painel chama requirePanelAccess no começo:
// sem sessão vai para o login e volta para o painel depois de entrar.
import "server-only";

import { redirect } from "next/navigation";

import {
  findPanelUser,
  findUserStore,
  type PanelStore,
  type PanelUser,
} from "@/lib/data/panel-auth";

export const LOGIN_ROUTE = "/entrar";
export const PANEL_ROUTE = "/painel";

export type PanelAccess =
  | {
      status: "with-store";
      user: PanelUser;
      store: PanelStore;
    }
  | { status: "no-store"; user: PanelUser };

/** Endereço do login que, depois de entrar, volta para a página pedida. */
export function loginUrlFor(requestedPath: string): string {
  return `${LOGIN_ROUTE}?proximo=${encodeURIComponent(requestedPath)}`;
}

/**
 * Para onde ir depois do login. Só aceita caminhos do próprio painel, para o
 * parâmetro "proximo" não virar um redirecionamento para outro site.
 */
export function pathAfterLogin(next: unknown): string {
  if (typeof next !== "string") return PANEL_ROUTE;
  const isPanelPath =
    next === PANEL_ROUTE ||
    next.startsWith(`${PANEL_ROUTE}/`);
  if (
    !isPanelPath ||
    next.includes("//") ||
    next.includes("\\")
  ) {
    return PANEL_ROUTE;
  }
  return next;
}

/** Usuário logado; sem sessão, redireciona para o login. */
export async function requireUser(
  requestedPath: string,
): Promise<PanelUser> {
  const user = await findPanelUser();
  if (!user) redirect(loginUrlFor(requestedPath));
  return user;
}

/**
 * Usuário logado e a loja dele. Sem sessão, redireciona para o login. Sem
 * loja vinculada, devolve o status "no-store" para o painel mostrar o aviso.
 */
export async function requirePanelAccess(
  requestedPath: string,
): Promise<PanelAccess> {
  const user = await requireUser(requestedPath);
  const store = await findUserStore(user.id);
  if (!store) return { status: "no-store", user };
  return { status: "with-store", user, store };
}
