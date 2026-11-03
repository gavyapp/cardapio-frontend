import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { LoginForm } from "@/components/organisms/login-form";
import { findPanelUser } from "@/lib/data/panel-auth";
import { pathAfterLogin } from "@/lib/panel-access";

import { signIn } from "./actions";

export const metadata: Metadata = {
  title: "Entrar no painel",
};

// Página provisória para testar o login. O visual final vem depois.
export default function LoginPage({
  searchParams,
}: PageProps<"/entrar">) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar no painel</CardTitle>
          <CardDescription>
            Use o e-mail e a senha da sua loja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* A sessão e o "proximo" só existem na hora da requisição. */}
          <Suspense>
            <LoginContent searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
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
