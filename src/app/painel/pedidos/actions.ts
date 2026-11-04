"use server";

import { z } from "zod";

import { updateOrderStatus } from "@/lib/data/orders";
import { ORDER_STATUS_ERROR_MESSAGES } from "@/lib/orders/status";
import {
  errorMessage,
  type ActionResult,
} from "@/lib/panel/action-result";
import { requireStoreForAction } from "@/lib/panel/access";

// Só os passos do botão principal do card; rejeitar e cancelar pedem motivo
// e ficam no detalhe do pedido.
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
    if (!result.ok) {
      return {
        ok: false,
        error: ORDER_STATUS_ERROR_MESSAGES[result.code],
      };
    }
    return { ok: true };
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
