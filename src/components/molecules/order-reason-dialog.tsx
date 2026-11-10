"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Textarea } from "@/components/atoms/textarea";
import { formatCurrency } from "@/lib/format";
import {
  CANCELLATION_REASONS,
  OTHER_REASON,
  REJECTION_REASONS,
} from "@/lib/orders/status";
import { cn } from "@/lib/utils";

export type ClosingOrder = {
  number: number;
  customerName: string;
  total: number;
  kind: "reject" | "cancel";
};

/**
 * Recusar ou cancelar um pedido, como no protótipo: motivos padrão em
 * escolha única e, em "Outro", um texto obrigatório. onConfirm recebe o
 * motivo e devolve a mensagem de erro, ou null para fechar.
 */
export function OrderReasonDialog({
  order,
  onOpenChange,
  onConfirm,
}: {
  /** null fecha o diálogo. */
  order: ClosingOrder | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  // O conteúdo continua na tela enquanto o diálogo sai animado.
  const [shown, setShown] = useState(order);
  if (order && order !== shown) setShown(order);

  return (
    <Dialog
      open={order !== null}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        {shown ? (
          <ReasonForm
            key={`${shown.kind}-${shown.number}`}
            order={shown}
            onConfirm={async (reason) => {
              const error = await onConfirm(reason);
              if (!error) onOpenChange(false);
              return error;
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ReasonForm({
  order,
  onConfirm,
}: {
  order: ClosingOrder;
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  const reject = order.kind === "reject";
  const reasons = reject
    ? REJECTION_REASONS
    : CANCELLATION_REASONS;
  const [reason, setReason] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isOther = reason === OTHER_REASON;
  const verb = reject ? "recusar" : "cancelar";
  const action = reject
    ? "Recusar pedido"
    : "Cancelar pedido";

  function confirm() {
    if (!reason) {
      setError(`Escolha um motivo para ${verb}.`);
      return;
    }
    const finalReason = isOther ? text.trim() : reason;
    if (!finalReason) {
      setError("Escreva o motivo.");
      return;
    }
    startTransition(async () => {
      setError(await onConfirm(finalReason));
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {reject ? "Recusar" : "Cancelar"} pedido #
          {order.number}?
        </DialogTitle>
        <DialogDescription>
          Pedido de {order.customerName} ·{" "}
          {formatCurrency(order.total)}. O motivo fica
          registrado no pedido.
        </DialogDescription>
      </DialogHeader>
      <div
        role="radiogroup"
        aria-label="Motivo"
        className="flex flex-col gap-2"
      >
        <span className="text-caption font-medium text-muted-foreground">
          Motivo
        </span>
        {reasons.map((option) => {
          const active = option === reason;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setReason(option);
                setError(null);
              }}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-control border px-3 text-left text-body outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                active &&
                  "border-foreground bg-muted font-semibold",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-4.5 shrink-0 rounded-full border-[1.5px] border-gray-medium",
                  active &&
                    "border-[6px] border-foreground",
                )}
              />
              {option}
            </button>
          );
        })}
        {isOther ? (
          <Textarea
            autoFocus
            value={text}
            maxLength={200}
            rows={3}
            aria-label="Motivo"
            placeholder="Escreva o motivo"
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
          />
        ) : null}
        {error ? (
          <p
            role="alert"
            className="text-support text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>
          Voltar
        </DialogClose>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={confirm}
        >
          {pending ? "Aguarde…" : action}
        </Button>
      </DialogFooter>
    </>
  );
}
