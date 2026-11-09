// Configurações da loja (coluna stores.settings, jsonb).
//
// O create_order lê estas chaves para validar e calcular o pedido. Os padrões
// abaixo são os mesmos que ele aplica quando a chave não existe, para o
// cardápio e o checkout mostrarem exatamente o que o banco vai cobrar.
// Chave nova em settings entra primeiro aqui.
import { z } from "zod";

import {
  Constants,
  type Enums,
  type Json,
} from "@/lib/database.types";

import {
  DEFAULT_ORDER_ALERTS,
  type OrderAlerts,
} from "@/lib/orders/board";
import {
  DEFAULT_APPEARANCE,
  type StoreAppearance,
} from "@/lib/store/theme";

const amountInReais = z.number().finite().nonnegative();
const minutes = z.number().int().nonnegative();

export const paymentMethods =
  Constants.public.Enums.payment_method;

// Aparência do cardápio do cliente. Só a cor principal é usada hoje;
// as demais chaves já existem para a edição de aparência pelo lojista.
export const storeThemeSchema = z.object({
  primary: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
  mode: z.enum(["light", "dark"]).optional(),
  layout: z.enum(["lista", "grade"]).optional(),
  font: z
    .enum([
      "moderna",
      "classica",
      "arredondada",
      "elegante",
    ])
    .optional(),
  welcome: z.string().max(140).optional(),
  // Imagens do topo do cardápio, URLs públicas do bucket store-assets.
  logo_url: z.url().nullable().optional(),
  cover_url: z.url().nullable().optional(),
});

/** Formato gravado em stores.settings.theme. */
export type StoreTheme = z.infer<typeof storeThemeSchema>;

// Avisos do quadro de pedidos.
export const orderAlertsSchema = z.object({
  // Minutos desde o pedido até ele ficar em vermelho.
  late_after_minutes: z.int().min(5).max(180).optional(),
  // Som enquanto houver pedido novo não aceito.
  sound: z.boolean().optional(),
});

export const storeSettingsSchema = z.object({
  // Aparência do cardápio. Sem a chave: visual padrão do layout.
  theme: storeThemeSchema.optional(),
  // Subtotal mínimo do pedido. Sem a chave: 0.
  min_order: amountInReais.optional(),
  // Taxa de entrega cobrada em pedidos ENTREGA. Sem a chave: 0.
  delivery_fee: amountInReais.optional(),
  // A partir deste subtotal a entrega sai grátis. Sem a chave: nunca.
  free_delivery_above: amountInReais.nullable().optional(),
  // Formas de pagamento aceitas. Sem a chave: todas.
  payment_methods: z
    .array(z.enum(paymentMethods))
    .optional(),
  // Prazos mostrados ao cliente, em minutos. Sem a chave: não mostra.
  delivery_time_minutes: minutes.nullable().optional(),
  pickup_time_minutes: minutes.nullable().optional(),
  // Avisos do quadro. Sem a chave: 30 min e som ligado.
  order_alerts: orderAlertsSchema.optional(),
});

/** Formato gravado em stores.settings. */
export type StoreSettings = z.infer<
  typeof storeSettingsSchema
>;

/** Configurações com os padrões do create_order já aplicados. */
export type StoreRules = {
  minimumOrder: number;
  deliveryFee: number;
  freeDeliveryAbove: number | null;
  paymentMethods: Enums<"payment_method">[];
  deliveryTimeMinutes: number | null;
  pickupTimeMinutes: number | null;
};

/**
 * Lê stores.settings como vem do banco. Lança erro se o conteúdo não bate com
 * o schema, porque aí o create_order também falharia (ou cobraria errado).
 */
export function readStoreRules(settings: Json): StoreRules {
  const parsed = storeSettingsSchema.parse(settings ?? {});

  return {
    minimumOrder: parsed.min_order ?? 0,
    deliveryFee: parsed.delivery_fee ?? 0,
    freeDeliveryAbove: parsed.free_delivery_above ?? null,
    paymentMethods: parsed.payment_methods ?? [
      ...paymentMethods,
    ],
    deliveryTimeMinutes:
      parsed.delivery_time_minutes ?? null,
    pickupTimeMinutes: parsed.pickup_time_minutes ?? null,
  };
}

/** Aparência com os padrões aplicados. Settings inválido cai no padrão. */
export function readStoreAppearance(
  settings: Json,
): StoreAppearance {
  const result = storeSettingsSchema.safeParse(
    settings ?? {},
  );
  const theme = result.success
    ? result.data.theme
    : undefined;

  return {
    primaryColor:
      theme?.primary ?? DEFAULT_APPEARANCE.primaryColor,
    mode: theme?.mode ?? DEFAULT_APPEARANCE.mode,
    layout: theme?.layout ?? DEFAULT_APPEARANCE.layout,
    font: theme?.font ?? DEFAULT_APPEARANCE.font,
    welcome: theme?.welcome ?? DEFAULT_APPEARANCE.welcome,
    logoUrl: theme?.logo_url ?? null,
    coverUrl: theme?.cover_url ?? null,
  };
}

/** Taxa de entrega de um pedido, pela mesma regra do create_order. */
export function calculateDeliveryFee(
  rules: StoreRules,
  mode: Enums<"order_mode">,
  subtotal: number,
): number {
  if (mode !== "ENTREGA") return 0;
  if (
    rules.freeDeliveryAbove !== null &&
    subtotal >= rules.freeDeliveryAbove
  ) {
    return 0;
  }
  return rules.deliveryFee;
}

/** Avisos do quadro com os padrões aplicados. Settings inválido cai no padrão. */
export function readOrderAlerts(
  settings: Json,
): OrderAlerts {
  const result = storeSettingsSchema.safeParse(
    settings ?? {},
  );
  const alerts = result.success
    ? result.data.order_alerts
    : undefined;

  return {
    lateAfterMinutes:
      alerts?.late_after_minutes ??
      DEFAULT_ORDER_ALERTS.lateAfterMinutes,
    sound: alerts?.sound ?? DEFAULT_ORDER_ALERTS.sound,
  };
}
