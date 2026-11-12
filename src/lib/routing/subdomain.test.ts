import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { rewritePathFor } from "./subdomain";

describe("rewritePathFor", () => {
  const previous = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "gavy.com";
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = previous;
  });

  it("subdomínio da loja → caminho da loja", () => {
    expect(
      rewritePathFor("stack-burguer.gavy.com", "/"),
    ).toBe("/stack-burguer");
    expect(
      rewritePathFor(
        "stack-burguer.localhost:3000",
        "/algo",
      ),
    ).toBe("/stack-burguer/algo");
  });

  it("subdomínio do painel → /painel", () => {
    expect(
      rewritePathFor("painel.gavy.com", "/pedidos"),
    ).toBe("/painel/pedidos");
  });

  it("raiz, www, dois níveis e outros domínios → sem reescrita", () => {
    expect(rewritePathFor("gavy.com", "/x")).toBeNull();
    expect(rewritePathFor("www.gavy.com", "/")).toBeNull();
    expect(rewritePathFor("a.b.gavy.com", "/")).toBeNull();
    expect(
      rewritePathFor("projeto.vercel.app", "/"),
    ).toBeNull();
  });

  it("caminho que já tem o prefixo → sem reescrita", () => {
    expect(
      rewritePathFor(
        "stack-burguer.gavy.com",
        "/stack-burguer",
      ),
    ).toBeNull();
    expect(
      rewritePathFor("painel.gavy.com", "/painel/pedidos"),
    ).toBeNull();
  });

  it("rotas de API passam direto em qualquer subdomínio", () => {
    expect(
      rewritePathFor(
        "stack-burguer.gavy.com",
        "/api/pedidos",
      ),
    ).toBeNull();
    expect(
      rewritePathFor(
        "stack-burguer.localhost:3000",
        "/api/pedidos",
      ),
    ).toBeNull();
    expect(
      rewritePathFor("painel.gavy.com", "/api/pedidos"),
    ).toBeNull();
  });

  it("loja cujo endereço começa com api não é confundida com a API", () => {
    expect(rewritePathFor("apicultura.gavy.com", "/")).toBe(
      "/apicultura",
    );
    expect(
      rewritePathFor("stack-burguer.gavy.com", "/apis"),
    ).toBe("/stack-burguer/apis");
  });
});
