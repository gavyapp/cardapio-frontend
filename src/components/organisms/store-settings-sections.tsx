"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Separator } from "@/components/atoms/separator";
import { Switch } from "@/components/atoms/switch";
import { CurrencyInput } from "@/components/molecules/currency-input";
import { Field } from "@/components/molecules/field";
import { NumberStepper } from "@/components/molecules/number-stepper";
import { SectionCard } from "@/components/molecules/section-card";
import { SettingRow } from "@/components/molecules/setting-row";
import { useLiveOrdersContext } from "@/components/organisms/live-orders-provider";
import {
  playOrderChime,
  unlockAudio,
} from "@/lib/orders/alarm";
import {
  DEFAULT_ORDER_ALERTS,
  type OrderAlerts,
} from "@/lib/orders/board";
import type { ActionResult } from "@/lib/panel/action-result";
import { cn } from "@/lib/utils";

// Seções das configurações da loja. Estáticas por enquanto (recebem os
// valores por props e ainda não gravam nada), menos a de avisos de pedidos.

export type StoreDataValues = {
  name: string;
  cnpj: string;
  address: string;
  menuHost: string;
};

export function StoreDataSection({
  id,
  values,
}: {
  id: string;
  values: StoreDataValues;
}) {
  return (
    <SectionCard
      id={id}
      title="Dados da loja"
      description="Aparecem no rodapé do cardápio."
    >
      <div className="flex flex-col gap-6 px-6 py-6">
        <div className="grid gap-5 md:grid-cols-3">
          <Field id="store-name" label="Nome">
            <Input
              id="store-name"
              defaultValue={values.name}
            />
          </Field>
          <Field id="store-cnpj" label="CNPJ">
            <Input
              id="store-cnpj"
              defaultValue={values.cnpj}
              className="tabular"
            />
          </Field>
          <Field id="store-address" label="Endereço">
            <Input
              id="store-address"
              defaultValue={values.address}
            />
          </Field>
        </div>

        <Separator />

        <div className="grid gap-2">
          <p className="text-sm font-medium">
            Link do cardápio
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[15px]">
              {values.menuHost}
            </span>
            <Button variant="outline">Copiar link</Button>
            <Button variant="outline">
              Baixar QR code
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export type DayHours = {
  day: string;
  hours: string | null;
};

export function HoursSection({
  id,
  days,
}: {
  id: string;
  days: readonly DayHours[];
}) {
  return (
    <SectionCard
      id={id}
      title="Horário de funcionamento"
      description='Fora do horário, o cardápio mostra "Fechado" e não recebe pedidos.'
      action={
        <Button variant="outline">Editar horários</Button>
      }
    >
      <dl className="max-w-[560px] divide-y px-6 py-2">
        {days.map(({ day, hours }) => (
          <div
            key={day}
            className="flex items-center justify-between py-4 text-[15px]"
          >
            <dt>{day}</dt>
            <dd
              className={cn(
                "tabular",
                !hours && "text-muted-foreground",
              )}
            >
              {hours ?? "Fechado"}
            </dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export type DeliveryValues = {
  deliveryFee: string;
  deliveryTime: string;
  pickupTime: string;
};

export function DeliverySection({
  id,
  values,
}: {
  id: string;
  values: DeliveryValues;
}) {
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
            defaultValue={values.deliveryFee}
          />
        </Field>
        <Field id="delivery-time" label="Tempo de entrega">
          <Input
            id="delivery-time"
            defaultValue={values.deliveryTime}
          />
        </Field>
        <Field id="pickup-time" label="Tempo de retirada">
          <Input
            id="pickup-time"
            defaultValue={values.pickupTime}
          />
        </Field>
      </div>
    </SectionCard>
  );
}

export type PaymentMethodOption = {
  id: string;
  label: string;
  enabled: boolean;
};

export function PaymentSection({
  id,
  methods,
}: {
  id: string;
  methods: readonly PaymentMethodOption[];
}) {
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
              className="text-[15px] font-normal"
            >
              {method.label}
            </Label>
            <Switch
              id={`payment-${method.id}`}
              defaultChecked={method.enabled}
            />
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
