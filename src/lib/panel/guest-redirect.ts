// Fora do cardápio público, quem não está logado vai para o login.
// Usado pela raiz, pelo 404 e pelo layout da loja quando o slug não existe:
// assim um visitante nunca vê uma página do produto sem sessão.
import "server-only";

import { redirect } from "next/navigation";

import { findPanelUser } from "@/lib/data/panel-auth";

import { LOGIN_ROUTE } from "./access";

/** Sem sessão, redireciona para o login e não volta. Com sessão, segue. */
export async function redirectGuestToLogin(): Promise<void> {
  const user = await findPanelUser();
  if (!user) redirect(LOGIN_ROUTE);
}
