import { describe, expect, it } from "vitest";

import {
  parsePromotionFormat,
  readPromotion,
} from "./promotions";

const always = { type: "always" };

function accepts(
  kind: string,
  rule: unknown,
  schedule: unknown = always,
) {
  return parsePromotionFormat({ kind, rule, schedule })
    .success;
}

describe("regra da promoção", () => {
  it("aceita os três modos do desconto em produtos", () => {
    expect(
      accepts("product_discount", {
        mode: "percent",
        value: 12.5,
      }),
    ).toBe(true);
    expect(
      accepts("product_discount", {
        mode: "amount_off",
        value: 5,
      }),
    ).toBe(true);
    expect(
      accepts("product_discount", {
        mode: "fixed_price",
        value: 37,
      }),
    ).toBe(true);
  });

  it("recusa desconto em produtos fora do formato", () => {
    expect(
      accepts("product_discount", {
        mode: "percent",
        value: 100,
      }),
    ).toBe(false);
    expect(
      accepts("product_discount", {
        mode: "percent",
        value: 0,
      }),
    ).toBe(false);
    expect(
      accepts("product_discount", {
        mode: "amount_off",
        value: 1.234,
      }),
    ).toBe(false);
    expect(
      accepts("product_discount", {
        mode: "amount_off",
        value: "5",
      }),
    ).toBe(false);
    expect(
      accepts("product_discount", {
        mode: "percent",
        value: 10,
        min_subtotal: 5,
      }),
    ).toBe(false);
    expect(accepts("product_discount", {})).toBe(false);
  });

  it("entrega grátis aceita mínimo zero e recusa negativo", () => {
    expect(
      accepts("free_delivery", { min_subtotal: 0 }),
    ).toBe(true);
    expect(
      accepts("free_delivery", { min_subtotal: 70 }),
    ).toBe(true);
    expect(
      accepts("free_delivery", { min_subtotal: -1 }),
    ).toBe(false);
    expect(accepts("free_delivery", {})).toBe(false);
  });

  it("desconto no pedido precisa de mínimo e desconto menor que ele", () => {
    expect(
      accepts("order_discount", {
        min_subtotal: 100,
        mode: "amount_off",
        value: 10,
      }),
    ).toBe(true);
    expect(
      accepts("order_discount", {
        min_subtotal: 80,
        mode: "percent",
        value: 10,
      }),
    ).toBe(true);
    expect(
      accepts("order_discount", {
        min_subtotal: 0,
        mode: "percent",
        value: 10,
      }),
    ).toBe(false);
    expect(
      accepts("order_discount", {
        min_subtotal: 50,
        mode: "amount_off",
        value: 50,
      }),
    ).toBe(false);
    expect(
      accepts("order_discount", {
        min_subtotal: 50,
        mode: "fixed_price",
        value: 30,
      }),
    ).toBe(false);
  });

  it("recusa tipo desconhecido", () => {
    expect(
      accepts("coupon", { mode: "percent", value: 10 }),
    ).toBe(false);
  });

  it("explica o erro em português", () => {
    const result = parsePromotionFormat({
      kind: "product_discount",
      rule: { mode: "percent", value: 120 },
      schedule: always,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "O desconto em % precisa ser menor que 100.",
    );
  });
});

describe("período da promoção", () => {
  const rule = { mode: "percent", value: 10 };
  const schedule = (s: unknown) =>
    accepts("product_discount", rule, s);

  it("aceita sempre, dias e horários e entre datas", () => {
    expect(schedule(always)).toBe(true);
    expect(
      schedule({ type: "weekly", weekdays: [5, 6, 0] }),
    ).toBe(true);
    expect(
      schedule({
        type: "weekly",
        weekdays: [1],
        from: "18:00",
        to: "20:00",
      }),
    ).toBe(true);
    expect(
      schedule({
        type: "dates",
        start: "2026-12-24",
        end: "2026-12-24",
      }),
    ).toBe(true);
  });

  it("recusa semana fora do formato", () => {
    expect(schedule({ type: "weekly", weekdays: [] })).toBe(
      false,
    );
    expect(
      schedule({ type: "weekly", weekdays: [7] }),
    ).toBe(false);
    expect(
      schedule({ type: "weekly", weekdays: [1, 1] }),
    ).toBe(false);
    expect(
      schedule({
        type: "weekly",
        weekdays: [1],
        from: "18:00",
      }),
    ).toBe(false);
    expect(
      schedule({
        type: "weekly",
        weekdays: [1],
        from: "20:00",
        to: "18:00",
      }),
    ).toBe(false);
    expect(
      schedule({
        type: "weekly",
        weekdays: [1],
        from: "22:00",
        to: "24:00",
      }),
    ).toBe(false);
  });

  it("recusa datas fora do formato", () => {
    expect(
      schedule({
        type: "dates",
        start: "2026-12-24",
        end: "2026-12-01",
      }),
    ).toBe(false);
    expect(
      schedule({
        type: "dates",
        start: "2026-02-30",
        end: "2026-03-01",
      }),
    ).toBe(false);
    expect(
      schedule({ type: "dates", start: "2026-12-01" }),
    ).toBe(false);
    expect(schedule({})).toBe(false);
  });
});

describe("readPromotion", () => {
  it("lê a linha do banco com tipo, regra e período", () => {
    const promotion = readPromotion({
      id: "p1",
      store_id: "s1",
      name: "Combo −12%",
      kind: "product_discount",
      rule: { mode: "fixed_price", value: 37 },
      schedule: { type: "weekly", weekdays: [5, 6, 0] },
      is_active: true,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    });
    expect(promotion).toEqual({
      id: "p1",
      storeId: "s1",
      name: "Combo −12%",
      kind: "product_discount",
      rule: { mode: "fixed_price", value: 37 },
      schedule: { type: "weekly", weekdays: [5, 6, 0] },
      isActive: true,
    });
  });
});
