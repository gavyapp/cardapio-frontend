// Renova a sessão do painel a cada requisição, chamado pelo src/proxy.ts.
// O token de acesso do Supabase expira em 1 hora; sem isso o lojista seria
// deslogado e Server Components veriam uma sessão vencida.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";

import { publishableKey, supabaseUrl } from "./env";

export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl(), publishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Não coloque código entre criar o cliente e esta chamada: é ela que
  // valida o token e, se precisar, grava os cookies renovados.
  await supabase.auth.getClaims();

  return response;
}
