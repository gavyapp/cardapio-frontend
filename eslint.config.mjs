import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Acesso ao Supabase só por src/lib/data (ver docs/adr/0003-camada-de-dados.md).
const supabaseDireto = {
  group: ["@supabase/*"],
  message:
    "Acesse o Supabase por src/lib/data, não direto (docs/adr/0003-camada-de-dados.md).",
};
const clientesSupabase = {
  group: [
    "@/lib/supabase",
    "@/lib/supabase/*",
    "**/lib/supabase",
    "**/lib/supabase/*",
  ],
  message:
    "Os clientes do Supabase só são usados dentro de src/lib/data (docs/adr/0003-camada-de-dados.md).",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/supabase/**",
      "src/lib/data/**",
      "src/proxy.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [supabaseDireto, clientesSupabase] },
      ],
    },
  },
  {
    // O proxy só renova a sessão, pelo helper de src/lib/supabase.
    files: ["src/proxy.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [supabaseDireto] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
