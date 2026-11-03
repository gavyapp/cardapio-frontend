// Cliente para Server Components, Server Actions e Route Handlers.
// Lê a sessão do usuário dos cookies, então também passa pelo RLS.
// Crie um por requisição; nunca compartilhe entre requisições.
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";

import { publishableKey, supabaseUrl } from "./env";

export async function createServerSupabase() {
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
