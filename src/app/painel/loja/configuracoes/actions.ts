"use server";

import { z } from "zod";

import { updateOrderAlerts } from "@/lib/data/order-alerts";
import {
  errorMessage,
  validationError,
  type ActionResult,
} from "@/lib/panel/action-result";
import { requireStoreForAction } from "@/lib/panel/access";

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
