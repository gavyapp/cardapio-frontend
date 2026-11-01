import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirAcessoAoPainel, rotaDoPainel } from "@/lib/painel/acesso";

import { BotaoSair } from "./botao-sair";

export const metadata: Metadata = { title: "Painel" };

// Página provisória para testar o acesso. O layout, a navegação e o visual do
// painel ainda vão ser feitos.
export default function PaginaDoPainel() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      {/* Sessão e loja vêm dos cookies, então só existem na hora da requisição. */}
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
        <ConteudoDoPainel />
      </Suspense>
    </main>
  );
}

async function ConteudoDoPainel() {
  const acesso = await exigirAcessoAoPainel(rotaDoPainel);

  if (acesso.situacao === "sem-loja") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma loja vinculada</CardTitle>
          <CardDescription>
            A conta {acesso.usuario.email} ainda não tem acesso a nenhuma loja. Fale com a equipe
            do cardápio para liberar o acesso.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <BotaoSair />
        </CardFooter>
      </Card>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{acesso.loja.nome}</h1>
          <p className="text-sm text-muted-foreground">{acesso.usuario.email}</p>
        </div>
        <BotaoSair />
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Painel da loja</CardTitle>
          <CardDescription>Pedidos, cardápio e configurações vão aparecer aqui.</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
