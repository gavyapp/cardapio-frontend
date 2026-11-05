"use server";

import { z } from "zod";

import {
  markOrderRead,
  setOrderPaid,
  updateOrderStatus,
  type OrderStatusResult,
} from "@/lib/data/orders";
import { ORDER_STATUS_ERROR_MESSAGES } from "@/lib/orders/status";
import {
  errorMessage,
  validationError,
  type ActionResult,
} from "@/lib/panel/action-result";
import { requireStoreForAction } from "@/lib/panel/access";

// Só os passos do botão principal (card e detalhe); recusar e cancelar pedem
// motivo e têm action própria.
const advanceSchema = z.object({
  orderId: z.uuid(),
  status: z.enum([
    "EM_PREPARO",
    "PRONTO",
    "A_CAMINHO",
    "CONCLUIDO",
  ]),
});

export async function advanceOrderAction(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  const parsed = advanceSchema.safeParse({
    orderId,
    status,
  });
  if (!parsed.success) {
    return { ok: false, error: "Pedido inválido." };
  }
  try {
    await requireStoreForAction();
    const result = await updateOrderStatus(
      parsed.data.orderId,
      parsed.data.status,
    );
    return toActionResult(result);
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(
        error,
        "Não foi possível mudar o status. Tente de novo.",
      ),
    };
  }
}

const closeSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(["REJEITADO", "CANCELADO"]),
  reason: z
    .string()
    .trim()
    .min(1, "Informe o motivo.")
    .max(200, "Use até 200 caracteres no motivo."),
});

/** Recusa (pedido novo) ou cancela (já aceito), sempre com motivo. */
export async function closeOrderAction(
  orderId: string,
  status: string,
  reason: string,
): Promise<ActionResult> {
  const parsed = closeSchema.safeParse({
    orderId,
    status,
    reason,
  });
  if (!parsed.success) return validationError(parsed.error);
  try {
    await requireStoreForAction();
    const result = await updateOrderStatus(
      parsed.data.orderId,
      parsed.data.status,
      { reason: parsed.data.reason },
    );
    return toActionResult(result);
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(
        error,
        "Não foi possível mudar o status. Tente de novo.",
      ),
    };
  }
}

const paidSchema = z.object({
  orderId: z.uuid(),
  paid: z.boolean(),
});

/** Marca ou desmarca como pago, em qualquer status. */
export async function setOrderPaidAction(
  orderId: string,
  paid: boolean,
): Promise<ActionResult> {
  const parsed = paidSchema.safeParse({ orderId, paid });
  if (!parsed.success) {
    return { ok: false, error: "Pedido inválido." };
  }
  try {
    await requireStoreForAction();
    const result = await setOrderPaid(
      parsed.data.orderId,
      parsed.data.paid,
    );
    return toActionResult(result);
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(
        error,
        "Não foi possível marcar o pagamento. Tente de novo.",
      ),
    };
  }
}

/** Primeira leitura do pedido, ao abrir o detalhe. */
export async function markOrderReadAction(
  orderId: string,
): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(orderId);
  if (!parsed.success) {
    return { ok: false, error: "Pedido inválido." };
  }
  try {
    await requireStoreForAction();
    await markOrderRead(parsed.data);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

function toActionResult(
  result: OrderStatusResult,
): ActionResult {
  if (result.ok) return { ok: true };
  return {
    ok: false,
    error: ORDER_STATUS_ERROR_MESSAGES[result.code],
  };
}
