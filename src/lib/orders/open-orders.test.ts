import { describe, expect, it, vi } from "vitest";

import {
  forgetOrders,
  lookUpOrderStatus,
  orderShortcut,
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

describe("orderShortcut", () => {
  const now = new Date("2026-11-16T22:00:00Z");
  const hoursAgo = (hours: number) =>
    new Date(
      now.getTime() - hours * 3_600_000,
    ).toISOString();

  it("pedido em andamento → rótulo do status", () => {
    for (const [status, label] of [
      ["RECEBIDO", "Novo"],
      ["EM_PREPARO", "Em preparo"],
      ["PRONTO", "Pronto"],
      ["A_CAMINHO", "Saiu para entrega"],
    ] as const) {
      expect(
        orderShortcut({ status, stoppedAt: null }, now),
      ).toEqual({ label, stopped: false });
    }
  });

  it("cancelado ou recusado há pouco → continua, em destaque, para ver o motivo", () => {
    expect(
      orderShortcut(
        { status: "CANCELADO", stoppedAt: hoursAgo(1) },
        now,
      ),
    ).toEqual({ label: "Cancelado", stopped: true });
    expect(
      orderShortcut(
        { status: "REJEITADO", stoppedAt: hoursAgo(3.9) },
        now,
      ),
    ).toEqual({ label: "Recusado", stopped: true });
  });

  it("cancelado há 4 horas ou mais → sai da lista", () => {
    expect(
      orderShortcut(
        { status: "CANCELADO", stoppedAt: hoursAgo(4) },
        now,
      ),
    ).toBeNull();
    expect(
      orderShortcut(
        { status: "REJEITADO", stoppedAt: hoursAgo(30) },
        now,
      ),
    ).toBeNull();
  });

  it("cancelado sem hora conhecida ou com hora inválida → sai da lista", () => {
    expect(
      orderShortcut(
        { status: "CANCELADO", stoppedAt: null },
        now,
      ),
    ).toBeNull();
    expect(
      orderShortcut(
        { status: "CANCELADO", stoppedAt: "ontem" },
        now,
      ),
    ).toBeNull();
  });

  it("concluído → sai da lista na hora", () => {
    expect(
      orderShortcut(
        { status: "CONCLUIDO", stoppedAt: null },
        now,
      ),
    ).toBeNull();
  });
});

describe("lookUpOrderStatus", () => {
  it("pedido encontrado → número e status", async () => {
    const send = vi.fn(async () =>
      Response.json({
        number: 1048,
        status: "EM_PREPARO",
        stoppedAt: null,
      }),
    );
    expect(
      await lookUpOrderStatus(token("a"), send),
    ).toEqual({
      found: true,
      order: {
        number: 1048,
        status: "EM_PREPARO",
        stoppedAt: null,
      },
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
