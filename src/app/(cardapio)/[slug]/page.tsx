import { Suspense } from "react";

// Página provisória do cardápio público. A versão real entra com as rotas por loja.
type Params = Promise<{ slug: string }>;

async function NomeDaLoja({ params }: { params: Params }) {
  const { slug } = await params;
  return (
    <p className="text-muted-foreground">
      Cardápio da loja {slug}
    </p>
  );
}

export default function PaginaDoCardapio({
  params,
}: {
  params: Params;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Suspense
        fallback={
          <p className="text-muted-foreground">
            Carregando cardápio…
          </p>
        }
      >
        <NomeDaLoja params={params} />
      </Suspense>
    </main>
  );
}
