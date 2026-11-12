import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { CreateOrderResponse } from "@/lib/orders/create-order";

// O banco é simulado: a rota de verdade roda, e só as duas chamadas da
// camada de dados são trocadas. As recusas do create_order em si são
// testadas no banco (supabase/tests/database).
vi.mock("@/lib/data/create-order", () => ({
  registerOrderAttempt: vi.fn(),
  createOrder: vi.fn(),
}));

import {
  createOrder,
  registerOrderAttempt,
} from "@/lib/data/create-order";

import { POST } from "./route";

const register = vi.mocked(registerOrderAttempt);
const create = vi.mocked(createOrder);

const STORE = "5a000000-0000-4000-8000-000000000001";
const BURGER = "9a000000-0000-4000-8000-000000000001";
const FRIES = "9a000000-0000-4000-8000-000000000002";
const BACON = "7a000000-0000-4000-8000-000000000001";

const validOrder = {
  storeId: STORE,
  mode: "RETIRADA",
  customer: { name: "Ana Lima", phone: "(48) 99999-0000" },
  paymentMethod: "PIX",
  items: [
    {
      productId: BURGER,
      quantity: 1,
      complements: [{ complementId: BACON, quantity: 1 }],
    },
    { productId: FRIES, quantity: 2 },
    { productId: BURGER, quantity: 1 },
  ],
};

function post(
  body: unknown,
  headers: Record<string, string> = {},
) {
  return POST(
    new Request("http://localhost/api/pedidos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body:
        typeof body === "string"
          ? body
          : JSON.stringify(body),
    }),
  );
}

async function json(response: Response) {
  return (await response.json()) as CreateOrderResponse;
}

function refusal(
  hint: string,
  detail: string | null = null,
) {
  create.mockResolvedValue({ ok: false, hint, detail });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  register.mockResolvedValue(true);
  create.mockResolvedValue({
    ok: true,
    order: {
      number: 1047,
      publicToken: "abc123",
      subtotal: 36,
      deliveryFee: 0,
      discount: 0,
      total: 36,
    },
  });
});

describe("POST /api/pedidos", () => {
  it("pedido válido → 201 com número e public_token", async () => {
    const response = await post(validOrder);

    expect(response.status).toBe(201);
    expect(await json(response)).toEqual({
      ok: true,
      order: {
        number: 1047,
        publicToken: "abc123",
        subtotal: 36,
        deliveryFee: 0,
        discount: 0,
        total: 36,
      },
    });
  });

  it("repassa ao banco só ids e quantidades, com o telefone em dígitos", async () => {
    await post(validOrder);

    const input = create.mock.calls[0][0];
    expect(input.customer.phone).toBe("48999990000");
    expect(input.items[1]).toEqual({
      productId: FRIES,
      quantity: 2,
      complements: [],
    });
    // Nada de preço ou total vindo do navegador.
    expect(JSON.stringify(input)).not.toMatch(
      /price|total|subtotal/i,
    );
  });

  it("ignora preço e total mandados pelo navegador", async () => {
    await post({
      ...validOrder,
      total: 0.01,
      items: [
        { productId: BURGER, quantity: 1, price: 0.01 },
      ],
    });

    expect(
      JSON.stringify(create.mock.calls[0][0]),
    ).not.toContain("0.01");
  });

  describe("recusas do banco, cada uma com o código certo", () => {
    it("loja fechada → 409 store_closed", async () => {
      refusal("store_closed");
      const response = await post(validOrder);

      expect(response.status).toBe(409);
      expect(await json(response)).toMatchObject({
        ok: false,
        error: {
          code: "store_closed",
          message: "A loja está fechada agora.",
        },
      });
    });

    it("item esgotado → 409 item_unavailable com as posições do item", async () => {
      refusal("item_unavailable", BURGER);
      const response = await post(validOrder);

      expect(response.status).toBe(409);
      expect(await json(response)).toMatchObject({
        ok: false,
        // O Burger aparece na primeira e na terceira posição do pedido.
        error: {
          code: "item_unavailable",
          itemIndexes: [0, 2],
        },
      });
    });

    it("grupo inválido → 409 invalid_complement com as posições do item", async () => {
      refusal("invalid_complement", BURGER);
      const response = await post(validOrder);

      expect(response.status).toBe(409);
      expect(await json(response)).toMatchObject({
        ok: false,
        error: {
          code: "invalid_complement",
          itemIndexes: [0, 2],
        },
      });
    });

    it("pedido abaixo do mínimo → 409 minimum_order", async () => {
      refusal("minimum_order");
      const response = await post(validOrder);

      expect(response.status).toBe(409);
      expect(await json(response)).toMatchObject({
        ok: false,
        error: { code: "minimum_order" },
      });
    });

    it("forma de pagamento não aceita → 409 payment_not_accepted", async () => {
      refusal("payment_not_accepted");
      const response = await post(validOrder);

      expect(response.status).toBe(409);
      expect((await json(response)).ok).toBe(false);
    });

    it("troco menor que o total → 409 invalid_change", async () => {
      refusal("invalid_change");
      const response = await post(validOrder);

      expect(response.status).toBe(409);
      expect(await json(response)).toMatchObject({
        error: { code: "invalid_change" },
      });
    });

    it("loja inexistente → 404 store_unavailable", async () => {
      refusal("store_unavailable");
      expect((await post(validOrder)).status).toBe(404);
    });

    it("recusa sem código conhecido → 500, sem vazar o detalhe", async () => {
      refusal("algo_novo", "segredo interno");
      const response = await post(validOrder);
      const body = await response.text();

      expect(response.status).toBe(500);
      expect(body).toContain("unexpected");
      expect(body).not.toContain("segredo interno");
    });
  });

  describe("limite de tentativas", () => {
    it("excesso de requisições → 429, sem criar pedido", async () => {
      register.mockResolvedValue(false);
      const response = await post(validOrder);

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe(
        "600",
      );
      expect(await json(response)).toMatchObject({
        ok: false,
        error: { code: "rate_limited" },
      });
      expect(create).not.toHaveBeenCalled();
    });

    it("conta pelo IP de x-forwarded-for e pelo telefone do pedido", async () => {
      await post(validOrder, {
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      });

      expect(register).toHaveBeenCalledWith({
        ip: "203.0.113.7",
        phone: "48999990000",
      });
    });

    it("entrada inválida não gasta tentativa", async () => {
      await post({ ...validOrder, items: [] });
      expect(register).not.toHaveBeenCalled();
    });
  });

  describe("validação da entrada", () => {
    it("corpo que não é JSON → 400 invalid_request", async () => {
      const response = await post("{quebrado");

      expect(response.status).toBe(400);
      expect(await json(response)).toMatchObject({
        error: { code: "invalid_request" },
      });
      expect(create).not.toHaveBeenCalled();
    });

    it("erros por campo: telefone curto e pedido vazio", async () => {
      const response = await post({
        ...validOrder,
        customer: { name: "Ana", phone: "9999" },
        items: [],
      });

      expect(response.status).toBe(400);
      expect(await json(response)).toMatchObject({
        ok: false,
        error: {
          code: "invalid_request",
          fields: {
            "customer.phone": "Informe o celular com DDD.",
            items: "O pedido está vazio.",
          },
        },
      });
    });

    it("entrega sem endereço → 400 com o campo address", async () => {
      const response = await post({
        ...validOrder,
        mode: "ENTREGA",
      });

      expect(response.status).toBe(400);
      expect(await json(response)).toMatchObject({
        error: {
          fields: {
            address: "Informe o endereço de entrega.",
          },
        },
      });
    });

    it("entrega com endereço passa; retirada descarta o endereço", async () => {
      const address = {
        street: "Rua A",
        number: "10",
        district: "Centro",
      };

      await post({
        ...validOrder,
        mode: "ENTREGA",
        address,
      });
      expect(create.mock.calls[0][0].address).toEqual(
        address,
      );

      await post({
        ...validOrder,
        mode: "RETIRADA",
        address,
      });
      expect(
        create.mock.calls[1][0].address,
      ).toBeUndefined();
    });

    it("troco só vale com dinheiro", async () => {
      await post({ ...validOrder, changeFor: 50 });
      expect(
        create.mock.calls[0][0].changeFor,
      ).toBeUndefined();

      await post({
        ...validOrder,
        paymentMethod: "DINHEIRO",
        changeFor: 50,
      });
      expect(create.mock.calls[1][0].changeFor).toBe(50);
    });

    it("quantidade acima do limite → 400", async () => {
      const response = await post({
        ...validOrder,
        items: [{ productId: BURGER, quantity: 999 }],
      });
      expect(response.status).toBe(400);
    });
  });

  it("erro do banco → 500 genérico, sem vazar a mensagem", async () => {
    create.mockRejectedValue(
      new Error("connection refused at 10.0.0.5"),
    );
    const response = await post(validOrder);
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).toContain("unexpected");
    expect(body).not.toContain("10.0.0.5");
  });

  it("falha ao conferir o limite → 500, sem criar pedido", async () => {
    register.mockRejectedValue(new Error("sem conexão"));
    const response = await post(validOrder);

    expect(response.status).toBe(500);
    expect(create).not.toHaveBeenCalled();
  });
});
