// Cliente para componentes que rodam no navegador ("use client").
// Usa a chave pública: tudo o que ele faz passa pelo RLS.
import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";

import { publishableKey, supabaseUrl } from "./env";

export function createBrowserSupabase() {
  return createBrowserClient<Database>(supabaseUrl(), publishableKey());
}
