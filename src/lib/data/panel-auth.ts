// Login do painel (Supabase Auth com e-mail e senha) e a loja do usuário.
// Tudo pelo cliente do servidor: a sessão fica nos cookies e as consultas
// passam pelo RLS como o próprio usuário.
import "server-only";

import { cache } from "react";

import type { Enums } from "@/lib/database.types";
import { createServerSupabase } from "@/lib/supabase/server";

export type PanelUser = {
  id: string;
  email: string;
};

export type PanelStore = {
  id: string;
  name: string;
  slug: string;
  role: Enums<"store_role">;
};

export type SignInResult =
  { ok: true } | { ok: false; error: string };

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed:
    "Confirme seu e-mail antes de entrar.",
  over_request_rate_limit:
    "Muitas tentativas. Espere um pouco e tente de novo.",
};

/** Entra com e-mail e senha. A sessão é gravada nos cookies da resposta. */
export async function signInToPanel(
  email: string,
  password: string,
): Promise<SignInResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error) return { ok: true };
  return {
    ok: false,
    error:
      ERROR_MESSAGES[error.code ?? ""] ??
      "Não foi possível entrar. Tente de novo.",
  };
}

/** Encerra a sessão e apaga os cookies. */
export async function signOutOfPanel(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
}

/**
 * Usuário logado, ou null. Valida o token (não só lê o cookie), então serve
 * para decidir acesso. O cache evita repetir a checagem na mesma requisição.
 */
export const findPanelUser = cache(
  async (): Promise<PanelUser | null> => {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return null;

    return { id: claims.sub, email: claims.email ?? "" };
  },
);

/**
 * Loja do usuário pelo vínculo em store_users. No MVP cada usuário tem uma
 * loja; se tiver mais de uma, vale a mais antiga. Retorna null quando não há
 * vínculo ativo ou quando a loja está desativada ou excluída (o RLS de
 * stores só mostra loja ativa).
 */
export const findUserStore = cache(
  async (userId: string): Promise<PanelStore | null> => {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("store_users")
      .select(
        "role, created_at, stores!inner(id, name, slug)",
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Erro ao carregar a loja do usuário: ${error.message}`,
      );
    }
    if (!data) return null;

    return {
      id: data.stores.id,
      name: data.stores.name,
      slug: data.stores.slug,
      role: data.role,
    };
  },
);
