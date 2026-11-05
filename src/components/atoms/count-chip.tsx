import { cn } from "@/lib/utils";

/**
 * Número em destaque ao lado de um rótulo (colunas do quadro, abas e menu
 * Pedidos). "hot" pinta de âmbar quando há algo esperando, como pedido novo.
 */
export function CountChip({
  count,
  hot = false,
  small = false,
  large = false,
  pulse = false,
  label,
}: {
  count: number;
  hot?: boolean;
  small?: boolean;
  /** Número grande, à direita do cabeçalho das colunas do quadro. */
  large?: boolean;
  /** Pisca de leve enquanto houver algo esperando (menu Pedidos). */
  pulse?: boolean;
  /** Texto lido depois do número por leitor de tela ("novos"). */
  label?: string;
}) {
  return (
    <span
      className={cn(
        "tabular inline-flex shrink-0 items-center justify-center rounded-[4px] font-semibold text-foreground",
        large
          ? "h-7 min-w-8 px-2 text-sm"
          : small
            ? "h-5 min-w-5 px-[5px] text-xs"
            : "h-5 min-w-6 px-1.5 text-xs",
        hot && count > 0 ? "bg-warning" : "bg-muted",
        pulse &&
          count > 0 &&
          "motion-safe:animate-soft-pulse",
      )}
    >
      {count}
      {label ? (
        <span className="sr-only"> {label}</span>
      ) : null}
    </span>
  );
}
