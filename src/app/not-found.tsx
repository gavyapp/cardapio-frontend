import Link from "next/link";

import { Button } from "@/components/atoms/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <p className="tabular text-big-number leading-none font-semibold">
        404
      </p>
      <div className="flex flex-col gap-1">
        <h1 className="text-page-title font-semibold">
          Página não encontrada
        </h1>
        <p className="text-body text-muted-foreground">
          O endereço pode estar errado ou a loja não está
          mais disponível.
        </p>
      </div>
      <Button render={<Link href="/" />}>
        Ir para o início
      </Button>
    </main>
  );
}
