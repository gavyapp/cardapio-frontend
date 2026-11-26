"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type FormEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { NativeSelect } from "@/components/atoms/native-select";
import { Label } from "@/components/atoms/label";
import { BackToMenuLink } from "@/components/molecules/back-to-menu-link";
import { CurrencyInput } from "@/components/molecules/currency-input";
import { FieldError } from "@/components/molecules/field-error";
import { PhoneInput } from "@/components/molecules/phone-input";
import { RadioCard } from "@/components/molecules/radio-card";
import { CheckoutFormSkeleton } from "@/components/organisms/checkout-form-skeleton";
import { OrderSentSkeleton } from "@/components/organisms/order-sent-skeleton";
import { useCart } from "@/components/providers/cart-provider";
import type { Enums } from "@/lib/database.types";
import {
  formatCurrency,
  formatDuration,
  pluralize,
} from "@/lib/format";
import {
  CHECKOUT_FIELD_ORDER,
  CUSTOMER_STORAGE_KEY,
  affectedItemKeys,
  checkoutTotals,
  fieldErrorsFromServer,
  parseSavedCustomer,
  prefillCheckout,
  rememberCustomer,
  returnsToCart,
  validateCheckout,
  type CheckoutErrors,
  type CheckoutField,
  type CheckoutFields,
} from "@/lib/orders/checkout";
import {
  openOrdersStorageKey,
  parseRememberedOrders,
  rememberOrder,
} from "@/lib/orders/open-orders";
import { sendOrder } from "@/lib/orders/send-order";
import type { OrderDiscount } from "@/lib/promotions/order-discount";
import {
  hasDeliveryZones,
  lowestDeliveryFee,
  OTHER_ZONE,
  type DeliveryZone,
} from "@/lib/store/delivery-zones";
import {
  menuPathFrom,
  orderPathFrom,
} from "@/lib/routing/store-paths";

type PaymentMethod = Enums<"payment_method">;

type CheckoutRules = {
  deliveryFee: number;
  /** Bairros com taxa própria; vazio em loja de taxa única. */
  deliveryZones: DeliveryZone[];
  freeDeliveryAbove: number | null;
  /** Descontos no pedido vigentes agora. */
  orderDiscounts: readonly OrderDiscount[];
  paymentMethods: PaymentMethod[];
  deliveryTimeMinutes: number | null;
  pickupTimeMinutes: number | null;
};

const PAYMENT_OPTIONS: {
  method: PaymentMethod;
  title: string;
  description?: string;
}[] = [
  { method: "PIX", title: "Pix" },
  { method: "DINHEIRO", title: "Dinheiro" },
  {
    method: "CARTAO",
    title: "Cartão",
    description: "Crédito ou débito, na maquininha",
  },
];

// Os dados guardados só mudam quando esta própria tela grava: não há o que
// escutar.
const subscribeToNothing = () => () => {};

// Navegação privada ou armazenamento bloqueado: segue sem os dados guardados.
function readSavedCustomer(): string | null {
  try {
    return window.localStorage.getItem(
      CUSTOMER_STORAGE_KEY,
    );
  } catch {
    return null;
  }
}

// Guarda o pedido enviado para o cardápio mostrar o atalho de
// acompanhamento enquanto ele estiver em andamento.
function writeOpenOrder(
  storeId: string,
  order: { token: string; number: number },
) {
  try {
    const key = openOrdersStorageKey(storeId);
    window.localStorage.setItem(
      key,
      JSON.stringify(
        rememberOrder(
          parseRememberedOrders(
            window.localStorage.getItem(key),
          ),
          order,
        ),
      ),
    );
  } catch {
    // Sem armazenamento, o atalho só não aparece.
  }
}

function writeSavedCustomer(fields: CheckoutFields) {
  try {
    const previous = parseSavedCustomer(
      readSavedCustomer(),
    );
    window.localStorage.setItem(
      CUSTOMER_STORAGE_KEY,
      JSON.stringify(rememberCustomer(previous, fields)),
    );
  } catch {
    // Sem armazenamento, o próximo pedido só não vem preenchido.
  }
}

/**
 * Fechamento do pedido: como recebe, quem é, como paga e o resumo com os
 * totais. Vem preenchido com os dados do último pedido feito no aparelho e,
 * depois do envio, dá lugar à confirmação.
 */
export function CheckoutForm({
  store,
  rules,
  pickupAddress,
}: {
  store: { id: string; name: string };
  rules: CheckoutRules;
  /** Endereço da loja, para quem retira. */
  pickupAddress: string;
}) {
  const { items } = useCart();
  // Depois do envio o carrinho esvazia e a tela do pedido abre: enquanto
  // isso, nada de "pedido vazio".
  const [hasSent, setHasSent] = useState(false);

  // Carrinho e dados do cliente vivem no aparelho: no servidor não há nada
  // a mostrar, e a tela só aparece depois de lê-los.
  const isOnDevice = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const saved = useSyncExternalStore(
    subscribeToNothing,
    readSavedCustomer,
    () => null,
  );

  if (hasSent) return <OrderSentSkeleton />;
  if (!isOnDevice) return <CheckoutFormSkeleton />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-section-title font-semibold">
          Seu pedido está vazio
        </h1>
        <p className="text-body text-muted-foreground">
          Escolha algo no cardápio para continuar.
        </p>
        <BackToMenuLink className="text-body font-semibold underline underline-offset-4">
          Voltar ao cardápio
        </BackToMenuLink>
      </div>
    );
  }

  return (
    <CheckoutFields
      // Os dados guardados chegam depois da primeira leitura: o formulário
      // recomeça já preenchido.
      key={saved ?? "sem-dados-guardados"}
      initial={prefillCheckout(
        parseSavedCustomer(saved),
        rules.deliveryZones,
      )}
      store={store}
      rules={rules}
      pickupAddress={pickupAddress}
      onSent={() => setHasSent(true)}
    />
  );
}

function CheckoutFields({
  initial,
  store,
  rules,
  pickupAddress,
  onSent,
}: {
  initial: CheckoutFields;
  store: { id: string; name: string };
  rules: CheckoutRules;
  pickupAddress: string;
  onSent: () => void;
}) {
  const {
    items,
    summary,
    canOrder,
    nextOpeningLabel,
    clear,
    reportRefusal,
  } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [refusal, setRefusal] = useState<string | null>(
    null,
  );
  const [isSending, setSending] = useState(false);

  const isDelivery = fields.mode === "ENTREGA";
  const totals = checkoutTotals(
    summary.subtotal,
    rules,
    fields.mode,
    fields.zoneId,
  );
  const chargesByZone = hasDeliveryZones(rules);
  const paymentOptions = PAYMENT_OPTIONS.filter((option) =>
    rules.paymentMethods.includes(option.method),
  );
  const blocked =
    !canOrder || Boolean(summary.minimumOrder);

  function change<K extends CheckoutField>(
    field: K,
    value: CheckoutFields[K],
  ) {
    setFields((current) => ({
      ...current,
      [field]: value,
    }));
    // O erro some quando o cliente mexe no campo.
    setErrors((current) => {
      if (!current[field]) return current;
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
  }

  function showErrors(found: CheckoutErrors) {
    setErrors(found);
    const first = CHECKOUT_FIELD_ORDER.find(
      (field) => found[field],
    );
    if (!first) return;
    // Depois que a tela marcou os campos, leva o foco ao primeiro com erro.
    requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLElement>(
          `[data-field="${first}"]`,
        )
        ?.focus();
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSending || blocked) return;

    setRefusal(null);
    const validation = validateCheckout(fields, {
      storeId: store.id,
      items,
      total: totals.total,
      deliveryZones: rules.deliveryZones,
    });
    if (!validation.ok) {
      showErrors(validation.errors);
      return;
    }

    setSending(true);
    const response = await sendOrder(validation.request);
    setSending(false);

    if (response.ok) {
      writeSavedCustomer(fields);
      writeOpenOrder(store.id, {
        token: response.order.publicToken,
        number: response.order.number,
      });
      onSent();
      clear();
      router.replace(
        orderPathFrom(pathname, response.order.publicToken),
      );
      return;
    }

    if (returnsToCart(response.error)) {
      // O que impede o pedido se resolve no carrinho: volta para lá com a
      // explicação e o item marcado.
      reportRefusal({
        message: response.error.message,
        itemKeys: affectedItemKeys(response.error, items),
      });
      router.push(menuPathFrom(pathname));
      router.refresh();
      return;
    }

    const fromServer = fieldErrorsFromServer(
      response.error,
    );
    if (Object.keys(fromServer).length) {
      showErrors(fromServer);
    } else {
      setRefusal(response.error.message);
    }
  }

  // Propriedades comuns de um campo de texto do formulário.
  function textField(
    field: Exclude<
      CheckoutField,
      "mode" | "paymentMethod" | "zoneId"
    >,
  ) {
    const error = errors[field];
    return {
      id: `${id}-${field}`,
      name: field,
      "data-field": field,
      value: fields[field],
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error
        ? `${id}-${field}-erro`
        : undefined,
      onChange: (
        event: React.ChangeEvent<HTMLInputElement>,
      ) => change(field, event.target.value),
    } satisfies ComponentProps<typeof Input> & {
      "data-field": string;
    };
  }

  function fieldError(field: CheckoutField) {
    return (
      <span
        id={`${id}-${field}-erro`}
        className="empty:hidden"
      >
        <FieldError message={errors[field]} />
      </span>
    );
  }

  const deliveryTime = rules.deliveryTimeMinutes
    ? formatDuration(rules.deliveryTimeMinutes)
    : null;
  const pickupTime = rules.pickupTimeMinutes
    ? formatDuration(rules.pickupTimeMinutes)
    : null;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      className="grid items-start gap-x-8 gap-y-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="flex min-w-0 flex-col gap-8">
        <h1 className="text-page-title font-semibold">
          Finalizar pedido
        </h1>

        <section className="flex flex-col gap-3">
          <h2
            id={`${id}-recebimento`}
            className="text-section-title font-semibold"
          >
            Como você quer receber?
          </h2>
          <div
            role="radiogroup"
            aria-labelledby={`${id}-recebimento`}
            className="grid grid-cols-2 gap-3"
          >
            <RadioCard
              selected={isDelivery}
              title="Entrega"
              description={[
                chargesByZone
                  ? lowestDeliveryFee(rules) > 0
                    ? `A partir de ${formatCurrency(lowestDeliveryFee(rules))}`
                    : "Taxa por bairro"
                  : rules.deliveryFee > 0
                    ? `Taxa ${formatCurrency(rules.deliveryFee)}`
                    : "Sem taxa",
                deliveryTime,
              ]
                .filter(Boolean)
                .join(" · ")}
              onSelect={() => change("mode", "ENTREGA")}
            />
            <RadioCard
              selected={!isDelivery}
              title="Retirada"
              description={["Sem taxa", pickupTime]
                .filter(Boolean)
                .join(" · ")}
              onSelect={() => change("mode", "RETIRADA")}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-section-title font-semibold">
            Seus dados
          </h2>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-name`}>Nome</Label>
            <Input
              {...textField("name")}
              autoComplete="name"
              placeholder="Como a loja deve te chamar"
              maxLength={80}
            />
            {fieldError("name")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-phone`}>
              Celular (WhatsApp)
            </Label>
            <PhoneInput {...textField("phone")} />
            {fieldError("phone")}
          </div>
        </section>

        {isDelivery ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-section-title font-semibold">
              Endereço de entrega
            </h2>
            <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
              <div className="grid content-start gap-2">
                <Label htmlFor={`${id}-street`}>Rua</Label>
                <Input
                  {...textField("street")}
                  autoComplete="address-line1"
                  maxLength={120}
                />
                {fieldError("street")}
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor={`${id}-number`}>
                  Número
                </Label>
                <Input
                  {...textField("number")}
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={20}
                />
                {fieldError("number")}
              </div>
            </div>
            {chargesByZone ? (
              <div className="grid gap-2">
                <Label htmlFor={`${id}-zoneId`}>
                  Bairro
                </Label>
                <NativeSelect
                  id={`${id}-zoneId`}
                  name="zoneId"
                  data-field="zoneId"
                  value={fields.zoneId}
                  aria-invalid={
                    errors.zoneId ? true : undefined
                  }
                  aria-describedby={
                    errors.zoneId
                      ? `${id}-zoneId-erro`
                      : undefined
                  }
                  onChange={(event) => {
                    const zoneId = event.target.value;
                    change("zoneId", zoneId);
                    // Bairro da lista leva o nome do cadastro; em "Outro
                    // bairro" o cliente digita o dele.
                    change(
                      "district",
                      rules.deliveryZones.find(
                        (zone) => zone.id === zoneId,
                      )?.name ?? "",
                    );
                  }}
                >
                  <option value="" disabled>
                    Escolha o bairro
                  </option>
                  {rules.deliveryZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} ·{" "}
                      {zone.fee > 0
                        ? formatCurrency(zone.fee)
                        : "Grátis"}
                    </option>
                  ))}
                  <option value={OTHER_ZONE}>
                    Outro bairro ·{" "}
                    {rules.deliveryFee > 0
                      ? formatCurrency(rules.deliveryFee)
                      : "Grátis"}
                  </option>
                </NativeSelect>
                {fieldError("zoneId")}
              </div>
            ) : null}
            {!chargesByZone ||
            fields.zoneId === OTHER_ZONE ? (
              <div className="grid gap-2">
                <Label htmlFor={`${id}-district`}>
                  {chargesByZone
                    ? "Nome do bairro"
                    : "Bairro"}
                </Label>
                <Input
                  {...textField("district")}
                  autoComplete="address-level3"
                  maxLength={80}
                />
                {fieldError("district")}
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor={`${id}-complement`}>
                Complemento
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                {...textField("complement")}
                autoComplete="address-line2"
                placeholder="Apto, bloco, casa dos fundos"
                maxLength={80}
              />
              {fieldError("complement")}
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-reference`}>
                Referência
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                {...textField("reference")}
                autoComplete="off"
                placeholder="Perto de onde fica"
                maxLength={120}
              />
              {fieldError("reference")}
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-1 rounded-control bg-muted px-4 py-3">
            <h2 className="text-body font-semibold">
              Retire no balcão
            </h2>
            <p className="text-support text-muted-foreground">
              {[
                pickupAddress,
                pickupTime
                  ? `pronto em cerca de ${pickupTime}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2
            id={`${id}-pagamento`}
            className="text-section-title font-semibold"
          >
            {isDelivery
              ? "Pagamento na entrega"
              : "Pagamento na retirada"}
          </h2>
          <div
            role="radiogroup"
            aria-labelledby={`${id}-pagamento`}
            aria-invalid={
              errors.paymentMethod ? true : undefined
            }
            aria-describedby={
              errors.paymentMethod
                ? `${id}-paymentMethod-erro`
                : undefined
            }
            data-field="paymentMethod"
            tabIndex={-1}
            className="flex flex-col gap-2 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            {paymentOptions.map((option) => {
              const selected =
                fields.paymentMethod === option.method;
              return (
                <RadioCard
                  key={option.method}
                  selected={selected}
                  title={option.title}
                  description={option.description}
                  invalid={Boolean(errors.paymentMethod)}
                  onSelect={() =>
                    change("paymentMethod", option.method)
                  }
                >
                  {selected &&
                  option.method === "DINHEIRO" ? (
                    <div className="grid gap-2 text-foreground">
                      <Label htmlFor={`${id}-changeFor`}>
                        Troco para quanto?
                        <span className="font-normal text-muted-foreground">
                          (opcional)
                        </span>
                      </Label>
                      <CurrencyInput
                        {...textField("changeFor")}
                        autoComplete="off"
                        placeholder="0,00"
                      />
                      {fieldError("changeFor")}
                      {errors.changeFor ? null : (
                        <p className="text-support text-muted-foreground">
                          Deixe em branco se não precisar de
                          troco.
                        </p>
                      )}
                    </div>
                  ) : null}
                </RadioCard>
              );
            })}
          </div>
          {fieldError("paymentMethod")}
        </section>
      </div>

      {/* No celular o resumo e o botão entram na coluna única, e o botão
          fica preso no pé da tela; no computador os dois ficam ao lado. */}
      <div className="contents lg:sticky lg:top-4 lg:flex lg:flex-col lg:gap-4">
        <section
          aria-labelledby={`${id}-resumo`}
          className="flex flex-col gap-4 rounded-surface border bg-card p-4"
        >
          <h2
            id={`${id}-resumo`}
            className="text-section-title font-semibold"
          >
            Resumo do pedido
          </h2>
          <ul className="flex flex-col gap-3">
            {items.map((item) => {
              const options = item.options
                .map((option) =>
                  option.quantity > 1
                    ? `${option.quantity}× ${option.name}`
                    : option.name,
                )
                .join(" · ");
              return (
                <li
                  key={item.key}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-body">
                      <span className="tabular font-semibold">
                        {item.quantity}×
                      </span>{" "}
                      {item.product.name}
                    </p>
                    {options ? (
                      <p className="text-support text-muted-foreground">
                        {options}
                      </p>
                    ) : null}
                    {item.notes ? (
                      <p className="text-support text-muted-foreground">
                        Obs.: {item.notes}
                      </p>
                    ) : null}
                  </div>
                  <p className="flex shrink-0 flex-col items-end">
                    {item.fullTotal !== null ? (
                      <s className="tabular text-support text-muted-foreground">
                        {formatCurrency(item.fullTotal)}
                      </s>
                    ) : null}
                    <span className="tabular text-body">
                      {formatCurrency(item.total)}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>

          <dl className="flex flex-col gap-2 border-t pt-4 text-body">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">
                Subtotal ·{" "}
                {pluralize(
                  summary.itemCount,
                  "item",
                  "itens",
                )}
              </dt>
              <dd className="tabular flex items-baseline gap-2">
                {summary.fullSubtotal !== null ? (
                  <s className="text-muted-foreground">
                    {formatCurrency(summary.fullSubtotal)}
                  </s>
                ) : null}
                {formatCurrency(totals.subtotal)}
              </dd>
            </div>
            {isDelivery ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">
                  Taxa de entrega
                </dt>
                <dd className="tabular flex items-baseline gap-2">
                  {totals.waivedDeliveryFee !== null ? (
                    <s className="text-muted-foreground">
                      {formatCurrency(
                        totals.waivedDeliveryFee,
                      )}
                    </s>
                  ) : null}
                  {totals.isDeliveryFeePending
                    ? "Escolha o bairro"
                    : totals.deliveryFee > 0
                      ? formatCurrency(totals.deliveryFee)
                      : "Grátis"}
                </dd>
              </div>
            ) : null}
            {totals.discount > 0 ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">
                  {totals.discountLabel}
                </dt>
                <dd className="tabular font-semibold whitespace-nowrap text-success">
                  − {formatCurrency(totals.discount)}
                </dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-3 border-t pt-2 text-section-title font-semibold">
              <dt>Total</dt>
              <dd className="tabular">
                {formatCurrency(totals.total)}
              </dd>
            </div>
          </dl>
        </section>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t bg-background px-4 py-3 lg:static lg:mx-0 lg:border-t-0 lg:p-0">
          {refusal ? (
            <p
              role="alert"
              className="rounded-control bg-destructive-soft px-3 py-2 text-support font-semibold text-destructive"
            >
              {refusal}
            </p>
          ) : null}
          {!canOrder ? (
            <p
              role="status"
              className="text-support text-muted-foreground"
            >
              A loja está fechada agora
              {nextOpeningLabel
                ? ` e ${nextOpeningLabel}`
                : ""}
              .
            </p>
          ) : summary.minimumOrder ? (
            <p
              role="status"
              className="text-support text-muted-foreground"
            >
              Pedido mínimo de{" "}
              {formatCurrency(summary.minimumOrder.value)}.
              Faltam{" "}
              {formatCurrency(summary.minimumOrder.missing)}
              .
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            loading={isSending}
            disabled={blocked}
            className="w-full justify-between"
          >
            <span>
              {isSending ? "Enviando…" : "Enviar pedido"}
            </span>
            <span className="tabular ml-auto">
              {formatCurrency(totals.total)}
            </span>
          </Button>
        </div>
      </div>
    </form>
  );
}
