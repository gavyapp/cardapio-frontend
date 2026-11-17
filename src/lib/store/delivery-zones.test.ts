import { describe, expect, it } from "vitest";

import {
  EMPTY_CHECKOUT,
  checkoutTotals,
  prefillCheckout,
  validateCheckout,
  type CheckoutFields,
} from "@/lib/orders/checkout";
import { deliveryFeeLabel } from "@/lib/store/public-info";

import {
  deliveryFeeFor,
  findZoneByName,
  hasDeliveryZones,
  lowestDeliveryFee,
  OTHER_ZONE,
} from "./delivery-zones";

const CENTRO = "2a000000-0000-4000-8000-000000000001";
const VILA = "2a000000-0000-4000-8000-000000000002";
const STORE = "5a000000-0000-4000-8000-000000000001";

const zones = [
  { id: CENTRO, name: "Centro", fee: 4 },
  { id: VILA, name: "Vila Nova", fee: 6 },
];
// Outros locais a R$ 8; entrega grátis a partir de R$ 100.
const rules = {
  deliveryFee: 8,
  deliveryZones: zones,
  freeDeliveryAbove: 100,
};
const singleFee = {
  deliveryFee: 5,
  deliveryZones: [],
  freeDeliveryAbove: null,
};

describe("taxa do bairro", () => {
  it("bairro cadastrado → taxa dele", () => {
    expect(deliveryFeeFor(rules, CENTRO)).toBe(4);
    expect(deliveryFeeFor(rules, VILA)).toBe(6);
  });

  it("outro bairro, sem bairro ou bairro que saiu da lista → taxa de outros locais", () => {
    expect(deliveryFeeFor(rules, OTHER_ZONE)).toBe(8);
    expect(deliveryFeeFor(rules, null)).toBe(8);
    expect(deliveryFeeFor(rules, "apagado")).toBe(8);
  });

  it("loja sem bairros → taxa única", () => {
    expect(hasDeliveryZones(singleFee)).toBe(false);
    expect(deliveryFeeFor(singleFee, CENTRO)).toBe(5);
  });

  it("menor taxa, entre os bairros e outros locais", () => {
    expect(lowestDeliveryFee(rules)).toBe(4);
    expect(
      lowestDeliveryFee({
        deliveryFee: 2,
        deliveryZones: zones,
      }),
    ).toBe(2);
  });

  it("acha o bairro pelo nome, sem acento nem maiúscula", () => {
    expect(findZoneByName(zones, " vila nova ")?.id).toBe(
      VILA,
    );
    expect(findZoneByName(zones, "CENTRO")?.id).toBe(
      CENTRO,
    );
    expect(findZoneByName(zones, "Interior")).toBeNull();
    expect(findZoneByName(zones, "")).toBeNull();
  });
});

describe("taxa no cardápio", () => {
  it("por bairro → a partir da menor", () => {
    expect(deliveryFeeLabel(rules)).toMatch(
      /^A partir de R\$\s4,00$/,
    );
  });

  it("taxa única → o valor, ou grátis", () => {
    expect(deliveryFeeLabel(singleFee)).toMatch(
      /^R\$\s5,00$/,
    );
    expect(
      deliveryFeeLabel({
        deliveryFee: 0,
        deliveryZones: [],
      }),
    ).toBe("Grátis");
  });
});

describe("totais do checkout por bairro", () => {
  it("antes de escolher o bairro → taxa pendente, fora do total", () => {
    expect(
      checkoutTotals(50, rules, "ENTREGA", ""),
    ).toMatchObject({
      deliveryFee: 0,
      isDeliveryFeePending: true,
      total: 50,
    });
  });

  it("bairro escolhido → taxa dele no total", () => {
    expect(
      checkoutTotals(50, rules, "ENTREGA", VILA),
    ).toMatchObject({
      deliveryFee: 6,
      isDeliveryFeePending: false,
      total: 56,
    });
  });

  it("outro bairro → taxa de outros locais", () => {
    expect(
      checkoutTotals(50, rules, "ENTREGA", OTHER_ZONE),
    ).toMatchObject({ deliveryFee: 8, total: 58 });
  });

  it("entrega grátis vale para qualquer bairro", () => {
    expect(
      checkoutTotals(100, rules, "ENTREGA", VILA),
    ).toMatchObject({
      deliveryFee: 0,
      waivedDeliveryFee: 6,
      isDeliveryFeePending: false,
      total: 100,
    });
  });

  it("retirada → sem taxa e nada pendente", () => {
    expect(
      checkoutTotals(50, rules, "RETIRADA", ""),
    ).toMatchObject({
      deliveryFee: 0,
      isDeliveryFeePending: false,
      total: 50,
    });
  });

  it("loja de taxa única → como antes, sem escolher bairro", () => {
    expect(
      checkoutTotals(50, singleFee, "ENTREGA"),
    ).toMatchObject({
      deliveryFee: 5,
      isDeliveryFeePending: false,
      total: 55,
    });
  });
});

describe("validação do checkout por bairro", () => {
  const delivery: CheckoutFields = {
    ...EMPTY_CHECKOUT,
    mode: "ENTREGA",
    name: "Ana Lima",
    phone: "(48) 99999-0000",
    street: "Rua A",
    number: "10",
    paymentMethod: "PIX",
  };
  const order = {
    storeId: STORE,
    items: [],
    total: 50,
    deliveryZones: zones,
  };
  // Carrinho vazio não é o que está em teste: só os erros de bairro contam.
  const zoneErrors = (fields: CheckoutFields) => {
    const result = validateCheckout(fields, order);
    return result.ok
      ? {}
      : {
          zoneId: result.errors.zoneId,
          district: result.errors.district,
        };
  };

  it("sem escolher o bairro → pede o bairro, sem outro erro de bairro", () => {
    expect(zoneErrors(delivery)).toEqual({
      zoneId: "Escolha o bairro.",
      district: undefined,
    });
  });

  it("outro bairro sem o nome → pede o nome", () => {
    expect(
      zoneErrors({ ...delivery, zoneId: OTHER_ZONE }),
    ).toEqual({
      zoneId: undefined,
      district: "Informe o bairro.",
    });
  });

  it("bairro da lista → nenhum erro de bairro", () => {
    expect(
      zoneErrors({ ...delivery, zoneId: CENTRO }),
    ).toEqual({ zoneId: undefined, district: undefined });
  });

  it("retirada → não pede bairro", () => {
    expect(
      zoneErrors({ ...delivery, mode: "RETIRADA" }),
    ).toEqual({ zoneId: undefined, district: undefined });
  });
});

describe("bairro guardado no aparelho", () => {
  const saved = (district: string) => ({
    name: "Ana",
    phone: "(48) 99999-0000",
    address: {
      street: "Rua A",
      number: "10",
      district,
      complement: "",
      reference: "",
    },
  });

  it("nome bate com um da lista → já vem escolhido, com o nome do cadastro", () => {
    expect(
      prefillCheckout(saved("vila nova"), zones),
    ).toMatchObject({
      zoneId: VILA,
      district: "Vila Nova",
    });
  });

  it("nome que não está na lista → outro bairro, com o texto dele", () => {
    expect(
      prefillCheckout(saved("Interior"), zones),
    ).toMatchObject({
      zoneId: OTHER_ZONE,
      district: "Interior",
    });
  });

  it("loja de taxa única → bairro como texto, sem escolha", () => {
    expect(prefillCheckout(saved("Centro"))).toMatchObject({
      zoneId: "",
      district: "Centro",
    });
  });
});
