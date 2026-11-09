// Barra valores de estilo soltos fora dos átomos (regra da ADR 0004):
// canto, tamanho de texto, sombra e cor sempre pelos tokens do tema.
//
// Exceção justificada: um comentário com "fora dos tokens:" e o motivo, na
// mesma linha ou na linha de cima.
//
//   node scripts/style/check-tokens.mjs

import {
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = "src";

/** Pastas onde os valores base moram ou que só existem em desenvolvimento. */
const ALLOWED_DIRS = [
  join("src", "components", "atoms"),
  join("src", "app", "amostra"),
];

const EXCEPTION = "fora dos tokens:";

const RULES = [
  {
    pattern:
      /\brounded-(?:xs|sm|md|lg|xl|[2-4]xl|\[[^\]]*\])/,
    hint: "use rounded-control, rounded-surface ou rounded-full",
  },
  {
    pattern:
      /\btext-(?:xs|sm|base|lg|xl|[2-9]xl|\[[0-9.]+(?:px|rem|em)\])(?![\w-])/,
    hint: "use text-caption, text-meta, text-body, text-section, text-title ou text-display",
  },
  {
    pattern: /\bshadow-(?:xs|sm|md|lg|xl|2xl)(?![\w-])/,
    hint: "sombra só em modal, menu e toast (shadow-elevated, nos átomos)",
  },
  {
    pattern: /-\[#[0-9a-fA-F]{3,8}\]/,
    hint: "use uma cor do tema (bg-muted, text-subtle, border-border-strong...)",
  },
];

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (ALLOWED_DIRS.includes(path)) continue;
      yield* sourceFiles(path);
    } else if (/\.(ts|tsx)$/.test(name)) {
      yield path;
    }
  }
}

const problems = [];

for (const file of sourceFiles(ROOT)) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (
      line.includes(EXCEPTION) ||
      lines[index - 1]?.includes(EXCEPTION)
    )
      return;
    for (const { pattern, hint } of RULES) {
      const match = line.match(pattern);
      if (match)
        problems.push(
          `${relative(".", file).split(sep).join("/")}:${index + 1}  ${match[0]}  → ${hint}`,
        );
    }
  });
}

if (problems.length) {
  console.error(
    `Valores de estilo fora dos tokens (ADR 0004):\n\n${problems.join("\n")}\n\nSe o protótipo pede o valor, explique num comentário com "${EXCEPTION}" na linha ou na de cima.`,
  );
  process.exit(1);
}

console.log("Estilo: só tokens fora dos átomos.");
