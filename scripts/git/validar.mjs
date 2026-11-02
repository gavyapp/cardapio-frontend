// Validações do padrão git (ver CLAUDE.md). Só avisa, nunca bloqueia.
// Usado pelo hook do git (.githooks/commit-msg) e pelo hook do Claude Code.
import { execSync } from "node:child_process";

export const TIPOS = ["feat", "fix", "refactor", "chore", "docs", "test"];

const BRANCH_RE = new RegExp(`^(${TIPOS.join("|")})/(?:(\\d+)-)?[a-z0-9][a-z0-9-]*$`);
const MSG_RE = new RegExp(`^(${TIPOS.join("|")})(\\([^)]+\\))?!?: \\S`);
// Mensagens geradas pelo próprio git, que não seguem o padrão.
const MSG_IGNORADA_RE = /^(Merge |Revert |fixup! |squash! |amend! )/;

export function branchAtual() {
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
export function taskDaBranch(branch) {
  return BRANCH_RE.exec(branch)?.[2] ?? null;
}

export function validarBranch(branch) {
  if (!branch) return []; // HEAD solto (rebase, checkout de commit)
  if (branch === "main") {
    return [
      "Commit direto na main. Crie uma branch: tipo/numero-descricao (ex.: feat/12-carrinho).",
    ];
  }
  if (!BRANCH_RE.test(branch)) {
    return [
      `Branch "${branch}" fora do padrão tipo/numero-descricao (tipos: ${TIPOS.join(", ")}).`,
    ];
  }
  if (!taskDaBranch(branch)) {
    return [
      "Branch sem task vinculada. Se existir uma issue, inclua o número: tipo/numero-descricao.",
    ];
  }
  return [];
}

export function validarMensagem(mensagem) {
  const titulo = mensagem
    .split("\n")
    .find((linha) => linha.trim() && !linha.startsWith("#"))
    ?.trim();
  if (!titulo || MSG_IGNORADA_RE.test(titulo)) return [];

  const avisos = [];
  if (!MSG_RE.test(titulo)) {
    avisos.push(
      `Mensagem fora do padrão "tipo: descrição" (ex.: "feat: adiciona carrinho"). Tipos: ${TIPOS.join(", ")}.`,
    );
  }
  if (titulo.length > 72) {
    avisos.push(`Título com ${titulo.length} caracteres. Prefira até 72.`);
  }
  return avisos;
}
