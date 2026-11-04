// Cliente para Server Components, Server Actions e Route Handlers.
// Lê a sessão do usuário dos cookies, então também passa pelo RLS.
// Crie um por requisição; nunca compartilhe entre requisições.
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import type { Database } from "@/lib/database.types";

import { publishableKey, supabaseUrl } from "./env";

export async function createServerSupabase() {
  // A sessão é de cada requisição e o Auth confere a validade do token com
  // Date.now(). Sem isto, a pré-renderização (prefetch com cookies) para em
  // "Next.js encountered the unstable value Date.now()".
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), publishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component não grava cookie. O proxy (src/proxy.ts) já
          // renova a sessão antes da página renderizar.
        }
      },
    },
  });
}
