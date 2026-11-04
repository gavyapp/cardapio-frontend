import type { TimelineStep } from "@/lib/orders/detail";
import { cn } from "@/lib/utils";

/**
 * Linha do tempo do pedido: um ponto por passo, ligado ao próximo. Passos
 * feitos em cor cheia, o atual em negrito, os que faltam em cinza com "—".
 * Recusa e cancelamento aparecem em vermelho, com o motivo.
 */
export function OrderTimeline({
  steps,
}: {
  steps: TimelineStep[];
}) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const reached = step.state !== "next";
        return (
          <li
            key={step.label}
            className="flex gap-3"
            aria-current={
              step.state === "current" ? "step" : undefined
            }
          >
            <div className="flex w-3 flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "mt-1 size-3 shrink-0 rounded-full border-2",
                  step.stopped
                    ? "border-destructive bg-destructive"
                    : reached
                      ? "border-foreground bg-foreground"
                      : "border-[#c9ced4] bg-card",
                )}
              />
              {!last ? (
                <span
                  aria-hidden
                  className={cn(
                    "w-0.5 flex-1",
                    step.state === "done"
                      ? "bg-foreground"
                      : "bg-border",
                  )}
                />
              ) : null}
            </div>
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col pb-3 text-sm",
                last && "pb-0",
              )}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "flex-1",
                    step.state === "current" &&
                      "font-semibold",
                    !reached && "text-muted-foreground",
                    step.stopped && "text-destructive",
                  )}
                >
                  {step.label}
                </span>
                <span className="tabular text-[13px] text-muted-foreground">
                  {step.time ?? "—"}
                </span>
              </div>
              {step.note ? (
                <span className="text-[13px] text-muted-foreground">
                  Motivo: {step.note}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
