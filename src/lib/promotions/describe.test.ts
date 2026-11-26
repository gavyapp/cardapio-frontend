import { describe, expect, it } from "vitest";

import {
  automaticName,
  describeRule,
  describeSchedule,
  discountTag,
  promotionalPrice,
} from "./describe";

// formatCurrency separa "R$" com espaço sem quebra.
const money = (text: string) =>
  text.replace(/R\$ /g, "R$\u00a0");

const classic = { id: "c", name: "The Classic", price: 42 };
const bacon = { id: "b", name: "Bacon", price: 30 };

describe("discountTag", () => {
  it("percentual arredondado entre o preço cheio e o promocional", () => {
    expect(discountTag(30, 25)).toBe("−17%");
    expect(discountTag(50, 39.9)).toBe("−20%");
  });
});

describe("promotionalPrice", () => {
  it("aplica os três modos, em centavos", () => {
    expect(
      promotionalPrice(42, { mode: "percent", value: 20 }),
    ).toBe(33.6);
    expect(
      promotionalPrice(42, {
        mode: "amount_off",
        value: 5,
      }),
    ).toBe(37);
    expect(
      promotionalPrice(42, {
        mode: "fixed_price",
        value: 37,
      }),
    ).toBe(37);
  });

  it("arredonda meio para cima, como o banco", () => {
    // 9,99 × 0,85 = 8,4915 → 8,49; 0,15 × 0,5 = 0,075 → 0,08
    expect(
      promotionalPrice(9.99, {
        mode: "percent",
        value: 15,
      }),
    ).toBe(8.49);
    expect(
      promotionalPrice(0.15, {
        mode: "percent",
        value: 50,
      }),
    ).toBe(0.08);
  });

  it("não vale quando não baixa o preço ou zera", () => {
    expect(
      promotionalPrice(42, {
        mode: "fixed_price",
        value: 42,
      }),
    ).toBeNull();
    expect(
      promotionalPrice(5, { mode: "amount_off", value: 5 }),
    ).toBeNull();
  });
});

describe("describeRule", () => {
  it("um produto mostra o preço de e para", () => {
    expect(
      describeRule(
        {
          kind: "product_discount",
          rule: { mode: "fixed_price", value: 37 },
        },
        [classic],
      ),
    ).toBe(
      money("The Classic: R$ 42,00 → R$ 37,00 (−12%)"),
    );
  });

  it("vários produtos mostram o desconto", () => {
    expect(
      describeRule(
        {
          kind: "product_discount",
          rule: { mode: "percent", value: 20 },
        },
        [classic, bacon],
      ),
    ).toBe("2 produtos · 20% de desconto");
  });

  it("promoções de pedido", () => {
    expect(
      describeRule(
        {
          kind: "free_delivery",
          rule: { min_subtotal: 70 },
        },
        [],
      ),
    ).toBe(money("Pedidos com entrega acima de R$ 70,00"));
    expect(
      describeRule(
        {
          kind: "free_delivery",
          rule: { min_subtotal: 0 },
        },
        [],
      ),
    ).toBe("Todos os pedidos com entrega");
    expect(
      describeRule(
        {
          kind: "order_discount",
          rule: {
            min_subtotal: 100,
            mode: "amount_off",
            value: 10,
          },
        },
        [],
      ),
    ).toBe(
      money(
        "R$ 10,00 de desconto em pedidos acima de R$ 100,00",
      ),
    );
  });
});

describe("describeSchedule", () => {
  it("mostra os dias de segunda a domingo", () => {
    expect(
      describeSchedule({
        type: "weekly",
        weekdays: [0, 5, 6],
      }),
    ).toBe("Sex, Sáb e Dom");
    expect(
      describeSchedule({
        type: "weekly",
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        from: "08:00",
        to: "11:30",
      }),
    ).toBe("Todos os dias, 08h às 11h30");
  });

  it("sempre e entre datas", () => {
    expect(describeSchedule({ type: "always" })).toBe(
      "Sempre",
    );
    expect(
      describeSchedule({
        type: "dates",
        start: "2026-12-01",
        end: "2026-12-24",
      }),
    ).toBe("De 01/12 a 24/12");
  });
});

describe("automaticName", () => {
  it("promoções de pedido", () => {
    expect(
      automaticName(
        { kind: "free_delivery", minSubtotal: 70 },
        [],
      ),
    ).toBe(money("Entrega grátis acima de R$ 70"));
    expect(
      automaticName(
        { kind: "free_delivery", minSubtotal: null },
        [],
      ),
    ).toBe("Entrega grátis");
    expect(
      automaticName(
        {
          kind: "order_discount",
          minSubtotal: 100,
          mode: "amount_off",
          value: 10,
        },
        [],
      ),
    ).toBe(money("R$ 10 off em pedidos acima de R$ 100"));
  });

  it("produto único usa o selo do desconto", () => {
    expect(
      automaticName(
        {
          kind: "product_discount",
          mode: "fixed_price",
          value: 37,
        },
        [classic],
      ),
    ).toBe("The Classic −12%");
    expect(
      automaticName(
        {
          kind: "product_discount",
          mode: "percent",
          value: 20,
        },
        [classic, bacon],
      ),
    ).toBe("2 produtos −20%");
    expect(
      automaticName(
        {
          kind: "product_discount",
          mode: "percent",
          value: null,
        },
        [],
      ),
    ).toBe("Desconto em produtos");
  });
});
