// Cliente com a chave secreta: ignora o RLS e enxerga todas as lojas.
// Só para tarefas do servidor que não têm um usuário por trás (ex.: envio de
// push). O "server-only" faz o build falhar se um componente do navegador
// importar este arquivo, e a variável sem NEXT_PUBLIC_ nunca é embutida no
// código do navegador.
import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

import { urlDoSupabase } from "./env";

export function criarClienteAdministrador() {
  const chaveSecreta = process.env.SUPABASE_SECRET_KEY;
  if (!chaveSecreta) {
    throw new Error("Variável de ambiente SUPABASE_SECRET_KEY não definida (veja .env.example).");
  }

  return createClient<Database>(urlDoSupabase(), chaveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
