import { test as setup } from "@playwright/test";

import {
  expectPanelOf,
  submitLogin,
} from "./support/panel";
import {
  OWNER_STORAGE_STATE,
  SEED_OWNER,
  SEED_STORE,
} from "./support/seed";

// Entra uma vez como dono da loja do seed e guarda os cookies da sessão.
// Os testes do projeto "chromium" começam com essa sessão.
setup(
  "entra como dono da loja do seed",
  async ({ page }) => {
    await page.goto("/entrar");
    await submitLogin(
      page,
      SEED_OWNER.email,
      SEED_OWNER.password,
    );
    await page.waitForURL("**/painel/**");
    await expectPanelOf(page, SEED_STORE.name);
    await page
      .context()
      .storageState({ path: OWNER_STORAGE_STATE });
  },
);
