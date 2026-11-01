// Acesso às páginas do painel. Cada página (ou o layout do painel) chama
// exigirAcessoAoPainel no começo, passando o próprio caminho: sem sessão vai
// para o login e volta para essa página depois de entrar.
import "server-only";

import { redirect } from "next/navigation";

import {
  buscarLojaDoUsuario,
  buscarUsuarioDoPainel,
  type LojaDoPainel,
  type UsuarioDoPainel,
} from "@/lib/data/acesso-ao-painel";

export const rotaDoLogin = "/entrar";
export const rotaDoPainel = "/painel";

export type AcessoAoPainel =
  | { situacao: "com-loja"; usuario: UsuarioDoPainel; loja: LojaDoPainel }
  | { situacao: "sem-loja"; usuario: UsuarioDoPainel };

/** Endereço do login que, depois de entrar, volta para a página pedida. */
export function enderecoDoLogin(paginaPedida: string): string {
  return `${rotaDoLogin}?proximo=${encodeURIComponent(paginaPedida)}`;
}

/**
 * Para onde ir depois do login. Só aceita caminhos do próprio painel, para o
 * parâmetro "proximo" não virar um redirecionamento para outro site.
 */
export function destinoDepoisDoLogin(proximo: unknown): string {
  if (typeof proximo !== "string") return rotaDoPainel;
  const ehDoPainel = proximo === rotaDoPainel || proximo.startsWith(`${rotaDoPainel}/`);
  if (!ehDoPainel || proximo.includes("//") || proximo.includes("\\")) return rotaDoPainel;
  return proximo;
}

/** Usuário logado; sem sessão, redireciona para o login. */
export async function exigirUsuario(paginaPedida: string): Promise<UsuarioDoPainel> {
  const usuario = await buscarUsuarioDoPainel();
  if (!usuario) redirect(enderecoDoLogin(paginaPedida));
  return usuario;
}

/**
 * Usuário logado e a loja dele. Sem sessão, redireciona para o login. Sem
 * loja vinculada, devolve a situação "sem-loja" para a página mostrar o aviso.
 */
export async function exigirAcessoAoPainel(paginaPedida: string): Promise<AcessoAoPainel> {
  const usuario = await exigirUsuario(paginaPedida);
  const loja = await buscarLojaDoUsuario(usuario.id);
  if (!loja) return { situacao: "sem-loja", usuario };
  return { situacao: "com-loja", usuario, loja };
}
