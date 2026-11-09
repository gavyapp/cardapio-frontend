"use client";

import {
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import { Input } from "@/components/atoms/input";
import { ImagePicker } from "@/components/molecules/image-picker";
import { SectionCard } from "@/components/molecules/section-card";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { SettingRow } from "@/components/molecules/setting-row";
import type { ActionResult } from "@/lib/panel/action-result";
import { normalizeHex } from "@/lib/store/color";
import {
  THEME_PALETTE,
  type StoreAppearance,
} from "@/lib/store/theme";
import { cn } from "@/lib/utils";

import { useSettingsForm } from "./settings-form-context";

export const APPEARANCE_SECTIONS = [
  { id: "logo-e-capa", label: "Logo e capa" },
  { id: "cores-e-tema", label: "Cores e tema" },
  { id: "estilo-do-cardapio", label: "Estilo do cardápio" },
  { id: "boas-vindas", label: "Mensagem de boas-vindas" },
] as const;

type Draft = {
  logoUrl: string | null;
  coverUrl: string | null;
  primary: string;
  mode: StoreAppearance["mode"];
  layout: StoreAppearance["layout"];
  welcome: string;
};

/**
 * As quatro seções de aparência num formulário só, salvo pela barra no fim
 * da página. Logo e capa sobem na hora; a URL só é gravada ao salvar.
 */
export function AppearanceSections({
  storeId,
  values,
  onSave,
}: {
  storeId: string;
  values: StoreAppearance;
  onSave: (formData: FormData) => Promise<ActionResult>;
}) {
  const { formId, setPending } = useSettingsForm();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>({
    logoUrl: values.logoUrl,
    coverUrl: values.coverUrl,
    primary: normalizeHex(values.primaryColor) ?? "#16191d",
    mode: values.mode,
    layout: values.layout,
    welcome: values.welcome ?? "",
  });

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    startTransition(async () => {
      try {
        const result = await onSave(formData);
        if (result.ok) toast.success("Aparência salva");
        else toast.error(result.error);
      } finally {
        setPending(false);
      }
    });
  }

  const [logo, colors, style, welcome] =
    APPEARANCE_SECTIONS;

  return (
    <form
      id={formId}
      onSubmit={submit}
      className="flex flex-col gap-4"
    >
      <input
        type="hidden"
        name="logoUrl"
        value={draft.logoUrl ?? ""}
      />
      <input
        type="hidden"
        name="coverUrl"
        value={draft.coverUrl ?? ""}
      />
      <input
        type="hidden"
        name="primary"
        value={draft.primary}
      />
      <input type="hidden" name="mode" value={draft.mode} />
      <input
        type="hidden"
        name="layout"
        value={draft.layout}
      />

      <SectionCard
        id={logo.id}
        title={logo.label}
        description="Aparecem no topo do cardápio."
      >
        <div className="divide-y px-6">
          <SettingRow
            title="Logo"
            description="Quadrada, mínimo 400 × 400."
          >
            <ImagePicker
              storeId={storeId}
              kind="logo"
              value={draft.logoUrl}
              onChange={(logoUrl) => update({ logoUrl })}
              label="Logo da loja"
              uploadLabel="Enviar logo"
            />
          </SettingRow>
          <SettingRow
            title="Capa"
            description="1200 × 500 ou maior."
          >
            <ImagePicker
              storeId={storeId}
              kind="cover"
              value={draft.coverUrl}
              onChange={(coverUrl) => update({ coverUrl })}
              label="Capa do cardápio"
              aspect="wide"
              uploadLabel="Enviar imagem"
            />
          </SettingRow>
        </div>
      </SectionCard>

      <SectionCard
        id={colors.id}
        title={colors.label}
        description="Se a cor for clara demais, os botões escurecem para o texto continuar legível."
      >
        <div className="divide-y px-6">
          <SettingRow title="Cor principal">
            <ColorPalette
              value={draft.primary}
              onChange={(primary) => update({ primary })}
            />
          </SettingRow>
          <SettingRow title="Tema">
            <SegmentedControl
              label="Tema do cardápio"
              variant="solid"
              fullWidth
              value={draft.mode}
              options={[
                ["light", "Claro"],
                ["dark", "Escuro"],
              ]}
              onChange={(mode) => update({ mode })}
            />
          </SettingRow>
        </div>
      </SectionCard>

      <SectionCard
        id={style.id}
        title={style.label}
        description="Como os produtos aparecem para o cliente."
      >
        <div className="px-6">
          <SettingRow title="Layout dos produtos">
            <SegmentedControl
              label="Layout dos produtos"
              variant="solid"
              fullWidth
              value={draft.layout}
              options={[
                ["lista", "Lista"],
                ["grade", "Grade"],
              ]}
              onChange={(layout) => update({ layout })}
            />
          </SettingRow>
        </div>
      </SectionCard>

      <SectionCard
        id={welcome.id}
        title={welcome.label}
        description="Opcional. Em branco, não aparece."
      >
        <div className="px-6 py-6">
          <Input
            name="welcome"
            aria-label="Mensagem de boas-vindas"
            maxLength={140}
            value={draft.welcome}
            onChange={(event) =>
              update({ welcome: event.target.value })
            }
            className="max-w-[960px]"
          />
        </div>
      </SectionCard>
    </form>
  );
}

/** Seis cores sugeridas mais "Outra cor" com o seletor do navegador. */
function ColorPalette({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const pickerId = useId();
  const normalized = value.toLowerCase();
  const isPreset = THEME_PALETTE.some(
    (hex) => hex.toLowerCase() === normalized,
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Cor principal"
        className="flex flex-wrap gap-3"
      >
        {THEME_PALETTE.map((hex) => {
          const selected = hex.toLowerCase() === normalized;
          return (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Cor ${hex}`}
              onClick={() => onChange(hex.toLowerCase())}
              className={cn(
                "size-11 rounded-lg border-2 border-transparent ring-offset-2 ring-offset-card outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                selected &&
                  "border-foreground ring-2 ring-card ring-inset",
              )}
              style={{ backgroundColor: hex }}
            />
          );
        })}
      </div>

      <label
        htmlFor={pickerId}
        className={cn(
          "flex h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 text-[15px]",
          !isPreset && "border-foreground",
        )}
      >
        <span
          aria-hidden
          className="size-6 rounded-md border"
          style={{ backgroundColor: value }}
        />
        <span className="font-medium">Outra cor</span>
        <span className="tabular text-muted-foreground uppercase">
          {value}
        </span>
        <input
          id={pickerId}
          type="color"
          value={value}
          onChange={(event) =>
            onChange(event.target.value.toLowerCase())
          }
          className="sr-only"
          aria-label="Escolher outra cor"
        />
      </label>
    </div>
  );
}
