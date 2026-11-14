import { findTrackedOrder } from "@/lib/data/order-tracking";
import type { OrderStatusResponse } from "@/lib/orders/open-orders";

/**
 * Status de um pedido pelo token do link, para o cardápio mostrar os
 * pedidos em andamento do cliente. Devolve só o número e o status.
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
      } satisfies OrderStatusResponse,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Erro ao consultar o pedido:", error);
    return new Response(null, { status: 500 });
  }
}
