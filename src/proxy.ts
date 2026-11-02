import type { NextRequest } from "next/server";

import { refreshSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  // Tudo, menos arquivos estáticos e imagens.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
