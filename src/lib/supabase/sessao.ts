// Renova a sessão do painel a cada requisição, chamado pelo src/proxy.ts.
// O token de acesso do Supabase expira em 1 hora; sem isso o lojista seria
// deslogado e Server Components veriam uma sessão vencida.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";

import { chavePublica, urlDoSupabase } from "./env";

export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient<Database>(urlDoSupabase(), chavePublica(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar, headers) {
        for (const { name, value } of cookiesParaGravar) {
          request.cookies.set(name, value);
        }
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of cookiesParaGravar) {
          resposta.cookies.set(name, value, options);
        }
        for (const [chave, valor] of Object.entries(headers)) {
          resposta.headers.set(chave, valor);
        }
      },
    },
  });

  // Não coloque código entre criar o cliente e esta chamada: é ela que
  // valida o token e, se precisar, grava os cookies renovados.
  await supabase.auth.getClaims();

  return resposta;
}
