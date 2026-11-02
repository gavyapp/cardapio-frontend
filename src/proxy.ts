import type { NextRequest } from "next/server";

import { rewritePathFor } from "@/lib/subdomain";
import { refreshSession } from "@/lib/supabase/session";

// Em toda requisição: traduz subdomínio em caminho (loja ou painel) e
// renova a sessão do painel. Os dois saem na mesma resposta.
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const path = rewritePathFor(
    host,
    request.nextUrl.pathname,
  );

  if (!path) return refreshSession(request);

  const url = request.nextUrl.clone();
  url.pathname = path;
  return refreshSession(request, url);
}

export const config = {
  // Tudo, menos arquivos estáticos e imagens.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
