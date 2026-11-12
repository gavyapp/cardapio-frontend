import { describe, expect, it, vi } from "vitest";

import type { CartItem } from "@/lib/catalog/cart";

import {
  EMPTY_CHECKOUT,
  affectedItemKeys,
  checkoutTotals,
  fieldErrorsFromServer,
  orderItemsFrom,
  parseSavedCustomer,
  prefillCheckout,
  rememberCustomer,
  validateCheckout,
  type CheckoutFields,
} from "./checkout";
import { sendOrder } from "./send-order";

const STORE = "5a000000-0000-4000-8000-000000000001";
const BURGER = "9a000000-0000-4000-8000-000000000001";
const FRIES = "9a000000-0000-4000-8000-000000000002";
const BACON = "7a000000-0000-4000-8000-000000000001";
const CHEDDAR = "7a000000-0000-4000-8000-000000000002";

function cartItem(
  key: string,
  productId: string,
  extra: Partial<CartItem> = {},
): CartItem {
  return {
    key,
    product: {
      id: productId,
      name: key,
      description: null,
      price: 20,
      imageUrl: null,
      badges: [],
      isAvailable: true,
      isSuggested: false,
      complementGroups: [],
    },
    selection: {},
    options: [],
    notes: "",
    quantity: 1,
    unitPrice: 20,
    total: 20,
    ...extra,
  };
}

const items = [
  cartItem("burger", BURGER, {
    selection: { extras: [BACON, BACON, CHEDDAR] },
    notes: "sem cebola",
    quantity: 2,
  }),
  cartItem("fries", FRIES),
];

const pickup: CheckoutFields = {
  ...EMPTY_CHECKOUT,
  mode: "RETIRADA",
  name: "Ana Lima",
  phone: "(48) 99999-0000",
  paymentMethod: "PIX",
};

const delivery: CheckoutFields = {
  ...pickup,
  mode: "ENTREGA",
  street: "Rua A",
  number: "10",
  district: "Centro",
};

const order = { storeId: STORE, items, total: 60 };

describe("checkoutTotals", () => {
  const rules = { deliveryFee: 6, freeDeliveryAbove: 80 };

  it("entrega → soma a taxa", () => {
    expect(checkoutTotals(50, rules, "ENTREGA")).toEqual({
      subtotal: 50,
      deliveryFee: 6,
      waivedDeliveryFee: null,
      discount: 0,
      total: 56,
    });
  });

  it("retirada → sem taxa", () => {
    expect(
      checkoutTotals(50, rules, "RETIRADA"),
    ).toMatchObject({
      deliveryFee: 0,
      waivedDeliveryFee: null,
      total: 50,
    });
  });

  it("entrega grátis atingida → taxa zerada, com o valor que deixou de ser cobrado", () => {
    expect(
      checkoutTotals(80, rules, "ENTREGA"),
    ).toMatchObject({
      deliveryFee: 0,
      waivedDeliveryFee: 6,
      total: 80,
    });
  });
});

describe("orderItemsFrom", () => {
  it("manda só ids e quantidades, juntando a opção repetida", () => {
    expect(orderItemsFrom(items)).toEqual([
      {
        productId: BURGER,
        quantity: 2,
        notes: "sem cebola",
        complements: [
          { complementId: BACON, quantity: 2 },
          { complementId: CHEDDAR, quantity: 1 },
        ],
      },
      {
        productId: FRIES,
        quantity: 1,
        notes: undefined,
        complements: [],
      },
    ]);
  });
});

describe("validateCheckout", () => {
  it("sem forma de pagamento escolhida → não envia", () => {
    const result = validateCheckout(
      { ...pickup, paymentMethod: null },
      order,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        paymentMethod: "Escolha a forma de pagamento.",
      },
    });
  });

  it("retirada não pede endereço", () => {
    const result = validateCheckout(pickup, order);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.address).toBeUndefined();
      expect(result.request.mode).toBe("RETIRADA");
    }
  });

  it("entrega sem endereço → erro em rua, número e bairro", () => {
    const result = validateCheckout(
      { ...pickup, mode: "ENTREGA" },
      order,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        street: "Informe a rua.",
        number: "Informe o número.",
        district: "Informe o bairro.",
      },
    });
  });

  it("entrega completa → pedido com o endereço", () => {
    const result = validateCheckout(
      {
        ...delivery,
        complement: "Apto 2",
        reference: "",
      },
      order,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.address).toMatchObject({
        street: "Rua A",
        number: "10",
        district: "Centro",
        complement: "Apto 2",
      });
    }
  });

  it("nome vazio e celular curto → erro em cada campo", () => {
    const result = validateCheckout(
      { ...pickup, name: " ", phone: "(48) 9999" },
      order,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        name: "Informe seu nome.",
        phone: "Informe o celular com DDD.",
      },
    });
  });

  describe("troco", () => {
    const cash: CheckoutFields = {
      ...pickup,
      paymentMethod: "DINHEIRO",
    };

    it("menor que o total → recusado no campo", () => {
      const result = validateCheckout(
        { ...cash, changeFor: "50,00" },
        order,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(Object.keys(result.errors)).toEqual([
          "changeFor",
        ]);
        expect(result.errors.changeFor).toContain("60,00");
      }
    });

    it("igual ou maior que o total → vai no pedido", () => {
      for (const [typed, value] of [
        ["60,00", 60],
        ["100,00", 100],
      ] as const) {
        const result = validateCheckout(
          { ...cash, changeFor: typed },
          order,
        );
        expect(result.ok).toBe(true);
        if (result.ok)
          expect(result.request.changeFor).toBe(value);
      }
    });

    it("em branco → sem troco", () => {
      const result = validateCheckout(cash, order);
      expect(result.ok).toBe(true);
      if (result.ok)
        expect(result.request.changeFor).toBeUndefined();
    });

    it("troco digitado e depois outra forma de pagamento → ignorado", () => {
      const result = validateCheckout(
        { ...pickup, changeFor: "5,00" },
        order,
      );
      expect(result.ok).toBe(true);
      if (result.ok)
        expect(result.request.changeFor).toBeUndefined();
    });
  });
});

describe("recusa da rota", () => {
  it("erros por campo da rota → campos do formulário", () => {
    expect(
      fieldErrorsFromServer({
        code: "invalid_request",
        message: "Confira os dados do pedido.",
        fields: {
          "customer.phone": "Informe o celular com DDD.",
          address: "Informe o endereço de entrega.",
          items: "O pedido está vazio.",
        },
      }),
    ).toEqual({
      phone: "Informe o celular com DDD.",
      street: "Informe o endereço de entrega.",
    });
  });

  it("troco recusado e pagamento não aceito → no campo de cada um", () => {
    expect(
      fieldErrorsFromServer({
        code: "invalid_change",
        message: "troco",
      }),
    ).toEqual({ changeFor: "troco" });
    expect(
      fieldErrorsFromServer({
        code: "payment_not_accepted",
        message: "pagamento",
      }),
    ).toEqual({ paymentMethod: "pagamento" });
  });

  it("recusa do pedido inteiro → nenhum campo", () => {
    expect(
      fieldErrorsFromServer({
        code: "store_closed",
        message: "fechada",
      }),
    ).toEqual({});
  });

  it("item recusado → chave do item no carrinho", () => {
    expect(
      affectedItemKeys(
        {
          code: "item_unavailable",
          message: "x",
          itemIndexes: [1, 7],
        },
        items,
      ),
    ).toEqual(["fries"]);
  });
});

describe("dados guardados no aparelho", () => {
  it("primeiro pedido de entrega → guarda nome, celular e endereço", () => {
    expect(rememberCustomer(null, delivery)).toEqual({
      name: "Ana Lima",
      phone: "(48) 99999-0000",
      address: {
        street: "Rua A",
        number: "10",
        district: "Centro",
        complement: "",
        reference: "",
      },
    });
  });

  it("pedido de retirada → mantém o endereço da última entrega", () => {
    const first = rememberCustomer(null, delivery);
    const second = rememberCustomer(first, {
      ...pickup,
      name: "Ana L.",
    });
    expect(second.name).toBe("Ana L.");
    expect(second.address).toEqual(first.address);
  });

  it("segundo pedido → formulário preenchido, sem pagamento marcado", () => {
    const saved = parseSavedCustomer(
      JSON.stringify(rememberCustomer(null, delivery)),
    );
    expect(prefillCheckout(saved)).toEqual({
      ...EMPTY_CHECKOUT,
      name: "Ana Lima",
      phone: "(48) 99999-0000",
      street: "Rua A",
      number: "10",
      district: "Centro",
    });
  });

  it("nada guardado ou conteúdo estragado → formulário vazio", () => {
    expect(parseSavedCustomer(null)).toBeNull();
    expect(parseSavedCustomer("{quebrado")).toBeNull();
    expect(parseSavedCustomer('{"name":1}')).toBeNull();
    expect(prefillCheckout(null)).toEqual(EMPTY_CHECKOUT);
  });
});

describe("sendOrder", () => {
  const request = { ok: true } as never;

  it("devolve a resposta da rota, aceita ou recusada", async () => {
    const refused = {
      ok: false,
      error: { code: "store_closed", message: "fechada" },
    };
    const send = vi.fn(async () =>
      Response.json(refused, { status: 409 }),
    );
    expect(await sendOrder(request, send)).toEqual(refused);
    expect(send).toHaveBeenCalledWith(
      "/api/pedidos",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sem conexão ou resposta estranha → erro genérico", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const html = vi.fn(
      async () => new Response("<html>", { status: 502 }),
    );
    for (const send of [offline, html]) {
      const response = await sendOrder(request, send);
      expect(response).toMatchObject({
        ok: false,
        error: { code: "unexpected" },
      });
    }
  });
});
