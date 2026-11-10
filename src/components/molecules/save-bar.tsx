"use client";

import { Button } from "@/components/atoms/button";
import { useSettingsForm } from "@/components/providers/settings-form-context";

/** Barra no fim da página que submete o formulário dela e mostra o carregamento. */
export function SaveBar({
  message,
  label = "Salvar alterações",
  pendingLabel = "Salvando…",
}: {
  message: string;
  label?: string;
  pendingLabel?: string;
}) {
  const { formId, pending } = useSettingsForm();

  return (
    <div className="rounded-surface border bg-card px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-body text-muted-foreground">
          {message}
        </p>
        <Button
          type="submit"
          form={formId}
          size="lg"
          loading={pending}
        >
          {pending ? pendingLabel : label}
        </Button>
      </div>
    </div>
  );
}
