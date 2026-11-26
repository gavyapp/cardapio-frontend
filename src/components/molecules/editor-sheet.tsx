"use client";

import type { ReactNode } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/atoms/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/atoms/sheet";
import { cn } from "@/lib/utils";

/**
 * Casca dos editores laterais do painel (produto, promoção): painel de
 * 640px à direita, largura toda no celular. O conteúdo é um formulário com
 * EditorSheetHeader, o corpo que rola e o rodapé.
 */
export function EditorSheet({
  open,
  onOpenChange,
  onOpenChangeComplete,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[640px]"
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

/** Título do editor, descrição para leitor de tela e o botão de fechar. */
export function EditorSheetHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-b py-2 pr-4 pl-6">
      <SheetTitle className="mr-auto min-w-0 truncate text-section-title font-semibold">
        {title}
      </SheetTitle>
      <SheetDescription className="sr-only">
        {description}
      </SheetDescription>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Fechar"
        onClick={onClose}
      >
        <X aria-hidden />
      </Button>
    </header>
  );
}

/** Corpo do editor, que rola entre o cabeçalho e o rodapé. */
export function EditorSheetBody({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-background p-4 sm:p-6 [&>*]:shrink-0">
      {children}
    </div>
  );
}

/**
 * Etapas do editor. Item novo passa por elas em ordem, como um passo a
 * passo numerado; item existente vai direto para qualquer etapa.
 */
export function EditorSteps({
  label,
  steps,
  step,
  isWizard,
  onStep,
}: {
  label: string;
  steps: readonly string[];
  step: number;
  isWizard: boolean;
  onStep: (step: number) => void;
}) {
  return (
    <nav
      aria-label={label}
      className="flex shrink-0 gap-2 overflow-x-auto rounded-surface border bg-card px-2"
    >
      {steps.map((stepLabel, index) => {
        const active = step === index;
        const done = isWizard && index < step;
        const reachable = !isWizard || index <= step;
        return (
          <button
            key={stepLabel}
            type="button"
            disabled={!reachable}
            aria-current={active ? "step" : undefined}
            onClick={() => onStep(index)}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 px-2 text-body whitespace-nowrap text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-foreground",
              active &&
                "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--color-foreground)]",
            )}
          >
            {isWizard ? (
              <span
                className={cn(
                  "tabular flex size-6 items-center justify-center rounded-full border-[1.5px] text-caption font-semibold",
                  active || done
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card",
                )}
              >
                {done ? (
                  <Check aria-hidden className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
            ) : null}
            {stepLabel}
          </button>
        );
      })}
    </nav>
  );
}
