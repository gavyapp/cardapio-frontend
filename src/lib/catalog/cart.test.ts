import { describe, expect, it } from "vitest";

import type {
  MenuComplementGroup,
  MenuProduct,
} from "@/lib/data/menu";

import {
  changeQuantity,
  cleanSelection,
  groupKind,
  hasRequiredGroup,
  isBlockedProduct,
  lineKey,
  MAX_ITEM_QUANTITY,
  missingGroups,
  newLine,
  parseStoredCart,
  resolveCart,
  serializeCart,
  stepOption,
  suggestProducts,
  summarizeCart,
  toggleOption,
  unitPrice,
  upsertLine,
} from "./cart";

const option = (
  id: string,
  price = 0,
  isAvailable = true,
) => ({
  id,
  name: id,
  price,
  isAvailable,
});

const group = (
  id: string,
  minSelect: number,
  maxSelect: number,
  options: ReturnType<typeof option>[],
  allowRepeat = false,
): MenuComplementGroup => ({
  id,
  name: id,
  minSelect,
  maxSelect,
  allowRepeat,
  options,
});

const product = (
  id: string,
  price: number,
  complementGroups: MenuComplementGroup[] = [],
  extra: Partial<MenuProduct> = {},
): MenuProduct => ({
  id,
  name: id,
  description: null,
  price,
  imageUrl: null,
  badges: [],
  isAvailable: true,
  isSuggested: false,
  complementGroups,
  ...extra,
});

// Ponto da carne: obrigatório, escolhe 1.
const doneness = group("ponto", 1, 1, [
  option("mal"),
  option("ao-ponto"),
  option("bem", 0, false),
]);
// Adicionais: opcional, até 2, sem repetir.
const extras = group("adicionais", 0, 2, [
  option("bacon", 5),
  option("cheddar", 4),
  option("ovo", 3),
]);
// Molhos: opcional, até 3, pode repetir.
const sauces = group(
  "molhos",
  0,
  3,
  [option("maionese", 1), option("barbecue", 2)],
  true,
);

const burger = product("burger", 30, [
  doneness,
  extras,
  sauces,
]);
const soda = product("refri", 7);

describe("escolha de complementos", () => {
  it("tipo do grupo: uma opção, várias ou com repetição", () => {
    expect(groupKind(doneness)).toBe("single");
    expect(groupKind(extras)).toBe("multiple");
    expect(groupKind(sauces)).toBe("repeat");
  });

  it("grupo de uma opção: escolher outra troca; obrigatório não desmarca", () => {
    expect(toggleOption(doneness, [], "mal")).toEqual([
      "mal",
    ]);
    expect(
      toggleOption(doneness, ["mal"], "ao-ponto"),
    ).toEqual(["ao-ponto"]);
    expect(toggleOption(doneness, ["mal"], "mal")).toEqual([
      "mal",
    ]);
  });

  it("grupo opcional de uma opção: tocar de novo desmarca", () => {
    const drink = group("bebida", 0, 1, [option("cola")]);
    expect(toggleOption(drink, ["cola"], "cola")).toEqual(
      [],
    );
  });

  it("não passa do máximo do grupo", () => {
    expect(
      toggleOption(extras, ["bacon", "cheddar"], "ovo"),
    ).toEqual(["bacon", "cheddar"]);
    expect(
      toggleOption(extras, ["bacon", "cheddar"], "bacon"),
    ).toEqual(["cheddar"]);
  });

  it("opção indisponível não entra", () => {
    expect(toggleOption(doneness, [], "bem")).toEqual([]);
  });

  it("repetição só onde é permitida, até o máximo do grupo", () => {
    let chosen = stepOption(sauces, [], "maionese", 1);
    chosen = stepOption(sauces, chosen, "maionese", 1);
    chosen = stepOption(sauces, chosen, "barbecue", 1);
    expect(chosen).toEqual([
      "maionese",
      "maionese",
      "barbecue",
    ]);
    // Já são 3: o quarto não entra.
    expect(
      stepOption(sauces, chosen, "barbecue", 1),
    ).toEqual(chosen);
    expect(
      stepOption(sauces, chosen, "maionese", -1),
    ).toEqual(["maionese", "barbecue"]);
  });

  it("grupo obrigatório incompleto impede adicionar", () => {
    expect(
      missingGroups(burger, {}).map((g) => g.id),
    ).toEqual(["ponto"]);
    expect(
      missingGroups(burger, { ponto: ["mal"] }),
    ).toEqual([]);
  });

  it("limpa escolhas que não valem mais", () => {
    expect(
      cleanSelection(burger, {
        ponto: ["bem"], // indisponível
        adicionais: ["bacon", "bacon", "cheddar", "ovo"], // repete e passa do máximo
        molhos: ["maionese", "maionese"],
        outro: ["x"], // grupo que não é do produto
      }),
    ).toEqual({
      adicionais: ["bacon", "cheddar"],
      molhos: ["maionese", "maionese"],
    });
  });

  it("preço da unidade soma os complementos, contando repetidos", () => {
    expect(
      unitPrice(burger, {
        ponto: ["mal"],
        adicionais: ["bacon"],
        molhos: ["maionese", "maionese", "barbecue"],
      }),
    ).toBe(30 + 5 + 1 + 1 + 2);
  });

  it("produto esgotado ou com grupo obrigatório sem opção não dá para pedir", () => {
    expect(isBlockedProduct(burger)).toBe(false);
    expect(
      isBlockedProduct(
        product("x", 1, [], { isAvailable: false }),
      ),
    ).toBe(true);
    expect(
      isBlockedProduct(
        product("y", 1, [
          group("g", 1, 1, [option("a", 0, false)]),
        ]),
      ),
    ).toBe(true);
  });
});

describe("itens do carrinho", () => {
  it("mesma escolha em outra ordem é o mesmo item", () => {
    expect(
      lineKey(
        "burger",
        { a: ["2", "1"], b: ["x"] },
        " sem cebola ",
      ),
    ).toBe(
      lineKey(
        "burger",
        { b: ["x"], a: ["1", "2"] },
        "sem cebola",
      ),
    );
  });

  it("item igual soma a quantidade; diferente entra separado", () => {
    const first = newLine(
      "burger",
      { ponto: ["mal"] },
      "",
      1,
    );
    const again = newLine(
      "burger",
      { ponto: ["mal"] },
      "",
      2,
    );
    const other = newLine(
      "burger",
      { ponto: ["ao-ponto"] },
      "",
      1,
    );

    const lines = upsertLine(
      upsertLine([first], again),
      other,
    );
    expect(lines.map((l) => l.quantity)).toEqual([3, 1]);
  });

  it("editar troca o item no mesmo lugar", () => {
    const a = newLine("burger", { ponto: ["mal"] }, "", 1);
    const b = newLine("refri", {}, "", 1);
    const edited = newLine(
      "burger",
      { ponto: ["ao-ponto"] },
      "",
      2,
    );

    const lines = upsertLine([a, b], edited, a.key);
    expect(lines.map((l) => l.key)).toEqual([
      edited.key,
      b.key,
    ]);
    expect(lines[0].quantity).toBe(2);
  });

  it("editar para ficar igual a outro item junta os dois", () => {
    const a = newLine("burger", { ponto: ["mal"] }, "", 1);
    const b = newLine(
      "burger",
      { ponto: ["ao-ponto"] },
      "",
      1,
    );
    const edited = newLine(
      "burger",
      { ponto: ["ao-ponto"] },
      "",
      1,
    );

    const lines = upsertLine([a, b], edited, a.key);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
  });

  it("quantidade: muda, remove no zero e respeita o limite", () => {
    const a = newLine("refri", {}, "", 1);
    expect(changeQuantity([a], a.key, 4)[0].quantity).toBe(
      4,
    );
    expect(changeQuantity([a], a.key, 0)).toEqual([]);
    expect(
      changeQuantity([a], a.key, 999)[0].quantity,
    ).toBe(MAX_ITEM_QUANTITY);
  });
});

describe("carrinho conferido com o cardápio", () => {
  const menu = [burger, soda];

  it("usa nome e preço de agora, não o que ficou guardado", () => {
    const lines = [
      newLine(
        "burger",
        { ponto: ["mal"], adicionais: ["bacon"] },
        "",
        2,
      ),
    ];
    const [item] = resolveCart(lines, menu);
    expect(item.unitPrice).toBe(35);
    expect(item.total).toBe(70);
    expect(item.options).toEqual([
      {
        groupName: "ponto",
        name: "mal",
        price: 0,
        quantity: 1,
      },
      {
        groupName: "adicionais",
        name: "bacon",
        price: 5,
        quantity: 1,
      },
    ]);
  });

  it("descarta item cujo produto saiu ou esgotou", () => {
    const lines = [
      newLine("sumiu", {}, "", 1),
      newLine("refri", {}, "", 1),
    ];
    expect(
      resolveCart(lines, menu).map((i) => i.product.id),
    ).toEqual(["refri"]);
    expect(
      resolveCart(lines, [{ ...soda, isAvailable: false }]),
    ).toEqual([]);
  });

  it("descarta item com complemento que ficou indisponível", () => {
    const lines = [
      newLine("burger", { ponto: ["bem"] }, "", 1),
    ];
    expect(resolveCart(lines, menu)).toEqual([]);
  });

  it("descarta item que não cumpre mais um grupo obrigatório", () => {
    const lines = [newLine("burger", {}, "", 1)];
    expect(resolveCart(lines, menu)).toEqual([]);
  });
});

describe("totais", () => {
  const items = resolveCart(
    [
      newLine("burger", { ponto: ["mal"] }, "", 1), // 30
      newLine("refri", {}, "", 2), // 14
    ],
    [burger, soda],
  );

  it("subtotal e quantidade de itens", () => {
    const summary = summarizeCart(items, {
      minimumOrder: 0,
      freeDeliveryAbove: null,
    });
    expect(summary.subtotal).toBe(44);
    expect(summary.itemCount).toBe(3);
    expect(summary.freeDelivery).toBeNull();
    expect(summary.minimumOrder).toBeNull();
  });

  it("entrega grátis: quanto falta e a barra", () => {
    const summary = summarizeCart(items, {
      minimumOrder: 0,
      freeDeliveryAbove: 70,
    });
    expect(summary.freeDelivery).toEqual({
      reached: false,
      missing: 26,
      progress: 63,
    });
  });

  it("entrega grátis atingida", () => {
    const summary = summarizeCart(items, {
      minimumOrder: 0,
      freeDeliveryAbove: 44,
    });
    expect(summary.freeDelivery).toEqual({
      reached: true,
      missing: 0,
      progress: 100,
    });
  });

  it("pedido mínimo: avisa quanto falta, e some ao atingir", () => {
    expect(
      summarizeCart(items, {
        minimumOrder: 50,
        freeDeliveryAbove: null,
      }).minimumOrder,
    ).toEqual({ value: 50, missing: 6 });
    expect(
      summarizeCart(items, {
        minimumOrder: 44,
        freeDeliveryAbove: null,
      }).minimumOrder,
    ).toBeNull();
  });
});

describe("peça também", () => {
  const fries = product("batata", 20, [], {
    isSuggested: true,
  });
  const shake = product("shake", 15, [], {
    isSuggested: true,
  });
  const soldOut = product("torta", 9, [], {
    isSuggested: true,
    isAvailable: false,
  });
  const menu = [burger, fries, shake, soldOut, soda];

  it("só sugeridos que dá para pedir e não estão no carrinho", () => {
    const items = resolveCart(
      [newLine("batata", {}, "", 1)],
      menu,
    );
    expect(
      suggestProducts(menu, items).map((p) => p.id),
    ).toEqual(["shake"]);
  });

  it("respeita o limite", () => {
    expect(suggestProducts(menu, [], 1)).toHaveLength(1);
  });

  it("produto com grupo obrigatório precisa passar pelo detalhe", () => {
    expect(hasRequiredGroup(burger)).toBe(true);
    expect(hasRequiredGroup(soda)).toBe(false);
  });
});

describe("carrinho guardado no aparelho", () => {
  it("o que foi guardado volta igual", () => {
    const lines = [
      newLine(
        "burger",
        { ponto: ["mal"] },
        "sem cebola",
        2,
      ),
      newLine("refri", {}, "", 1),
    ];
    expect(parseStoredCart(serializeCart(lines))).toEqual(
      lines,
    );
  });

  it("vazio, texto quebrado ou formato errado viram carrinho vazio", () => {
    expect(parseStoredCart(null)).toEqual([]);
    expect(parseStoredCart("{não é json")).toEqual([]);
    expect(parseStoredCart('{"a":1}')).toEqual([]);
    expect(
      parseStoredCart(
        '[{"productId":"x","quantity":"muitos"}]',
      ),
    ).toEqual([]);
  });
});
