import { expect, test } from "@playwright/test";

import {
  expectPanelOf,
  submitLogin,
} from "./support/panel";
import { SEED_OWNER, SEED_STORE } from "./support/seed";

test.describe("login do painel", () => {
  // Estes testes começam sem sessão.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("e-mail e senha do dono → entra no painel da loja", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await submitLogin(
      page,
      SEED_OWNER.email,
      SEED_OWNER.password,
    );

    await expect(page).toHaveURL(/\/painel\/pedidos$/);
    await expectPanelOf(page, SEED_STORE.name);
    await expect(
      page.getByRole("heading", { name: "Pedidos" }),
    ).toBeVisible();
  });

  test("senha errada → mostra o erro e continua no login", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await submitLogin(
      page,
      SEED_OWNER.email,
      "senha-errada",
    );

    // O Next tem um role="alert" próprio (anúncio de rota); o erro é o do formulário.
    await expect(
      page.locator("form").getByRole("alert"),
    ).toHaveText("E-mail ou senha incorretos.");
    await expect(page).toHaveURL(/\/entrar/);
    await expect(page.getByLabel("E-mail")).toHaveValue(
      SEED_OWNER.email,
    );
  });

  test("painel sem sessão → manda para o login", async ({
    page,
  }) => {
    await page.goto("/painel/pedidos");
    await expect(page).toHaveURL(
      /\/entrar\?proximo=%2Fpainel$/,
    );
    await expect(
      page.getByRole("button", { name: "Entrar" }),
    ).toBeVisible();
  });

  test("login com próximo do painel → entra direto nessa página", async ({
    page,
  }) => {
    await page.goto("/entrar?proximo=%2Fpainel%2Fcardapio");
    await submitLogin(
      page,
      SEED_OWNER.email,
      SEED_OWNER.password,
    );

    await expect(page).toHaveURL(/\/painel\/cardapio$/);
    await expectPanelOf(page, SEED_STORE.name);
  });

  test("login com próximo de outro site → entra no painel", async ({
    page,
  }) => {
    await page.goto(
      "/entrar?proximo=" +
        encodeURIComponent("https://exemplo.com"),
    );
    await submitLogin(
      page,
      SEED_OWNER.email,
      SEED_OWNER.password,
    );

    await expect(page).toHaveURL(
      /localhost:\d+\/painel\/pedidos$/,
    );
  });
});

test.describe("sessão do painel", () => {
  test("logado → abre o painel direto, sem passar pelo login", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await expect(page).toHaveURL(/\/painel\/pedidos$/);
    await expectPanelOf(page, SEED_STORE.name);
  });
});
