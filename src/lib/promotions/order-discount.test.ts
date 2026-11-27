import { describe, expect, it } from "vitest";

import {
  bestOrderDiscount,
  orderDiscountAmount,
  orderDiscountLabel,
  type OrderDiscount,
} from "./order-discount";

// Os mesmos descontos do teste do banco (calculo_das_promocoes).
const fifteenOff: OrderDiscount = {
  id: "a",
  name: "R$ 15 off acima de R$ 100",
  minSubtotal: 100,
  mode: "amount_off",
  value: 15,
};
const tenPercent: OrderDiscount = {
  id: "b",
  name: "10% acima de R$ 80",
  minSubtotal: 80,
  mode: "percent",
  value: 10,
};

describe("desconto no pedido", () => {
  it("subtotal abaixo do mínimo → sem desconto", () => {
    expect(orderDiscountAmount(tenPercent, 79.99)).toBe(0);
  });

  it("10% de R$ 81,84 → R$ 8,18 (8,184 arredondado)", () => {
    expect(orderDiscountAmount(tenPercent, 81.84)).toBe(
      8.18,
    );
  });

  it("12,5% de R$ 81,00 → R$ 10,13 (10,125 arredonda para cima)", () => {
    expect(
      orderDiscountAmount(
        { ...tenPercent, value: 12.5 },
        81,
      ),
    ).toBe(10.13);
  });

  it("R$ 101,76 → R$ 15 off vence os 10% (R$ 10,18)", () => {
    expect(
      bestOrderDiscount(101.76, [fifteenOff, tenPercent]),
    ).toEqual({
      id: "a",
      name: fifteenOff.name,
      minSubtotal: fifteenOff.minSubtotal,
      amount: 15,
    });
  });

  it("R$ 81,84 → só os 10% alcançam", () => {
    expect(
      bestOrderDiscount(81.84, [fifteenOff, tenPercent])
        ?.amount,
    ).toBe(8.18);
  });

  it("empate → o criado primeiro (primeiro da lista)", () => {
    const tenOff = { ...fifteenOff, id: "c", value: 10 };
    expect(
      bestOrderDiscount(100, [tenOff, tenPercent])?.id,
    ).toBe("c");
  });

  it("nenhum alcança → null", () => {
    expect(
      bestOrderDiscount(50, [fifteenOff, tenPercent]),
    ).toBeNull();
  });
});

describe("orderDiscountLabel", () => {
  it("diz o mínimo do pedido, como no protótipo", () => {
    expect(orderDiscountLabel(80)).toBe(
      "Desconto (pedidos acima de R$\u00a080,00)",
    );
  });

  it("sem mínimo, fica só Desconto", () => {
    expect(orderDiscountLabel(0)).toBe("Desconto");
  });
});
