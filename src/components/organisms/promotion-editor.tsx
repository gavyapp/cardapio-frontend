"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import {
  EditorSheet,
  EditorSheetBody,
  EditorSheetHeader,
  EditorSteps,
} from "@/components/molecules/editor-sheet";
import { PromotionKindStep } from "@/components/organisms/promotion-kind-step";
import {
  PromotionRuleStep,
  type PromotionProductOption,
} from "@/components/organisms/promotion-rule-step";
import { PromotionScheduleStep } from "@/components/organisms/promotion-schedule-step";
import { useExitSnapshot } from "@/lib/hooks/use-exit-snapshot";
import type { ActionResultWith } from "@/lib/panel/action-result";
import {
  initialForm,
  scheduleOf,
  stepError,
  toDraft,
  type EditablePromotion,
  type PromotionDraft,
  type PromotionForm,
} from "@/lib/promotions/draft";
import {
  heldProducts,
  promotionStatus,
  type PromotionStatus,
} from "@/lib/promotions/status";

export type { PromotionProductOption };

const STEPS = ["Tipo", "Regra", "Quando vale"] as const;
type Step = 0 | 1 | 2;

const SAVED_STATUS: Record<PromotionStatus, string> = {
  active: "ativa agora",
  scheduled: "agendada",
  paused: "pausada",
  ended: "encerrada",
};

type EditorFormProps = {
  promotion: EditablePromotion | null;
  /** Todas as promoções da loja, para saber que produtos já estão em uso. */
  promotions: readonly EditablePromotion[];
  products: readonly PromotionProductOption[];
  now: Date;
  onSave: (
    draft: PromotionDraft,
  ) => Promise<ActionResultWith<string>>;
  onDuplicate: (promotion: EditablePromotion) => void;
  onDelete: (promotion: EditablePromotion) => void;
  onClose: () => void;
};

/**
 * Painel lateral para criar ou editar promoção, em três etapas: Tipo, Regra
 * e Quando vale. Promoção nova passa por elas em ordem; promoção existente
 * abre na Regra e vai direto para qualquer etapa.
 */
export function PromotionEditor({
  open,
  onOpenChange,
  promotion,
  ...formProps
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null cria uma promoção nova. */
  promotion: EditablePromotion | null;
} & Omit<EditorFormProps, "promotion" | "onClose">) {
  const shown = useExitSnapshot(
    open,
    useMemo(() => ({ promotion }), [promotion]),
  );

  return (
    <EditorSheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={shown.onOpenChangeComplete}
    >
      {shown.isMounted ? (
        <EditorForm
          key={shown.value.promotion?.id ?? "new"}
          promotion={shown.value.promotion}
          onClose={() => onOpenChange(false)}
          {...formProps}
        />
      ) : null}
    </EditorSheet>
  );
}

function EditorForm({
  promotion,
  promotions,
  products,
  now,
  onSave,
  onDuplicate,
  onDelete,
  onClose,
}: EditorFormProps) {
  const isWizard = promotion === null;
  const [step, setStep] = useState<Step>(isWizard ? 0 : 1);
  const [form, setForm] = useState(() =>
    initialForm(promotion, products),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const held = useMemo(
    () => heldProducts(promotions, now, promotion?.id),
    [promotions, now, promotion?.id],
  );

  function update(changes: Partial<PromotionForm>) {
    setForm((current) => ({ ...current, ...changes }));
    setError(null);
  }

  /** Confere os passos até `upTo` e para no primeiro com erro. */
  function validate(upTo: Step): boolean {
    for (const index of [0, 1, 2] as const) {
      if (index > upTo) break;
      const message = stepError(
        form,
        index,
        products,
        held,
      );
      if (message) {
        setStep(index);
        setError(message);
        return false;
      }
    }
    return true;
  }

  function submit() {
    if (!validate(2)) return;
    const built = toDraft(form, promotion?.id, products);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    startTransition(async () => {
      const result = await onSave(built.draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const status = promotionStatus(
        {
          isActive: form.isActive,
          schedule: scheduleOf(form),
        },
        new Date(),
      );
      toast.success(
        `${isWizard ? "Promoção criada" : "Promoção salva"} · ${SAVED_STATUS[status]}`,
      );
      onClose();
    });
  }

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (isWizard && step < 2) {
          if (validate(step)) {
            setStep((step + 1) as Step);
            setError(null);
          }
        } else {
          submit();
        }
      }}
    >
      <EditorSheetHeader
        title={
          promotion
            ? `Editar promoção · ${promotion.name}`
            : "Nova promoção"
        }
        description="Tipo, regra e período da promoção."
        onClose={onClose}
      />

      <EditorSheetBody>
        <EditorSteps
          label="Etapas da promoção"
          steps={STEPS}
          step={step}
          isWizard={isWizard}
          onStep={(index) => {
            setStep(index as Step);
            setError(null);
          }}
        />

        {step === 0 ? (
          <PromotionKindStep
            value={form.kind}
            onChange={(kind) => {
              update({ kind });
              // No passo a passo, escolher o tipo já leva para a regra.
              if (isWizard) setStep(1);
            }}
          />
        ) : null}

        {step === 1 && form.kind ? (
          <PromotionRuleStep
            form={form}
            products={products}
            held={held}
            onChange={update}
          />
        ) : null}

        {step === 2 ? (
          <PromotionScheduleStep
            form={form}
            now={now}
            onChange={update}
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
      </EditorSheetBody>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-4 sm:px-6">
        {promotion ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(promotion)}
            >
              Excluir
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDuplicate(promotion)}
            >
              Duplicar
            </Button>
          </div>
        ) : null}
        {/* Cancelar e Salvar ficam sempre juntos, à direita. */}
        <div className="ml-auto flex gap-2">
          {isWizard && step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep((step - 1) as Step);
                setError(null);
              }}
            >
              Voltar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending
              ? "Salvando…"
              : !isWizard
                ? "Salvar"
                : step < 2
                  ? "Continuar"
                  : "Criar promoção"}
          </Button>
        </div>
      </footer>
    </form>
  );
}
