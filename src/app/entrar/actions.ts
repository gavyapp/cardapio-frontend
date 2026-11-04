"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { LoginState } from "@/components/organisms/login-form";
import { signInToPanel } from "@/lib/data/panel-auth";
import { pathAfterLogin } from "@/lib/panel/access";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

export async function signIn(
  _state: LoginState,
  form: FormData,
): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const parsed = loginSchema.safeParse({
    email,
    password: form.get("senha") ?? "",
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Dados inválidos.",
      email,
    };
  }

  const result = await signInToPanel(
    parsed.data.email,
    parsed.data.password,
  );
  if (!result.ok) return { error: result.error, email };

  // O destino vem do formulário, então passa de novo pela validação.
  redirect(pathAfterLogin(form.get("proximo")));
}
