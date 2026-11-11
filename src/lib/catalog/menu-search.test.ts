import { describe, expect, it } from "vitest";

import { searchProducts } from "./menu-search";

const product = (
  name: string,
  description: string | null = null,
  isAvailable = true,
) => ({ name, description, isAvailable });

const MENU = [
  product(
    "Combo The Classic",
    "The Classic + batatinha + Coca lata.",
  ),
  product(
    "Hambúrguer The Classic",
    "Pão brioche, blend 160 g e cheddar.",
  ),
  product(
    "The Tropical",
    "Abacaxi na brasa e bacon.",
    false,
  ),
  product("Porção de Batata"),
  product("Coca-Cola Lata", "Tradicional ou zero."),
];

const names = (query: string) =>
  searchProducts(MENU, query).map((p) => p.name);

describe("searchProducts", () => {
  it("busca vazia ou só com espaços → nada", () => {
    expect(names("")).toEqual([]);
    expect(names("   ")).toEqual([]);
  });

  it('"hamburguer" encontra "Hambúrguer", sem acento nem maiúscula', () => {
    expect(names("hamburguer")).toEqual([
      "Hambúrguer The Classic",
    ]);
    expect(names("HAMBÚRGUER")).toEqual([
      "Hambúrguer The Classic",
    ]);
  });

  it("combos aparecem junto com os outros produtos", () => {
    expect(names("classic")).toEqual([
      "Combo The Classic",
      "Hambúrguer The Classic",
    ]);
  });

  it("busca também na descrição, com o nome na frente", () => {
    // "batat" bate no nome da porção e na descrição do combo.
    expect(names("batat")).toEqual([
      "Porção de Batata",
      "Combo The Classic",
    ]);
  });

  it("esgotado aparece no resultado", () => {
    const found = searchProducts(MENU, "tropical");
    expect(found).toHaveLength(1);
    expect(found[0].isAvailable).toBe(false);
  });

  it("várias palavras: todas precisam aparecer, em qualquer ordem", () => {
    expect(names("lata coca")).toEqual([
      "Coca-Cola Lata",
      "Combo The Classic",
    ]);
    expect(names("coca abacaxi")).toEqual([]);
  });

  it("produto sem descrição não quebra a busca", () => {
    expect(names("porcao")).toEqual(["Porção de Batata"]);
  });

  it("nada encontrado → lista vazia", () => {
    expect(names("pizza")).toEqual([]);
  });
});
