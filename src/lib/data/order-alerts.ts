// Avisos do quadro de pedidos, guardados em stores.settings.order_alerts.
import "server-only";

import type { OrderAlerts } from "@/lib/orders/board";
import { createServerSupabase } from "@/lib/supabase/server";

import {
  orderAlertsSchema,
  readOrderAlerts,
} from "./store-settings";

/** Avisos da loja com os padrões aplicados. */
export async function findOrderAlerts(
  storeId: string,
): Promise<OrderAlerts> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", storeId)
    .single();

  if (error) throw error;
  return readOrderAlerts(data.settings);
}

/**
 * Grava os avisos sem mexer nas outras chaves de settings. Os avisos passam
 * pelo schema zod antes de gravar.
 */
export async function updateOrderAlerts(
  storeId: string,
  alerts: OrderAlerts,
): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", storeId)
    .single();
  if (error) throw error;

  const current =
    data.settings &&
    typeof data.settings === "object" &&
    !Array.isArray(data.settings)
      ? data.settings
      : {};
  const settings = {
    ...current,
    order_alerts: orderAlertsSchema.parse({
      late_after_minutes: alerts.lateAfterMinutes,
      sound: alerts.sound,
    }),
  };

  const { error: updateError } = await supabase
    .from("stores")
    .update({ settings })
    .eq("id", storeId);
  if (updateError) throw updateError;
}
