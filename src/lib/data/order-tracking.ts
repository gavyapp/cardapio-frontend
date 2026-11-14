// Pedido do cliente pelo link de acompanhamento (public_token), sem login.
import "server-only";

import {
  isOrderToken,
  parseTrackedOrder,
  type TrackedOrder,
} from "@/lib/orders/tracking";
import { createAnonymousSupabase } from "@/lib/supabase/anonymous";

/**
 * Pedido pelo token do link. Null se o token não tem o formato esperado ou
 * não há pedido com ele. Sem cache: o status muda a qualquer momento.
 */
export async function findTrackedOrder(
  token: string,
): Promise<TrackedOrder | null> {
  if (!isOrderToken(token)) return null;

  const supabase = createAnonymousSupabase();
  const { data, error } = await supabase.rpc(
    "get_order_by_token",
    { p_token: token },
  );
  if (error) throw error;
  return parseTrackedOrder(data);
}
