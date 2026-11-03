// Validações do padrão git (ver CLAUDE.md). Só avisa, nunca bloqueia.
// Usado pelo hook do git (.githooks/commit-msg) e pelo hook do Claude Code.
import { execSync } from "node:child_process";

export const TYPES = [
  "feat",
  "fix",
  "refactor",
  "chore",
  "docs",
  "test",
];

const BRANCH_RE = new RegExp(
  `^(${TYPES.join("|")})/(?:(\\d+)-)?[a-z0-9][a-z0-9-]*$`,
);
const MSG_RE = new RegExp(
  `^(${TYPES.join("|")})(\\([^)]+\\))?!?: \\S`,
);
// Mensagens geradas pelo próprio git, que não seguem o padrão.
const IGNORED_MSG_RE =
  /^(Merge |Revert |fixup! |squash! |amend! )/;

export function currentBranch() {
  try {
    return execSync("git branch --show-current", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// Número da task a partir do nome da branch (feat/12-carrinho -> 12).
export function taskFromBranch(branch) {
  return BRANCH_RE.exec(branch)?.[2] ?? null;
}

export function validateBranch(branch) {
  if (!branch) return []; // HEAD solto (rebase, checkout de commit)
  if (branch === "main") {
    return [
      "Commit direto na main. Crie uma branch: tipo/numero-descricao (ex.: feat/12-carrinho).",
    ];
  }
  if (!BRANCH_RE.test(branch)) {
    return [
      `Branch "${branch}" fora do padrão tipo/numero-descricao (tipos: ${TYPES.join(", ")}).`,
    ];
  }
  if (!taskFromBranch(branch)) {
    return [
      "Branch sem task vinculada. Se existir uma issue, inclua o número: tipo/numero-descricao.",
    ];
  }
  return [];
}

export function validateMessage(message) {
  const title = message
    .split("\n")
    .find((line) => line.trim() && !line.startsWith("#"))
    ?.trim();
  if (!title || IGNORED_MSG_RE.test(title)) return [];

  const warnings = [];
  if (!MSG_RE.test(title)) {
    warnings.push(
      `Mensagem fora do padrão "tipo: descrição" (ex.: "feat: adiciona carrinho"). Tipos: ${TYPES.join(", ")}.`,
    );
  }
  if (title.length > 72) {
    warnings.push(
      `Título com ${title.length} caracteres. Prefira até 72.`,
    );
  }
  return warnings;
}
