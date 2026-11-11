import { Clock } from "@/components/atoms/clock";
import { CartContents } from "@/components/organisms/cart-contents";

/**
 * Cupom "Seu pedido" ao lado do cardápio no computador, com o carrinho.
 */
export function OrderSummary({
  storeName,
}: {
  storeName: string;
}) {
  return (
    <section
      aria-label="Seu pedido"
      className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-y-auto rounded-surface border bg-card px-5 py-6 shadow-elevated"
    >
      <header className="flex flex-col items-center gap-1 text-center font-mono">
        <p className="text-caption tracking-[0.2em] text-muted-foreground uppercase">
          Seu pedido
        </p>
        <p className="font-sans text-section-title font-semibold">
          {storeName}
        </p>
        <Clock className="tabular text-caption text-muted-foreground" />
      </header>

      <div
        aria-hidden
        className="w-full border-t border-dashed border-border-strong"
      />

      <CartContents />
    </section>
  );
}
