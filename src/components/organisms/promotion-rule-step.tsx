"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { CurrencyInput } from "@/components/molecules/currency-input";
import { EditorCard } from "@/components/molecules/editor-card";
import { Field } from "@/components/molecules/field";
import { PercentInput } from "@/components/molecules/percent-input";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import {
  formatCurrency,
  normalizeSearch,
} from "@/lib/format";
import {
  productResultLine,
  type PromotionProduct,
} from "@/lib/promotions/describe";
import {
  promotionName,
  ruleDraft,
  selectedProducts,
  type HeldProducts,
  type OrderMode,
  type ProductMode,
  type PromotionForm,
} from "@/lib/promotions/draft";
import { orderDiscountAmount } from "@/lib/promotions/order-discount";
import { cn } from "@/lib/utils";

/** Produto que a promoção pode escolher, com a categoria para a busca. */
export type PromotionProductOption = PromotionProduct & {
  categoryName: string;
};

const PRODUCT_MODES: [ProductMode, string][] = [
  ["percent", "% de desconto"],
  ["amount_off", "R$ a menos"],
  ["fixed_price", "Novo preço"],
];

const PRODUCT_VALUE_LABEL: Record<ProductMode, string> = {
  percent: "Desconto",
  amount_off: "Valor a menos",
  fixed_price: "Novo preço",
};

const ORDER_MODES: [OrderMode, string][] = [
  ["amount_off", "R$ de desconto"],
  ["percent", "% de desconto"],
];

/** Passo Regra do editor de promoção, conforme o tipo, e o nome. */
export function PromotionRuleStep({
  form,
  products,
  held,
  onChange,
}: {
  form: PromotionForm;
  products: readonly PromotionProductOption[];
  held: HeldProducts;
  onChange: (changes: Partial<PromotionForm>) => void;
}) {
  return (
    <>
      {form.kind === "product_discount" ? (
        <ProductRule
          form={form}
          products={products}
          held={held}
          onChange={onChange}
        />
      ) : (
        <OrderRule form={form} onChange={onChange} />
      )}

      <EditorCard title="Nome da promoção">
        <div className="flex flex-col gap-2 p-4 sm:p-6">
          <Input
            id="promotion-name"
            aria-label="Nome da promoção"
            value={promotionName(form, products)}
            maxLength={80}
            onChange={(event) =>
              onChange({
                name: event.target.value,
                autoName: false,
              })
            }
          />
          {form.autoName ? (
            <span className="text-support text-muted-foreground">
              Preenchido a partir da regra. Você pode
              editar.
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => onChange({ autoName: true })}
            >
              Usar nome automático
            </Button>
          )}
        </div>
      </EditorCard>
    </>
  );
}

function ProductRule({
  form,
  products,
  held,
  onChange,
}: {
  form: PromotionForm;
  products: readonly PromotionProductOption[];
  held: HeldProducts;
  onChange: (changes: Partial<PromotionForm>) => void;
}) {
  const [query, setQuery] = useState("");
  const rule = ruleDraft(form);
  const chosen = selectedProducts(form, products);
  const term = normalizeSearch(query);
  const visible = products.filter(
    (product) =>
      !term ||
      normalizeSearch(
        `${product.name} ${product.categoryName}`,
      ).includes(term),
  );
  const ValueInput =
    form.productMode === "percent"
      ? PercentInput
      : CurrencyInput;

  function toggle(productId: string) {
    onChange({
      productIds: form.productIds.includes(productId)
        ? form.productIds.filter((id) => id !== productId)
        : [...form.productIds, productId],
    });
  }

  return (
    <>
      <EditorCard title="Desconto">
        <div className="flex flex-col gap-6 p-4 sm:p-6">
          <SegmentedControl
            label="Tipo de desconto"
            value={form.productMode}
            options={PRODUCT_MODES}
            onChange={(productMode) =>
              // O valor muda de sentido (% ou reais): começa de novo.
              onChange({ productMode, productValue: "" })
            }
          />
          <div className="max-w-[200px]">
            <Field
              id="promotion-product-value"
              label={PRODUCT_VALUE_LABEL[form.productMode]}
            >
              <ValueInput
                id="promotion-product-value"
                value={form.productValue}
                placeholder="0"
                onChange={(event) =>
                  onChange({
                    productValue: event.target.value,
                  })
                }
              />
            </Field>
          </div>
          {chosen.length > 0 &&
          rule.kind === "product_discount" ? (
            <div className="flex flex-col gap-1 rounded-control bg-muted px-4 py-3">
              <span className="text-support font-semibold">
                Resultado
              </span>
              {chosen.map((product) => {
                const line = productResultLine(product, {
                  mode: rule.mode,
                  value: rule.value ?? 0,
                });
                return (
                  <span
                    key={product.id}
                    className={cn(
                      "tabular text-support",
                      !line.applies &&
                        "text-muted-foreground",
                    )}
                  >
                    {line.text}
                  </span>
                );
              })}
              <span className="text-caption text-muted-foreground">
                O desconto vale sobre o preço base.
                Complementos são cobrados no preço normal.
              </span>
            </div>
          ) : null}
        </div>
      </EditorCard>

      <EditorCard
        title={
          <>
            Produtos{" "}
            <span className="font-normal text-muted-foreground">
              ·{" "}
              {chosen.length === 1
                ? "1 escolhido"
                : `${chosen.length} escolhidos`}
            </span>
          </>
        }
        toolbar={
          <Input
            type="search"
            value={query}
            placeholder="Buscar produto ou categoria"
            aria-label="Buscar produto ou categoria"
            onChange={(event) =>
              setQuery(event.target.value)
            }
          />
        }
      >
        {visible.length === 0 ? (
          <p className="px-4 py-4 text-support text-muted-foreground sm:px-6">
            Nenhum produto encontrado.
          </p>
        ) : (
          <ul className="max-h-[360px] overflow-y-auto py-2">
            {visible.map((product) => {
              const checked = form.productIds.includes(
                product.id,
              );
              const heldBy = held.get(product.id);
              // Produto de outra promoção não entra; se já estava aqui
              // (uma cópia, por exemplo), ainda dá para tirar.
              const blocked = !!heldBy && !checked;
              return (
                <li key={product.id}>
                  <label
                    className={cn(
                      "flex min-h-11 items-center gap-3 px-4 py-1.5 sm:px-6",
                      blocked
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-muted",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-foreground"
                      checked={checked}
                      disabled={blocked}
                      onChange={() => toggle(product.id)}
                    />
                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate text-body">
                        {product.name}
                      </span>
                      <span
                        className={cn(
                          "truncate text-support",
                          heldBy
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {heldBy
                          ? `Já está em "${heldBy}"`
                          : product.categoryName}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-support text-muted-foreground">
                      {formatCurrency(product.price)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </EditorCard>
    </>
  );
}

function OrderRule({
  form,
  onChange,
}: {
  form: PromotionForm;
  onChange: (changes: Partial<PromotionForm>) => void;
}) {
  const rule = ruleDraft(form);
  const isFreeDelivery = rule.kind === "free_delivery";
  const ValueInput =
    form.orderMode === "percent"
      ? PercentInput
      : CurrencyInput;

  let result: string | null = null;
  // A taxa muda por bairro: o resultado não cita o valor dela.
  if (rule.kind === "free_delivery") {
    result = rule.minSubtotal
      ? `Pedidos com entrega a partir de ${formatCurrency(rule.minSubtotal)} não pagam a taxa de entrega`
      : "Nenhum pedido com entrega paga a taxa de entrega";
  }
  if (
    rule.kind === "order_discount" &&
    rule.minSubtotal &&
    rule.value
  ) {
    const discount = orderDiscountAmount(
      {
        id: "",
        name: "",
        minSubtotal: rule.minSubtotal,
        mode: rule.mode,
        value: rule.value,
      },
      rule.minSubtotal,
    );
    result = `Pedido de ${formatCurrency(rule.minSubtotal)} → ${formatCurrency(discount)} de desconto`;
  }

  return (
    <EditorCard
      title={
        isFreeDelivery
          ? "Entrega grátis"
          : "Desconto no pedido"
      }
    >
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="max-w-[200px]">
            <Field
              id="promotion-min-subtotal"
              label={
                isFreeDelivery
                  ? "Valor mínimo do pedido (opcional)"
                  : "Valor mínimo do pedido"
              }
            >
              <CurrencyInput
                id="promotion-min-subtotal"
                value={form.minSubtotal}
                placeholder="0,00"
                onChange={(event) =>
                  onChange({
                    minSubtotal: event.target.value,
                  })
                }
              />
            </Field>
          </div>
          <span className="text-support text-muted-foreground">
            Soma dos produtos, já com desconto, sem a taxa
            de entrega.
            {isFreeDelivery
              ? " Deixe vazio para entrega grátis em qualquer pedido."
              : null}
          </span>
        </div>

        {rule.kind === "order_discount" ? (
          <>
            <div className="flex flex-col gap-2">
              <span
                id="promotion-order-mode"
                className="text-support font-medium"
              >
                Desconto
              </span>
              <SegmentedControl
                labelledBy="promotion-order-mode"
                value={form.orderMode}
                options={ORDER_MODES}
                onChange={(orderMode) =>
                  onChange({ orderMode, orderValue: "" })
                }
              />
            </div>
            <div className="max-w-[200px]">
              <Field
                id="promotion-order-value"
                label="Valor do desconto"
              >
                <ValueInput
                  id="promotion-order-value"
                  value={form.orderValue}
                  placeholder="0"
                  onChange={(event) =>
                    onChange({
                      orderValue: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </>
        ) : (
          <span className="text-support text-muted-foreground">
            Vale só para pedidos com entrega. A retirada já
            é grátis.
          </span>
        )}

        {result ? (
          <div className="flex flex-col gap-1 rounded-control bg-muted px-4 py-3">
            <span className="text-support font-semibold">
              Resultado
            </span>
            <span className="tabular text-support">
              {result}
            </span>
          </div>
        ) : null}
      </div>
    </EditorCard>
  );
}
