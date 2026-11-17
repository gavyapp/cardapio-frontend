import { findTrackedOrder } from "@/lib/data/order-tracking";
import type { OrderStatusResponse } from "@/lib/orders/open-orders";
import { stoppedAt } from "@/lib/orders/tracking";

/**
 * Status de um pedido pelo token do link, para o cardápio mostrar os
 * pedidos em andamento do cliente. Devolve só o número, o status e a hora
 * da recusa ou do cancelamento.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/pedidos/[token]">,
) {
  const { token } = await params;

  try {
    const order = await findTrackedOrder(token);
    if (!order) return new Response(null, { status: 404 });
    return Response.json(
      {
        number: order.number,
        status: order.status,
        stoppedAt: stoppedAt(order),
      } satisfies OrderStatusResponse,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Erro ao consultar o pedido:", error);
    return new Response(null, { status: 500 });
  }
}
