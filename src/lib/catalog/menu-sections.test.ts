import { describe, expect, it } from "vitest";

import { pickActiveSection } from "./menu-sections";

// Janela de 800px, linha de leitura a 120px do topo (logo abaixo da barra).
// Documento de 2000px: rolagem máxima de 1200px. As três últimas seções são
// curtas e ficam no fim, como Acompanhamentos, Sobremesas e Bebidas.
const VIEWPORT = 800;
const LINE = 120;
const MAX_SCROLL = 1200;
const OFFSETS = [
  ["combos", 300],
  ["burgers", 500],
  ["acompanhamentos", 1500],
  ["sobremesas", 1750],
  ["bebidas", 1880],
] as const;

function activeAt(scrollY: number) {
  return pickActiveSection({
    sections: OFFSETS.map(([id, offset]) => ({
      id,
      top: offset - scrollY,
    })),
    readingLine: LINE,
    viewportHeight: VIEWPORT,
    scrollY,
    maxScrollY: MAX_SCROLL,
  });
}

describe("pickActiveSection", () => {
  it("sem seções → null", () => {
    expect(
      pickActiveSection({
        sections: [],
        readingLine: LINE,
        viewportHeight: VIEWPORT,
        scrollY: 0,
        maxScrollY: MAX_SCROLL,
      }),
    ).toBeNull();
  });

  it("no topo da página → a primeira", () => {
    expect(activeAt(0)).toBe("combos");
  });

  it("fora do trecho final, vale o título que passou da linha de leitura", () => {
    expect(activeAt(375)).toBe("combos");
    expect(activeAt(385)).toBe("burgers");
  });

  it("no fim da página → a última", () => {
    expect(activeAt(MAX_SCROLL)).toBe("bebidas");
  });

  it("no trecho final, cada categoria curta é marcada na sua vez", () => {
    const seen: string[] = [];
    for (let y = 0; y <= MAX_SCROLL; y += 5) {
      const id = activeAt(y);
      if (id && seen[seen.length - 1] !== id) seen.push(id);
    }
    expect(seen).toEqual([
      "combos",
      "burgers",
      "acompanhamentos",
      "sobremesas",
      "bebidas",
    ]);
  });

  it("página menor que a janela → marca a última visível, sem dividir por zero", () => {
    expect(
      pickActiveSection({
        sections: [
          { id: "a", top: 200 },
          { id: "b", top: 500 },
        ],
        readingLine: LINE,
        viewportHeight: VIEWPORT,
        scrollY: 0,
        maxScrollY: 0,
      }),
    ).toBe("a");
  });
});
