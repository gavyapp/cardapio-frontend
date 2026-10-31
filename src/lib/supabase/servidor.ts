// Cliente para Server Components, Server Actions e Route Handlers.
// Lê a sessão do usuário dos cookies, então também passa pelo RLS.
// Crie um por requisição; nunca compartilhe entre requisições.
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";

import { chavePublica, urlDoSupabase } from "./env";

export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient<Database>(urlDoSupabase(), chavePublica(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) {
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
