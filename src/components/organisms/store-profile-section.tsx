"use client";

import { useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Separator } from "@/components/atoms/separator";
import { Field } from "@/components/molecules/field";
import { PhoneInput } from "@/components/molecules/phone-input";
import { SectionCard } from "@/components/molecules/section-card";
import type { ActionResult } from "@/lib/panel/action-result";

import { useSettingsForm } from "./settings-form-context";

export type StoreProfileValues = {
  name: string;
  phone: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  menuHost: string;
};

/**
 * Dados da loja: nome, telefone e endereço, nas colunas de `stores`.
 * O formulário é submetido pela barra de salvar da página.
 */
export function StoreProfileSection({
  id,
  values,
  onSave,
}: {
  id: string;
  values: StoreProfileValues;
  onSave: (formData: FormData) => Promise<ActionResult>;
}) {
  const { formId, setPending } = useSettingsForm();
  const [, startTransition] = useTransition();

  // onSubmit, e não action: dentro de uma form action o React segura o
  // setPending(true) na mesma transição da gravação, e o loading não aparece.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    startTransition(async () => {
      try {
        const result = await onSave(formData);
        if (result.ok)
          toast.success("Configurações salvas");
        else toast.error(result.error);
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <SectionCard
      id={id}
      title="Dados da loja"
      description="Aparecem no rodapé do cardápio."
    >
      <form
        id={formId}
        onSubmit={submit}
        className="flex flex-col gap-6 px-6 py-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="store-name" label="Nome">
            <Input
              id="store-name"
              name="name"
              required
              maxLength={80}
              defaultValue={values.name}
            />
          </Field>
          <Field id="store-phone" label="Telefone">
            <PhoneInput
              id="store-phone"
              name="phone"
              defaultValue={values.phone}
            />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_140px]">
          <Field id="store-street" label="Rua">
            <Input
              id="store-street"
              name="street"
              maxLength={120}
              defaultValue={values.street}
            />
          </Field>
          <Field id="store-number" label="Número">
            <Input
              id="store-number"
              name="number"
              maxLength={20}
              defaultValue={values.number}
            />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_1fr_120px]">
          <Field id="store-district" label="Bairro">
            <Input
              id="store-district"
              name="district"
              maxLength={80}
              defaultValue={values.district}
            />
          </Field>
          <Field id="store-city" label="Cidade">
            <Input
              id="store-city"
              name="city"
              maxLength={80}
              defaultValue={values.city}
            />
          </Field>
          <Field id="store-state" label="Estado">
            <Input
              id="store-state"
              name="state"
              maxLength={2}
              placeholder="SC"
              defaultValue={values.state}
              className="uppercase"
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
            <Button type="button" variant="outline">
              Copiar link
            </Button>
            <Button type="button" variant="outline">
              Baixar QR code
            </Button>
          </div>
        </div>
      </form>
    </SectionCard>
  );
}
