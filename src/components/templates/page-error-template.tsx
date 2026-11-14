import { Button } from "@/components/atoms/button";

/**
 * Tela de erro de uma página: aparece no lugar do conteúdo quando algo
 * falha ao montar a tela, em vez de deixá-la em branco.
 */
export function PageErrorTemplate({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-title font-semibold">
          Algo deu errado
        </h1>
        <p className="text-body text-muted-foreground">
          Não foi possível mostrar esta página. Seu pedido
          não foi perdido.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={onRetry}>
          Tentar de novo
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => window.location.reload()}
        >
          Recarregar a página
        </Button>
      </div>
    </main>
  );
}
