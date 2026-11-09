import type { TimelineStep } from "@/lib/orders/detail";
import { cn } from "@/lib/utils";

/**
 * Linha do tempo do pedido, como no protótipo: um ponto por passo, ligado
 * ao próximo. Passos feitos em preto, o atual em negrito e na cor da etapa,
 * os que faltam em cinza com "—". Recusa e cancelamento aparecem em
 * vermelho, com o motivo.
 */
export function OrderTimeline({
  steps,
  currentDotClass,
}: {
  steps: TimelineStep[];
  /** Cor do ponto do passo atual (a mesma da faixa do pedido). */
  currentDotClass: string;
}) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const reached = step.state !== "next";
        return (
          <li
            key={step.label}
            className="grid grid-cols-[12px_minmax(0,1fr)_auto] gap-x-3"
            aria-current={
              step.state === "current" ? "step" : undefined
            }
          >
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "mt-1 size-3 shrink-0 rounded-full border-2",
                  step.stopped
                    ? "border-destructive bg-destructive"
                    : step.state === "current"
                      ? currentDotClass
                      : reached
                        ? "border-foreground bg-foreground"
                        : "border-border-strong bg-card",
                )}
              />
              <span
                aria-hidden
                className={cn(
                  "min-h-3 w-0.5 flex-1",
                  last
                    ? "bg-transparent"
                    : step.state === "done"
                      ? "bg-foreground"
                      : "bg-border",
                )}
              />
            </div>
            <div className="flex flex-col pb-3">
              <span
                className={cn(
                  "text-body leading-[1.4]",
                  step.state === "current" &&
                    "font-semibold",
                  !reached && "text-muted-foreground",
                  step.stopped && "text-destructive",
                )}
              >
                {step.label}
              </span>
              {step.note ? (
                <span className="text-meta text-muted-foreground">
                  Motivo: {step.note}
                </span>
              ) : null}
            </div>
            <span className="tabular text-meta leading-[1.6] text-muted-foreground">
              {step.time ?? "—"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
