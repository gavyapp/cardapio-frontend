import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buscarUsuarioDoPainel } from "@/lib/data/acesso-ao-painel";
import { destinoDepoisDoLogin } from "@/lib/painel/acesso";

import { FormularioDeLogin } from "./formulario-de-login";

export const metadata: Metadata = { title: "Entrar no painel" };

// Página provisória para testar o login. O visual final vem depois.
export default function PaginaDeLogin({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar no painel</CardTitle>
          <CardDescription>Use o e-mail e a senha da sua loja.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* A sessão e o "proximo" só existem na hora da requisição. */}
          <Suspense>
            <ConteudoDoLogin searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function ConteudoDoLogin({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  const destino = destinoDepoisDoLogin((await searchParams).proximo);

  // Quem já está logado não precisa ver o formulário.
  if (await buscarUsuarioDoPainel()) redirect(destino);

  return <FormularioDeLogin destino={destino} />;
}
