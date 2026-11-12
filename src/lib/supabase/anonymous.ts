// Cliente anônimo, sem cookies nem sessão: enxerga só o que o RLS libera
// para o visitante. É o único que serve dentro de "use cache", onde os
// cookies da requisição não existem. Para tudo que depende de quem está
// logado, use server.ts.
import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

import { publishableKey, supabaseUrl } from "./env";

export function createAnonymousSupabase() {
  return createClient<Database>(supabaseUrl(), publishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
