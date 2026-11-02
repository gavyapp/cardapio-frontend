// Hook PreToolUse do Claude Code para "git commit" (ver .claude/settings.json).
// Problemas de padrão: segura o commit uma vez para o Claude corrigir ou confirmar com o usuário.
// Para seguir mesmo assim, o Claude repete o comando com PADRAO_GIT_OK=1 na frente.
import { readFileSync } from "node:fs";
import {
  branchAtual,
  validarBranch,
  validarMensagem,
} from "./validar.mjs";

const entrada = JSON.parse(readFileSync(0, "utf8"));
const comando = entrada.tool_input?.command ?? "";

if (
  !/\bgit\s+commit\b/.test(comando) ||
  /\bPADRAO_GIT_OK=1\b/.test(comando)
)
  process.exit(0);

function mensagemDoComando(cmd) {
  const heredoc =
    /<<-?\s*['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\s*\1\b/.exec(
      cmd,
    );
  if (heredoc) return heredoc[2];
  const arquivo =
    /(?:-F|--file)[\s=]+(['"]?)([^\s'"]+)\1/.exec(cmd);
  if (arquivo) {
    try {
      return readFileSync(arquivo[2], "utf8");
    } catch {
      // arquivo ilegível: valida só a branch
    }
  }
  const inline =
    /(?:-m|--message)[\s=]+(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+))/.exec(
      cmd,
    );
  return inline
    ? (inline[1] ?? inline[2] ?? inline[3])
    : null;
}

const branch = branchAtual();
const mensagem = mensagemDoComando(comando);
const avisos = [
  ...validarBranch(branch),
  ...(mensagem ? validarMensagem(mensagem) : []),
];

if (!avisos.length) process.exit(0);

// Falta de task sozinha não segura o commit: só lembra.
const soFaltaTask =
  avisos.length === 1 &&
  avisos[0].startsWith("Branch sem task");
const lista = avisos.map((a) => `- ${a}`).join("\n");

const saida = soFaltaTask
  ? {
      hookEventName: "PreToolUse",
      additionalContext: `Padrão git (skill gerenciar-git):\n${lista}\nCommit liberado. Ao abrir o PR, pergunte ao usuário se há uma issue para vincular.`,
    }
  : {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        `Padrão git (skill gerenciar-git) encontrou:\n${lista}\n` +
        "Corrija (crie a branch certa ou ajuste a mensagem) e commite de novo. " +
        "Se o usuário preferir seguir assim, repita o mesmo comando com PADRAO_GIT_OK=1 na frente.",
    };

console.log(JSON.stringify({ hookSpecificOutput: saida }));
