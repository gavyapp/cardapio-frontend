// Criação de pedido pelo cliente, sem login: o limite de tentativas e a
// chamada ao create_order. Usado só pela rota POST /api/pedidos.
import "server-only";

import { z } from "zod";

import { orderAttemptKeys } from "@/lib/orders/attempt-keys";
import type {
  CreatedOrder,
  CreateOrderInput,
} from "@/lib/orders/create-order";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createAnonymousSupabase } from "@/lib/supabase/anonymous";

/**
 * Registra a tentativa e diz se ela pode seguir. False quando o IP ou o
 * telefone passou do limite (5 em 10 minutos). Roda com a chave secreta: o
 * visitante não pode chamar essa função do banco.
 */
export async function registerOrderAttempt(origin: {
  ip: string;
  phone: string;
}): Promise<boolean> {
  // O mesmo segredo do servidor embaralha as chaves; ele nunca sai daqui.
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "Variável de ambiente SUPABASE_SECRET_KEY não definida (veja .env.example).",
    );
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase.rpc(
    "register_order_attempt",
    {
      p_keys: orderAttemptKeys(origin, secret),
    },
  );
  if (error) throw error;
  return data === true;
}

export type CreateOrderResult =
  | { ok: true; order: CreatedOrder }
  /** Recusa do create_order: o código vem no HINT e o item no DETAIL. */
  | {
      ok: false;
      hint: string | null;
      detail: string | null;
    };

const createdOrder = z.object({
  number: z.number(),
  public_token: z.string(),
  subtotal: z.number(),
  delivery_fee: z.number(),
  discount: z.number(),
  total: z.number(),
});

/**
 * Cria o pedido como visitante (o create_order confere tudo de novo e
 * calcula os valores). Recusa de regra de negócio volta em `ok: false`;
 * qualquer outro erro sobe.
 */
export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const supabase = createAnonymousSupabase();
  const { data, error } = await supabase.rpc(
    "create_order",
    {
      p_store_id: input.storeId,
      p_mode: input.mode,
      p_customer_name: input.customer.name,
      p_customer_phone: input.customer.phone,
      p_payment_method: input.paymentMethod,
      p_items: input.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        notes: item.notes ?? null,
        complements: item.complements.map((complement) => ({
          complement_id: complement.complementId,
          quantity: complement.quantity,
        })),
      })),
      p_address: input.address,
      p_change_for: input.changeFor,
      p_notes: input.notes,
    },
  );

  if (error) {
    // P0001 é a recusa levantada pelo próprio create_order.
    if (error.code === "P0001") {
      return {
        ok: false,
        hint: error.hint || null,
        detail: error.details || null,
      };
    }
    throw error;
  }

  const order = createdOrder.parse(data);
  return {
    ok: true,
    order: {
      number: order.number,
      publicToken: order.public_token,
      subtotal: order.subtotal,
      deliveryFee: order.delivery_fee,
      discount: order.discount,
      total: order.total,
    },
  };
}
