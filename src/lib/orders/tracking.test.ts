import { describe, expect, it } from "vitest";

import { timelineSteps } from "./detail";
import {
  formatDeliveryAddress,
  isFinalStatus,
  isOrderToken,
  parseTrackedOrder,
  supportUrl,
  trackingHeadline,
} from "./tracking";

// Como a função get_order_by_token devolve.
const fromDatabase = {
  id: "0a000000-0000-4000-8000-000000000001",
  number: 1047,
  status: "EM_PREPARO",
  mode: "ENTREGA",
  customer_name: "Ana Lima",
  address: {
    street: "Rua A",
    number: "10",
    district: "Centro",
    complement: "Apto 2",
  },
  payment_method: "DINHEIRO",
  change_for: 100,
  subtotal: 45,
  delivery_fee: 6,
  discount: 0,
  total: 51,
  notes: null,
  rejection_reason: null,
  created_at: "2026-11-14T22:40:00Z",
  accepted_at: "2026-11-14T22:42:00Z",
  completed_at: null,
  store: {
    id: "5a000000-0000-4000-8000-000000000001",
    name: "Stack Burguer",
    slug: "stack-burguer",
    phone: "48999502728",
  },
  items: [
    {
      id: "1a000000-0000-4000-8000-000000000001",
      name: "Combo The Spicy Honey",
      unit_price: 45,
      quantity: 1,
      notes: null,
      total: 45,
      complements: [
        {
          group_name: "Adicionais",
          name: "Bacon",
          price: 4,
          quantity: 1,
        },
      ],
    },
  ],
  events: [
    {
      to_status: "EM_PREPARO",
      note: null,
      created_at: "2026-11-14T22:42:00Z",
    },
  ],
};

describe("parseTrackedOrder", () => {
  it("resposta do banco → pedido com os valores gravados", () => {
    const order = parseTrackedOrder(fromDatabase);
    expect(order).toMatchObject({
      number: 1047,
      status: "EM_PREPARO",
      mode: "ENTREGA",
      paymentMethod: "DINHEIRO",
      changeFor: 100,
      subtotal: 45,
      deliveryFee: 6,
      total: 51,
      store: { slug: "stack-burguer" },
      events: [
        {
          toStatus: "EM_PREPARO",
          createdAt: "2026-11-14T22:42:00Z",
        },
      ],
    });
    expect(order?.items[0].complements).toEqual([
      { name: "Bacon", quantity: 1 },
    ]);
  });

  it("token sem pedido (null) → null", () => {
    expect(parseTrackedOrder(null)).toBeNull();
  });

  it("resposta fora do formato → erro", () => {
    expect(() =>
      parseTrackedOrder({ number: "x" }),
    ).toThrow();
  });
});

describe("etapas do pedido", () => {
  const order = parseTrackedOrder(fromDatabase)!;

  it("entrega em preparo → recebido feito, preparo atual, o resto por vir", () => {
    expect(
      timelineSteps(order).map((step) => [
        step.label,
        step.state,
      ]),
    ).toEqual([
      ["Pedido recebido", "done"],
      ["Aceito · em preparo", "current"],
      ["Saiu para entrega", "next"],
      ["Entregue", "next"],
    ]);
  });

  it("status muda para a caminho → a etapa atual anda", () => {
    const onTheWay = parseTrackedOrder({
      ...fromDatabase,
      status: "A_CAMINHO",
      events: [
        ...fromDatabase.events,
        {
          to_status: "A_CAMINHO",
          note: null,
          created_at: "2026-11-14T23:05:00Z",
        },
      ],
    })!;
    const current = timelineSteps(onTheWay).find(
      (step) => step.state === "current",
    );
    expect(current).toMatchObject({
      label: "Saiu para entrega",
      time: "20:05",
    });
  });

  it("pedido recusado → linha encerra com o motivo", () => {
    const rejected = parseTrackedOrder({
      ...fromDatabase,
      status: "REJEITADO",
      rejection_reason: "Item indisponível",
      events: [
        {
          to_status: "REJEITADO",
          note: "Item indisponível",
          created_at: "2026-11-14T22:41:00Z",
        },
      ],
    })!;
    expect(timelineSteps(rejected).at(-1)).toMatchObject({
      label: "Recusado",
      stopped: true,
      note: "Item indisponível",
    });
  });
});

describe("trackingHeadline", () => {
  it("cada status tem título; pronto e concluído mudam com a forma de receber", () => {
    expect(
      trackingHeadline({
        status: "RECEBIDO",
        mode: "ENTREGA",
      }).title,
    ).toBe("Pedido enviado");
    expect(
      trackingHeadline({
        status: "PRONTO",
        mode: "RETIRADA",
      }).title,
    ).toBe("Pronto para retirada");
    expect(
      trackingHeadline({
        status: "CONCLUIDO",
        mode: "ENTREGA",
      }).title,
    ).toBe("Pedido entregue");
    expect(
      trackingHeadline({
        status: "CONCLUIDO",
        mode: "RETIRADA",
      }).title,
    ).toBe("Pedido retirado");
    expect(
      trackingHeadline({
        status: "CANCELADO",
        mode: "ENTREGA",
      }).tone,
    ).toBe("stopped");
  });
});

describe("isFinalStatus", () => {
  it("concluído, recusado e cancelado param a reconsulta; os outros não", () => {
    expect(
      (
        ["CONCLUIDO", "REJEITADO", "CANCELADO"] as const
      ).map(isFinalStatus),
    ).toEqual([true, true, true]);
    expect(
      (
        [
          "RECEBIDO",
          "EM_PREPARO",
          "PRONTO",
          "A_CAMINHO",
        ] as const
      ).map(isFinalStatus),
    ).toEqual([false, false, false, false]);
  });
});

describe("supportUrl", () => {
  it("abre o WhatsApp da loja com o número do pedido na mensagem", () => {
    const url = supportUrl("(48) 99950-2728", 1047);
    expect(url).toContain(
      "https://wa.me/5548999502728?text=",
    );
    expect(decodeURIComponent(url!)).toContain(
      "pedido #1047",
    );
  });

  it("loja sem telefone válido → sem botão", () => {
    expect(supportUrl(null, 1047)).toBeNull();
    expect(supportUrl("9999", 1047)).toBeNull();
  });
});

describe("isOrderToken", () => {
  it("só aceita 32 dígitos hexadecimais", () => {
    expect(isOrderToken("a".repeat(32))).toBe(true);
    expect(isOrderToken("a".repeat(31))).toBe(false);
    expect(isOrderToken("../" + "a".repeat(29))).toBe(
      false,
    );
  });
});

describe("formatDeliveryAddress", () => {
  it("junta rua, número, bairro, complemento e referência", () => {
    expect(
      formatDeliveryAddress({
        street: "Rua A",
        number: "10",
        district: "Centro",
        complement: "Apto 2",
        reference: null,
      }),
    ).toBe("Rua A, 10 – Centro · Apto 2");
  });
});
