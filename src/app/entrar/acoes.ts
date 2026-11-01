"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { entrarNoPainel } from "@/lib/data/acesso-ao-painel";
import { destinoDepoisDoLogin } from "@/lib/painel/acesso";

export type EstadoDoLogin = { erro: string | null; email: string };

const dadosDoLogin = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
});

export async function entrar(_estado: EstadoDoLogin, formulario: FormData): Promise<EstadoDoLogin> {
  const email = String(formulario.get("email") ?? "").trim();
  const dados = dadosDoLogin.safeParse({ email, senha: formulario.get("senha") ?? "" });
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Dados inválidos.", email };
  }

  const resultado = await entrarNoPainel(dados.data.email, dados.data.senha);
  if (!resultado.ok) return { erro: resultado.erro, email };

  // O destino vem do formulário, então passa de novo pela validação.
  redirect(destinoDepoisDoLogin(formulario.get("proximo")));
}
