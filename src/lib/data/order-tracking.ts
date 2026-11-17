// Pedido do cliente pelo link de acompanhamento (public_token), sem login.
import "server-only";

import {
  isOrderToken,
  parseTrackedOrder,
  type TrackedOrderLookup,
} from "@/lib/orders/tracking";
import { createAnonymousSupabase } from "@/lib/supabase/anonymous";

/**
 * Pedido pelo token do link: encontrado, com o link vencido (encerrou há
 * mais de 4 horas) ou inexistente, que inclui o token fora do formato. Sem
 * cache: o status muda a qualquer momento.
 */
export async function findTrackedOrder(
  token: string,
): Promise<TrackedOrderLookup> {
  if (!isOrderToken(token)) return { state: "missing" };

  const supabase = createAnonymousSupabase();
  const { data, error } = await supabase.rpc(
    "get_order_by_token",
    { p_token: token },
  );
  if (error) throw error;
  return parseTrackedOrder(data);
}
