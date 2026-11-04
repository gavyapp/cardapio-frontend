// Mudança de status e de pagamento do pedido pelo painel. As regras ficam
// no banco (update_order_status e set_order_paid); aqui só traduzimos a
// recusa para um código. Usa a sessão do lojista, então passa pelo RLS.
import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import type { Tables } from "@/lib/database.types";
import type { BoardOrder } from "@/lib/orders/board";
import type {
  OrderStatus,
  OrderStatusErrorCode,
} from "@/lib/orders/status";
import { createServerSupabase } from "@/lib/supabase/server";

import { fetchOpenOrders } from "./order-board";

/** O pedido como ficou depois da mudança. */
export type OrderStatusSnapshot = {
  id: string;
  status: OrderStatus;
  isPaid: boolean;
  rejectionReason: string | null;
};

export type OrderStatusResult =
  | { ok: true; order: OrderStatusSnapshot }
  | { ok: false; code: OrderStatusErrorCode };

/**
 * Muda o status. Rejeitar e cancelar pedem `reason`; `paid` marca ou
 * desmarca como pago na mesma operação.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  options: { reason?: string; paid?: boolean } = {},
): Promise<OrderStatusResult> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc(
    "update_order_status",
    {
      p_order_id: orderId,
      p_status: status,
      p_note: options.reason,
      p_is_paid: options.paid,
    },
  );

  if (error)
    return refusal(
      error,
      "Erro ao mudar o status do pedido",
    );
  return { ok: true, order: toSnapshot(data) };
}

/** Marca ou desmarca como pago, em qualquer status, sem mudar o status. */
export async function setOrderPaid(
  orderId: string,
  paid: boolean,
): Promise<OrderStatusResult> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc(
    "set_order_paid",
    {
      p_order_id: orderId,
      p_is_paid: paid,
    },
  );

  if (error)
    return refusal(
      error,
      "Erro ao marcar o pagamento do pedido",
    );
  return { ok: true, order: toSnapshot(data) };
}

function toSnapshot(
  row: Tables<"orders">,
): OrderStatusSnapshot {
  return {
    id: row.id,
    status: row.status,
    isPaid: row.is_paid,
    rejectionReason: row.rejection_reason,
  };
}

/** Recusa conhecida vira código; qualquer outro erro sobe. */
function refusal(
  error: PostgrestError,
  context: string,
): { ok: false; code: OrderStatusErrorCode } {
  const code = refusalCode(error);
  if (code) return { ok: false, code };
  throw new Error(`${context}: ${error.message}`);
}

function refusalCode(
  error: PostgrestError,
): OrderStatusErrorCode | null {
  switch (error.code) {
    case "P0002":
      return "order_not_found";
    case "42501":
      return "forbidden";
    case "P0001":
      if (
        error.hint === "invalid_transition" ||
        error.hint === "reason_required"
      ) {
        return error.hint;
      }
      return null;
    default:
      return null;
  }
}

/**
 * Pedidos em aberto da loja, para a primeira tela do quadro, com a hora da
 * leitura (os tempos da primeira tela partem dela).
 */
export async function listOpenOrders(
  storeId: string,
): Promise<{ orders: BoardOrder[]; fetchedAt: number }> {
  const supabase = await createServerSupabase();
  const orders = await fetchOpenOrders(supabase, storeId);
  return { orders, fetchedAt: Date.now() };
}
