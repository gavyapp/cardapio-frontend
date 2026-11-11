import { Clock } from "@/components/atoms/clock";

/**
 * Cupom "Seu pedido" ao lado do cardápio no computador. Por enquanto só o
 * estado vazio; os itens entram com o carrinho.
 */
export function OrderSummary({
  storeName,
}: {
  storeName: string;
}) {
  return (
    <section
      aria-label="Seu pedido"
      className="flex flex-col items-center gap-1 rounded-surface border bg-card px-5 py-6 text-center font-mono shadow-elevated"
    >
      <p className="text-caption tracking-[0.2em] text-muted-foreground uppercase">
        Seu pedido
      </p>
      <p className="font-sans text-section-title font-semibold">
        {storeName}
      </p>
      <Clock className="tabular text-caption text-muted-foreground" />

      <div
        aria-hidden
        className="my-4 w-full border-t border-dashed border-border-strong"
      />

      <p className="text-support">— nenhum item ainda —</p>
      <p className="font-sans text-support text-muted-foreground">
        Escolha algo no cardápio e ele aparece aqui.
      </p>
    </section>
  );
}
