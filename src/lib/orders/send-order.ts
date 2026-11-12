// Envio do pedido pelo navegador para POST /api/pedidos.
import {
  CREATE_ORDER_PATH,
  type CreateOrderRequest,
  type CreateOrderResponse,
} from "./create-order";

const CONNECTION_ERROR: CreateOrderResponse = {
  ok: false,
  error: {
    code: "unexpected",
    message:
      "Não foi possível enviar o pedido. Confira sua conexão e tente de novo.",
  },
};

/**
 * Envia o pedido e devolve a resposta da rota. Falha de rede ou resposta
 * que não é da rota vira o erro genérico, nunca exceção.
 */
export async function sendOrder(
  request: CreateOrderRequest,
  send: typeof fetch = fetch,
): Promise<CreateOrderResponse> {
  try {
    const response = await send(CREATE_ORDER_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "ok" in body &&
      typeof body.ok === "boolean"
    ) {
      return body as CreateOrderResponse;
    }
    return CONNECTION_ERROR;
  } catch {
    return CONNECTION_ERROR;
  }
}
