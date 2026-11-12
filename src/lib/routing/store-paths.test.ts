import { describe, expect, it } from "vitest";

import {
  checkoutPathFrom,
  menuPathFrom,
} from "./store-paths";

describe("caminhos da loja", () => {
  it("cardápio pelo caminho → checkout dentro do slug", () => {
    expect(checkoutPathFrom("/stack-burguer")).toBe(
      "/stack-burguer/checkout",
    );
    expect(checkoutPathFrom("/stack-burguer/")).toBe(
      "/stack-burguer/checkout",
    );
  });

  it("cardápio no subdomínio → /checkout", () => {
    expect(checkoutPathFrom("/")).toBe("/checkout");
  });

  it("checkout → volta ao cardápio de onde veio", () => {
    expect(menuPathFrom("/stack-burguer/checkout")).toBe(
      "/stack-burguer",
    );
    expect(menuPathFrom("/checkout")).toBe("/");
    expect(menuPathFrom("/checkout/")).toBe("/");
  });
});
