import { describe, expect, it, vi } from "vitest";

import {
  forgetOrders,
  lookUpOrderStatus,
  openOrderLabel,
  parseRememberedOrders,
  rememberOrder,
} from "./open-orders";

const token = (letter: string) => letter.repeat(32);

describe("pedidos guardados no aparelho", () => {
  it("pedido enviado → entra na frente da lista", () => {
    const first = rememberOrder([], {
      token: token("a"),
      number: 1047,
    });
    const second = rememberOrder(first, {
      token: token("b"),
      number: 1048,
    });
    expect(second.map((order) => order.number)).toEqual([
      1048, 1047,
    ]);
  });

  it("mesmo pedido de novo → não duplica", () => {
    const order = { token: token("a"), number: 1047 };
    expect(rememberOrder([order], order)).toEqual([order]);
  });

  it("guarda no máximo cinco; o mais antigo sai", () => {
    let orders = parseRememberedOrders(null);
    for (const [index, letter] of [..."abcdef"].entries()) {
      orders = rememberOrder(orders, {
        token: token(letter),
        number: index + 1,
      });
    }
    expect(orders.map((order) => order.number)).toEqual([
      6, 5, 4, 3, 2,
    ]);
  });

  it("pedido encerrado → sai da lista", () => {
    const orders = [
      { token: token("a"), number: 1 },
      { token: token("b"), number: 2 },
    ];
    expect(forgetOrders(orders, [token("a")])).toEqual([
      { token: token("b"), number: 2 },
    ]);
  });

  it("guardado e lido de volta; conteúdo estragado → lista vazia", () => {
    const orders = [{ token: token("a"), number: 1047 }];
    expect(
      parseRememberedOrders(JSON.stringify(orders)),
    ).toEqual(orders);
    expect(parseRememberedOrders("{quebrado")).toEqual([]);
    expect(
      parseRememberedOrders(
        '[{"token":"curto","number":1}]',
      ),
    ).toEqual([]);
  });
});

describe("openOrderLabel", () => {
  it("pedido em andamento → rótulo do status", () => {
    expect(openOrderLabel("RECEBIDO")).toBe("Novo");
    expect(openOrderLabel("EM_PREPARO")).toBe("Em preparo");
    expect(openOrderLabel("PRONTO")).toBe("Pronto");
    expect(openOrderLabel("A_CAMINHO")).toBe(
      "Saiu para entrega",
    );
  });

  it("concluído, recusado ou cancelado → não aparece", () => {
    expect(openOrderLabel("CONCLUIDO")).toBeNull();
    expect(openOrderLabel("REJEITADO")).toBeNull();
    expect(openOrderLabel("CANCELADO")).toBeNull();
  });
});

describe("lookUpOrderStatus", () => {
  it("pedido encontrado → número e status", async () => {
    const send = vi.fn(async () =>
      Response.json({ number: 1048, status: "EM_PREPARO" }),
    );
    expect(
      await lookUpOrderStatus(token("a"), send),
    ).toEqual({
      found: true,
      order: { number: 1048, status: "EM_PREPARO" },
    });
    expect(send).toHaveBeenCalledWith(
      `/api/pedidos/${token("a")}`,
      expect.anything(),
    );
  });

  it("404 → o pedido não existe", async () => {
    const send = vi.fn(
      async () => new Response(null, { status: 404 }),
    );
    expect(
      await lookUpOrderStatus(token("a"), send),
    ).toEqual({ found: false });
  });

  it("erro do servidor ou sem conexão → sem resposta, mantém na lista", async () => {
    const failing = vi.fn(
      async () => new Response(null, { status: 500 }),
    );
    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    for (const send of [failing, offline]) {
      expect(
        await lookUpOrderStatus(token("a"), send),
      ).toEqual({ found: null });
    }
  });
});
