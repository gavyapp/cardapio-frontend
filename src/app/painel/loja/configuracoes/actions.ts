"use server";

import { z } from "zod";

import { afterMenuChange } from "@/lib/catalog/menu-cache";
import {
  saveStoreHours,
  updateStoreProfile,
  updateStoreSettings,
} from "@/lib/data/store-details";
import { paymentMethods } from "@/lib/data/store-settings";
import { parseAmountInput } from "@/lib/format";
import { updateOrderAlerts } from "@/lib/data/order-alerts";
import { requireStoreForAction } from "@/lib/panel/access";
import {
  errorMessage,
  type ActionResult,
  validationError,
} from "@/lib/panel/action-result";

const time = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "Informe um horário válido.",
  );

const shift = z
  .object({
    id: z.uuid().optional(),
    weekday: z.number().int().min(0).max(6),
    opensAt: time,
    closesAt: time,
  })
  .refine((s) => s.opensAt < s.closesAt, {
    message:
      "O horário de abertura precisa vir antes do fechamento.",
  });

const shifts = z
  .array(shift)
  .max(14, "São até dois turnos por dia.");

/** Grava os horários de funcionamento da loja logada (um turno por dia). */
export async function saveStoreHoursAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = shifts.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await saveStoreHours(store.id, parsed.data);
    // O cardápio mostra "Fechado" fora do horário; expira o cache dele.
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use até ${max} caracteres.`)
    .transform((value) => value || null);

const storeProfile = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome à loja.")
    .max(80, "Use até 80 caracteres."),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, "") || null)
    .refine(
      (digits) =>
        digits === null ||
        digits.length === 10 ||
        digits.length === 11,
      "Informe um telefone com DDD.",
    ),
  street: optionalText(120),
  number: optionalText(20),
  district: optionalText(80),
  city: optionalText(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => value || null)
    .refine(
      (value) => value === null || /^[A-Z]{2}$/.test(value),
      "Use a sigla do estado, com duas letras.",
    ),
});

const amount = z
  .string()
  .trim()
  .transform((text, ctx) => {
    if (!text) return 0;
    const value = parseAmountInput(text);
    if (value === null) {
      ctx.addIssue({
        code: "custom",
        message: "Informe um valor válido.",
      });
      return z.NEVER;
    }
    return value;
  });

const minutesField = z
  .string()
  .trim()
  .transform((text, ctx) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) return null;
    const value = Number(digits);
    if (!Number.isInteger(value) || value > 24 * 60) {
      ctx.addIssue({
        code: "custom",
        message: "Informe os minutos, até 1440.",
      });
      return z.NEVER;
    }
    return value;
  });

const payment = z
  .array(z.enum(paymentMethods))
  .min(1, "Mantenha ao menos uma forma de pagamento.");

const delivery = z.object({
  deliveryFee: amount,
  deliveryTimeMinutes: minutesField,
  pickupTimeMinutes: minutesField,
});

/**
 * Grava o formulário da página: cadastro da loja (colunas de stores) e
 * entrega e retirada (chaves em settings).
 */
export async function saveStoreSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  const text = (key: string) =>
    String(formData.get(key) ?? "");

  const profile = storeProfile.safeParse({
    name: text("name"),
    phone: text("phone"),
    street: text("street"),
    number: text("number"),
    district: text("district"),
    city: text("city"),
    state: text("state"),
  });
  if (!profile.success)
    return validationError(profile.error);

  const shipping = delivery.safeParse({
    deliveryFee: text("deliveryFee"),
    deliveryTimeMinutes: text("deliveryTimeMinutes"),
    pickupTimeMinutes: text("pickupTimeMinutes"),
  });
  if (!shipping.success)
    return validationError(shipping.error);

  const accepted = payment.safeParse(
    formData.getAll("paymentMethods"),
  );
  if (!accepted.success)
    return validationError(accepted.error);

  try {
    const store = await requireStoreForAction();
    await updateStoreProfile(store.id, profile.data);
    await updateStoreSettings(store.id, {
      delivery_fee: shipping.data.deliveryFee,
      delivery_time_minutes:
        shipping.data.deliveryTimeMinutes,
      pickup_time_minutes: shipping.data.pickupTimeMinutes,
      payment_methods: accepted.data,
    });
    // Nome, endereço, taxa e prazos aparecem no cardápio público.
    afterMenuChange(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

// Avisos do quadro de pedidos: a seção salva sozinha a cada mudança.
const alertsSchema = z.object({
  lateAfterMinutes: z
    .int()
    .min(5, "Use pelo menos 5 minutos.")
    .max(180, "Use até 180 minutos."),
  sound: z.boolean(),
});

export async function saveOrderAlertsAction(
  input: z.input<typeof alertsSchema>,
): Promise<ActionResult> {
  const parsed = alertsSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const store = await requireStoreForAction();
    await updateOrderAlerts(store.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
