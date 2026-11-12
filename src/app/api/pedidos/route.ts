import {
  createOrder,
  registerOrderAttempt,
} from "@/lib/data/create-order";
import { clientIp } from "@/lib/orders/attempt-keys";
import {
  createOrderError,
  createOrderSchema,
  fieldErrors,
  refusalFromDatabase,
  type CreateOrderResponse,
} from "@/lib/orders/create-order";

// Janela do limite de tentativas, para o cabeçalho Retry-After.
const RETRY_AFTER_SECONDS = 600;

function respond(
  {
    status,
    body,
  }: { status: number; body: CreateOrderResponse },
  headers?: HeadersInit,
) {
  return Response.json(body, { status, headers });
}

/**
 * Cria um pedido do cardápio público. Valida a entrada, confere o limite de
 * tentativas por IP e por telefone e só então chama o create_order, que
 * calcula os valores. Recusas voltam com código (ver o contrato em
 * src/lib/orders/create-order.ts).
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return respond(createOrderError("invalid_request"));
  }

  const parsed = createOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return respond(
      createOrderError("invalid_request", {
        fields: fieldErrors(parsed.error),
      }),
    );
  }
  const input = parsed.data;

  try {
    const allowed = await registerOrderAttempt({
      ip: clientIp(request.headers),
      phone: input.customer.phone,
    });
    if (!allowed) {
      return respond(createOrderError("rate_limited"), {
        "Retry-After": String(RETRY_AFTER_SECONDS),
      });
    }

    const result = await createOrder(input);
    if (result.ok) {
      return Response.json(
        {
          ok: true,
          order: result.order,
        } satisfies CreateOrderResponse,
        { status: 201 },
      );
    }

    const refusal = refusalFromDatabase(
      result,
      input.items,
    );
    if (!refusal) {
      throw new Error(
        `create_order recusou sem código conhecido (hint: ${result.hint})`,
      );
    }
    return respond(
      createOrderError(refusal.code, {
        itemIndexes: refusal.itemIndexes,
      }),
    );
  } catch (error) {
    // O detalhe fica no log do servidor; o cliente recebe só o genérico.
    console.error("Erro ao criar pedido:", error);
    return respond(createOrderError("unexpected"));
  }
}
