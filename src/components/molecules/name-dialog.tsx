"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { Input } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";

/**
 * Diálogo de um campo só (criar ou renomear). onSubmit devolve a mensagem de
 * erro, ou null para fechar.
 */
export function NameDialog({
  open,
  onOpenChange,
  title,
  label,
  placeholder,
  initialValue = "",
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel: string;
  onSubmit: (value: string) => Promise<string | null>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Monta de novo a cada abertura, com o valor inicial atualizado. */}
        {open ? (
          <NameForm
            title={title}
            label={label}
            placeholder={placeholder}
            initialValue={initialValue}
            submitLabel={submitLabel}
            onSubmit={onSubmit}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  title,
  label,
  placeholder,
  initialValue,
  submitLabel,
  onSubmit,
  onDone,
}: {
  title: string;
  label: string;
  placeholder?: string;
  initialValue: string;
  submitLabel: string;
  onSubmit: (value: string) => Promise<string | null>;
  onDone: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const message = await onSubmit(value);
          if (message) setError(message);
          else onDone();
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Field id="name-dialog-input" label={label}>
        <Input
          id="name-dialog-input"
          value={value}
          placeholder={placeholder}
          autoFocus
          maxLength={60}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
        />
      </Field>
      {error ? (
        <p
          role="alert"
          className="text-support text-destructive"
        >
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>
          Cancelar
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
