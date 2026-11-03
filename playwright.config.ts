import { execSync } from "node:child_process";

import { defineConfig, devices } from "@playwright/test";

// Testes E2E (ver docs/adr/0004-testes-e2e.md). Rodam sempre contra o
// Supabase local (`npx supabase start`), com as migrations e o seed, nunca
// contra o projeto de dev: os testes criam dados.

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

/** URL e chaves do Supabase local, lidas do `supabase status`. */
function localSupabaseEnv(): Record<string, string> {
  // O config é carregado de novo em cada worker; lê o status uma vez só.
  if (process.env.E2E_SUPABASE_READY)
    return supabaseEnvFrom(process.env);

  let output: string;
  try {
    output = execSync(
      [
        "npx supabase status -o env",
        "--override-name api.url=NEXT_PUBLIC_SUPABASE_URL",
        "--override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "--override-name auth.secret_key=SUPABASE_SECRET_KEY",
      ].join(" "),
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
  } catch {
    throw new Error(
      "Supabase local não está rodando. Suba com `npx supabase start` antes dos testes E2E.",
    );
  }

  const env: Record<string, string> = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) env[match[1]] = match[2];
  }

  const resolved = supabaseEnvFrom(env);
  Object.assign(process.env, resolved, {
    E2E_SUPABASE_READY: "1",
  });
  return resolved;
}

function supabaseEnvFrom(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error(
      `Os testes E2E só rodam no Supabase local, não em ${url || "(sem URL)"}.`,
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY ?? "",
  };
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Entra no painel com o dono da loja do seed e guarda a sessão, para os
    // outros testes já começarem logados.
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/owner.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // No CI, build de produção; local, o servidor de desenvolvimento numa
    // porta própria, para não misturar com o `npm run dev` de sempre.
    command: isCI
      ? `npm run build && npm run start -- --port ${PORT}`
      : `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    env: localSupabaseEnv(),
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
