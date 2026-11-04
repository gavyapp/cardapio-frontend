"use client";

import { Check, Plus } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { Textarea } from "@/components/atoms/textarea";
import { CurrencyInput } from "@/components/molecules/currency-input";
import { EditorCard } from "@/components/molecules/editor-card";
import { Field } from "@/components/molecules/field";
import { FieldError } from "@/components/molecules/field-error";
import { ImagePicker } from "@/components/molecules/image-picker";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import {
  PRODUCT_BADGES,
  PRODUCT_DESCRIPTION_LIMIT,
} from "@/lib/product-fields";

export type ProductDetailsValues = {
  name: string;
  description: string;
  /** Texto do campo de valor ("29,90"). */
  price: string;
  hasPhoto: boolean;
  imageUrl: string | null;
  badges: string[];
  isSuggested: boolean;
};

/** Aba Produto do editor: informações, foto, selos e sugestão no carrinho. */
export function ProductDetailsTab({
  storeId,
  values,
  isAvailable,
  errors,
  onChange,
}: {
  storeId: string;
  values: ProductDetailsValues;
  /** Produto esgotado não pode ser sugerido no carrinho. */
  isAvailable: boolean;
  errors: { name?: string; price?: string };
  onChange: (
    changes: Partial<ProductDetailsValues>,
  ) => void;
}) {
  function toggleBadge(badge: string) {
    onChange({
      badges: values.badges.includes(badge)
        ? values.badges.filter((item) => item !== badge)
        : [...values.badges, badge],
    });
  }

  return (
    <>
      <EditorCard title="Informações do produto">
        <div className="flex flex-col gap-6 p-4 sm:p-6">
          <Field id="product-name" label="Nome">
            <Input
              id="product-name"
              value={values.name}
              placeholder="Ex.: The Classic"
              maxLength={80}
              aria-invalid={!!errors.name}
              onChange={(event) =>
                onChange({ name: event.target.value })
              }
            />
            <FieldError message={errors.name} />
          </Field>
          <Field id="product-description" label="Descrição">
            <Textarea
              id="product-description"
              value={values.description}
              placeholder="Ingredientes ou detalhes do produto"
              maxLength={PRODUCT_DESCRIPTION_LIMIT}
              onChange={(event) =>
                onChange({
                  description: event.target.value,
                })
              }
            />
            <span className="flex justify-between gap-4 text-[13px] text-muted-foreground">
              <span>
                Aparece em até 3 linhas no cardápio.
              </span>
              <span className="tabular">
                {values.description.length}/
                {PRODUCT_DESCRIPTION_LIMIT}
              </span>
            </span>
          </Field>
          <div className="max-w-[200px]">
            <Field id="product-price" label="Preço">
              <CurrencyInput
                id="product-price"
                value={values.price}
                placeholder="0,00"
                aria-invalid={!!errors.price}
                onChange={(event) =>
                  onChange({ price: event.target.value })
                }
              />
              <FieldError message={errors.price} />
            </Field>
          </div>
        </div>
      </EditorCard>

      <EditorCard
        title="Foto e selos"
        description="Selos aparecem como etiquetas no card do produto."
      >
        <div className="flex flex-col gap-6 p-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium">
              Foto{" "}
              <span className="font-normal text-muted-foreground">
                · opcional
              </span>
            </span>
            <SegmentedControl
              label="Foto do produto"
              value={values.hasPhoto}
              options={[
                [true, "Com foto"],
                [false, "Sem foto"],
              ]}
              onChange={(hasPhoto) =>
                onChange({ hasPhoto })
              }
            />
            {values.hasPhoto ? (
              <div className="pt-2">
                <ImagePicker
                  storeId={storeId}
                  kind="product"
                  value={values.imageUrl}
                  onChange={(imageUrl) =>
                    onChange({ imageUrl })
                  }
                  label="Foto do produto"
                />
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                O card do produto aparece sem imagem.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium">
              Selos
            </span>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_BADGES.map((badge) => {
                const active =
                  values.badges.includes(badge);
                return (
                  <Button
                    key={badge}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    aria-pressed={active}
                    onClick={() => toggleBadge(badge)}
                  >
                    {active ? (
                      <Check aria-hidden />
                    ) : (
                      <Plus aria-hidden />
                    )}
                    {badge}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </EditorCard>

      <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor="product-suggested"
            className="text-[15px] font-semibold"
          >
            Sugerir no carrinho
          </label>
          <span className="text-[13px] text-muted-foreground">
            {isAvailable
              ? "Aparece como sugestão quando o cliente revisa o pedido. Bom para bebidas e sobremesas."
              : "Produto esgotado não pode ser sugerido. Deixe ele disponível na lista de produtos para sugerir."}
          </span>
        </div>
        <Switch
          id="product-suggested"
          disabled={!isAvailable}
          checked={values.isSuggested}
          onCheckedChange={(isSuggested) =>
            onChange({ isSuggested })
          }
        />
      </div>
    </>
  );
}
