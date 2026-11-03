import { expect, type Page } from "@playwright/test";

/** Preenche e envia o formulário de login do painel (já aberto). */
export async function submitLogin(
  page: Page,
  email: string,
  password: string,
) {
  await page.getByLabel("E-mail").fill(email);
  await page
    .getByLabel("Senha", { exact: true })
    .fill(password);
  await page
    .getByRole("button", { name: "Entrar" })
    .click();
}

/** Espera o painel carregar com a loja no cabeçalho. */
export async function expectPanelOf(
  page: Page,
  storeName: string,
) {
  await expect(page.getByRole("banner")).toContainText(
    storeName,
  );
}
