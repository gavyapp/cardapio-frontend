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

/**
 * Confirmação de ação destrutiva. onConfirm devolve a mensagem de erro (que
 * aparece no próprio diálogo) ou null para fechar.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  canConfirm = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<string | null>;
  /** false mostra só o aviso, sem o botão de confirmar. */
  canConfirm?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" />}
          >
            {canConfirm ? "Cancelar" : "Entendi"}
          </DialogClose>
          {canConfirm ? (
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const message = await onConfirm();
                  if (message) setError(message);
                  else onOpenChange(false);
                })
              }
            >
              {pending ? "Aguarde…" : confirmLabel}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
