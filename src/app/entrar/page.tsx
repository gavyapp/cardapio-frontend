import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/organisms/login-form";
import { PanelAccessTemplate } from "@/components/templates/panel-access-template";
import { findPanelUser } from "@/lib/data/panel-auth";
import { pathAfterLogin } from "@/lib/panel/access";

import { signIn } from "./actions";

export const metadata: Metadata = {
  title: "Entrar no painel",
};

export default function LoginPage({
  searchParams,
}: PageProps<"/entrar">) {
  return (
    <PanelAccessTemplate
      title="Entrar no painel"
      description="Use o e-mail e a senha da sua loja."
    >
      {/* A sessão e o "proximo" só existem na hora da requisição. */}
      <Suspense>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </PanelAccessTemplate>
  );
}

async function LoginContent({
  searchParams,
}: Pick<PageProps<"/entrar">, "searchParams">) {
  const redirectTo = pathAfterLogin(
    (await searchParams).proximo,
  );

  // Quem já está logado não precisa ver o formulário.
  if (await findPanelUser()) redirect(redirectTo);

  return (
    <LoginForm action={signIn} redirectTo={redirectTo} />
  );
}
