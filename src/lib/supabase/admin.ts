// Cliente com a chave secreta: ignora o RLS e enxerga todas as lojas.
// Só para tarefas do servidor que não têm um usuário por trás (ex.: envio de
// push). O "server-only" faz o build falhar se um componente do navegador
// importar este arquivo, e a variável sem NEXT_PUBLIC_ nunca é embutida no
// código do navegador.
import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

import { supabaseUrl } from "./env";

export function createAdminSupabase() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Variável de ambiente SUPABASE_SECRET_KEY não definida (veja .env.example).");
  }

  return createClient<Database>(supabaseUrl(), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
