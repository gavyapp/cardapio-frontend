"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { Label } from "@/components/atoms/label";
import { Switch } from "@/components/atoms/switch";
import { CurrencyInput } from "@/components/molecules/currency-input";
import { Field } from "@/components/molecules/field";
import { MinutesInput } from "@/components/molecules/minutes-input";
import { NumberStepper } from "@/components/molecules/number-stepper";
import { SectionCard } from "@/components/molecules/section-card";
import { SettingRow } from "@/components/molecules/setting-row";
import type { ActionResult } from "@/lib/panel/action-result";
import { useLiveOrdersContext } from "@/components/organisms/live-orders-provider";
import {
  playOrderChime,
  unlockAudio,
} from "@/lib/orders/alarm";
import {
  DEFAULT_ORDER_ALERTS,
  type OrderAlerts,
} from "@/lib/orders/board";

import { useSettingsForm } from "./settings-form-context";

// Seções das configurações da loja. Entrega e pagamento vão para o
// formulário da página; avisos salvam sozinhos a cada mudança.

export type DeliveryValues = {
  deliveryFee: string;
  deliveryTimeMinutes: number | null;
  pickupTimeMinutes: number | null;
};

/** Os campos pertencem ao formulário da página (atributo form), salvo pela barra. */
export function DeliverySection({
  id,
  values,
}: {
  id: string;
  values: DeliveryValues;
}) {
  const { formId } = useSettingsForm();

  return (
    <SectionCard
      id={id}
      title="Entrega e retirada"
      description="Valores e prazos que o cliente vê antes de pedir."
    >
      <div className="grid gap-5 px-6 py-6 md:grid-cols-3">
        <Field id="delivery-fee" label="Taxa de entrega">
          <CurrencyInput
            id="delivery-fee"
            name="deliveryFee"
            form={formId}
            defaultValue={values.deliveryFee}
          />
        </Field>
        <Field id="delivery-time" label="Tempo de entrega">
          <MinutesInput
            id="delivery-time"
            name="deliveryTimeMinutes"
            form={formId}
            defaultValue={values.deliveryTimeMinutes ?? ""}
          />
        </Field>
        <Field id="pickup-time" label="Tempo de retirada">
          <MinutesInput
            id="pickup-time"
            name="pickupTimeMinutes"
            form={formId}
            defaultValue={values.pickupTimeMinutes ?? ""}
          />
        </Field>
      </div>
    </SectionCard>
  );
}

export type PaymentMethodOption = {
  /** Valor do enum payment_method (PIX, DINHEIRO, CARTAO). */
  id: string;
  label: string;
  enabled: boolean;
};

/**
 * Os switches são controlados aqui e as formas ligadas vão para o
 * formulário da página como campos ocultos "paymentMethods".
 */
export function PaymentSection({
  id,
  methods,
}: {
  id: string;
  methods: readonly PaymentMethodOption[];
}) {
  const { formId } = useSettingsForm();
  const [enabled, setEnabled] = useState<Set<string>>(
    () =>
      new Set(
        methods.filter((m) => m.enabled).map((m) => m.id),
      ),
  );

  function toggle(methodId: string, on: boolean) {
    setEnabled((current) => {
      const next = new Set(current);
      if (on) next.add(methodId);
      else next.delete(methodId);
      return next;
    });
  }

  return (
    <SectionCard
      id={id}
      title="Pagamento"
      description="Formas aceitas na entrega ou na retirada."
    >
      <div className="max-w-[560px] divide-y px-6 py-2">
        {methods.map((method) => (
          <div
            key={method.id}
            className="flex items-center justify-between py-4"
          >
            <Label
              htmlFor={`payment-${method.id}`}
              className="text-body font-normal"
            >
              {method.label}
            </Label>
            <Switch
              id={`payment-${method.id}`}
              checked={enabled.has(method.id)}
              onCheckedChange={(on) =>
                toggle(method.id, on)
              }
            />
            {enabled.has(method.id) ? (
              <input
                type="hidden"
                name="paymentMethods"
                value={method.id}
                form={formId}
              />
            ) : null}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export type SaveOrderAlertsAction = (
  alerts: OrderAlerts,
) => Promise<ActionResult>;

/** Espera depois do último toque no − e + antes de salvar. */
const SAVE_DELAY_MS = 600;

/**
 * Avisos do quadro de pedidos. Diferente das outras seções, já grava de
 * verdade e salva sozinha a cada mudança; o painel aberto aplica na hora.
 */
export function AlertsSection({
  id,
  save,
}: {
  id: string;
  save: SaveOrderAlertsAction;
}) {
  const live = useLiveOrdersContext();
  const initial = live?.alerts ?? DEFAULT_ORDER_ALERTS;
  const [alerts, setAlerts] = useState(initial);
  const timer = useRef<number | undefined>(undefined);

  async function persist(next: OrderAlerts) {
    const result = await save(next);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    live?.setAlerts(next);
    toast.success("Avisos salvos");
  }

  function change(next: OrderAlerts, delay = 0) {
    setAlerts(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => void persist(next),
      delay,
    );
  }

  async function testSound() {
    if (await unlockAudio()) playOrderChime();
    else toast.error("O navegador não liberou o som.");
  }

  return (
    <SectionCard
      id={id}
      title="Pedidos e avisos"
      description="Como o painel chama sua atenção durante o expediente. Salva assim que você muda."
    >
      <div className="divide-y px-6">
        <SettingRow
          title="Pedido atrasado"
          description="Pedidos abertos há mais tempo que isso ficam em vermelho."
        >
          <NumberStepper
            label="Minutos até o pedido ficar atrasado"
            value={alerts.lateAfterMinutes}
            onChange={(lateAfterMinutes) =>
              change(
                { ...alerts, lateAfterMinutes },
                SAVE_DELAY_MS,
              )
            }
            step={5}
            min={5}
            max={180}
            unit="min"
          />
        </SettingRow>
        <SettingRow
          title="Aviso de pedido novo"
          description="Toca um som até o pedido ser aceito."
        >
          <Switch
            aria-label="Aviso de pedido novo"
            checked={alerts.sound}
            onCheckedChange={(sound) =>
              change({ ...alerts, sound })
            }
          />
          <Button
            variant="ghost"
            onClick={() => void testSound()}
          >
            Testar som
          </Button>
        </SettingRow>
      </div>
    </SectionCard>
  );
}
