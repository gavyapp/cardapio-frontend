// Variáveis do Supabase. As NEXT_PUBLIC_* precisam aparecer escritas por
// extenso para o Next embutir o valor no código do navegador.

function exigir(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não definida (veja .env.example).`);
  }
  return valor;
}

export function urlDoSupabase(): string {
  return exigir("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function chavePublica(): string {
  return exigir(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
