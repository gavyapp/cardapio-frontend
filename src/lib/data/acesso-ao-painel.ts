// Login do painel (Supabase Auth com e-mail e senha) e a loja do usuário.
// Tudo pelo cliente do servidor: a sessão fica nos cookies e as consultas
// passam pelo RLS como o próprio usuário.
import "server-only";

import { cache } from "react";

import type { Enums } from "@/lib/database.types";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type UsuarioDoPainel = {
  id: string;
  email: string;
};

export type LojaDoPainel = {
  id: string;
  nome: string;
  slug: string;
  papel: Enums<"store_role">;
};

export type ResultadoDoLogin = { ok: true } | { ok: false; erro: string };

const mensagensDeErro: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  over_request_rate_limit: "Muitas tentativas. Espere um pouco e tente de novo.",
};

/** Entra com e-mail e senha. A sessão é gravada nos cookies da resposta. */
export async function entrarNoPainel(email: string, senha: string): Promise<ResultadoDoLogin> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (!error) return { ok: true };
  return {
    ok: false,
    erro: mensagensDeErro[error.code ?? ""] ?? "Não foi possível entrar. Tente de novo.",
  };
}

/** Encerra a sessão e apaga os cookies. */
export async function sairDoPainel(): Promise<void> {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
}

/**
 * Usuário logado, ou null. Valida o token (não só lê o cookie), então serve
 * para decidir acesso. O cache evita repetir a checagem na mesma requisição.
 */
export const buscarUsuarioDoPainel = cache(async (): Promise<UsuarioDoPainel | null> => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  return { id: claims.sub, email: claims.email ?? "" };
});

/**
 * Loja do usuário pelo vínculo em store_users. No MVP cada usuário tem uma
 * loja; se tiver mais de uma, vale a mais antiga. Retorna null quando não há
 * vínculo ativo ou quando a loja está desativada ou excluída (o RLS de
 * stores só mostra loja ativa).
 */
export const buscarLojaDoUsuario = cache(async (usuarioId: string): Promise<LojaDoPainel | null> => {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("store_users")
    .select("role, created_at, stores!inner(id, name, slug)")
    .eq("user_id", usuarioId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Erro ao carregar a loja do usuário: ${error.message}`);
  if (!data) return null;

  return {
    id: data.stores.id,
    nome: data.stores.name,
    slug: data.stores.slug,
    papel: data.role,
  };
});
