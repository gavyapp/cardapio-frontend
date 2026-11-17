import { describe, expect, it } from "vitest";

import {
  hasSelectionChanged,
  productChoices,
  searchProductChoices,
  toggleProducts,
} from "./group-products";

const categories = [
  { id: "burgers", name: "Burgers" },
  { id: "bebidas", name: "Bebidas" },
  { id: "vazia", name: "Sobremesas" },
];
const products = [
  {
    id: "classic",
    name: "The Classic",
    categoryId: "burgers",
  },
  {
    id: "coca",
    name: "Coca-Cola Lata",
    categoryId: "bebidas",
  },
  { id: "flash", name: "The Flash", categoryId: "burgers" },
  { id: "agua", name: "Água", categoryId: "bebidas" },
];
const choices = productChoices(categories, products);

describe("productChoices", () => {
  it("agrupa por categoria, na ordem do cardápio, sem categoria vazia", () => {
    expect(choices).toEqual([
      {
        id: "burgers",
        name: "Burgers",
        products: [
          { id: "classic", name: "The Classic" },
          { id: "flash", name: "The Flash" },
        ],
      },
      {
        id: "bebidas",
        name: "Bebidas",
        products: [
          { id: "coca", name: "Coca-Cola Lata" },
          { id: "agua", name: "Água" },
        ],
      },
    ]);
  });
});

describe("searchProductChoices", () => {
  it("sem busca → tudo", () => {
    expect(searchProductChoices(choices, "  ")).toEqual(
      choices,
    );
  });

  it("nome do produto, sem acento nem maiúscula → só o que bate", () => {
    expect(searchProductChoices(choices, "agua")).toEqual([
      {
        id: "bebidas",
        name: "Bebidas",
        products: [{ id: "agua", name: "Água" }],
      },
    ]);
  });

  it("nome da categoria → a categoria inteira", () => {
    expect(
      searchProductChoices(choices, "burg")[0].products,
    ).toHaveLength(2);
  });

  it("nada bate → lista vazia", () => {
    expect(searchProductChoices(choices, "pizza")).toEqual(
      [],
    );
  });
});

describe("toggleProducts", () => {
  it("marca vários de uma vez e desmarca sem mexer nos outros", () => {
    const marked = toggleProducts(
      new Set(["coca"]),
      ["classic", "flash"],
      true,
    );
    expect([...marked].sort()).toEqual([
      "classic",
      "coca",
      "flash",
    ]);
    expect([
      ...toggleProducts(
        marked,
        ["classic", "flash"],
        false,
      ),
    ]).toEqual(["coca"]);
  });
});

describe("hasSelectionChanged", () => {
  it("mesmos produtos, em qualquer ordem → sem mudança", () => {
    expect(
      hasSelectionChanged(new Set(["a", "b"]), ["b", "a"]),
    ).toBe(false);
  });

  it("produto a mais, a menos ou trocado → mudou", () => {
    expect(
      hasSelectionChanged(new Set(["a", "b"]), ["a"]),
    ).toBe(true);
    expect(
      hasSelectionChanged(new Set(["a"]), ["a", "b"]),
    ).toBe(true);
    expect(hasSelectionChanged(new Set(["a"]), ["b"])).toBe(
      true,
    );
  });
});
