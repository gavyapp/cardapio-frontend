// Hook PreToolUse do Claude Code para "git commit" (ver .claude/settings.json).
// Problemas de padrão: segura o commit uma vez para o Claude corrigir ou confirmar com o usuário.
// Para seguir mesmo assim, o Claude repete o comando com GIT_STANDARD_OK=1 na frente.
import { readFileSync } from "node:fs";
import {
  currentBranch,
  validateBranch,
  validateMessage,
} from "./validate.mjs";

const input = JSON.parse(readFileSync(0, "utf8"));
const command = input.tool_input?.command ?? "";

if (
  !/\bgit\s+commit\b/.test(command) ||
  /\bGIT_STANDARD_OK=1\b/.test(command)
)
  process.exit(0);

function messageFromCommand(cmd) {
  const heredoc =
    /<<-?\s*['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\s*\1\b/.exec(
      cmd,
    );
  if (heredoc) return heredoc[2];
  const file =
    /(?:-F|--file)[\s=]+(['"]?)([^\s'"]+)\1/.exec(cmd);
  if (file) {
    try {
      return readFileSync(file[2], "utf8");
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

const branch = currentBranch();
const message = messageFromCommand(command);
const warnings = [
  ...validateBranch(branch),
  ...(message ? validateMessage(message) : []),
];

if (!warnings.length) process.exit(0);

// Falta de task sozinha não segura o commit: só lembra.
const onlyMissingTask =
  warnings.length === 1 &&
  warnings[0].startsWith("Branch sem task");
const list = warnings.map((a) => `- ${a}`).join("\n");

const output = onlyMissingTask
  ? {
      hookEventName: "PreToolUse",
      additionalContext: `Padrão git (skill gerenciar-git):\n${list}\nCommit liberado. Ao abrir o PR, pergunte ao usuário se há uma issue para vincular.`,
    }
  : {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        `Padrão git (skill gerenciar-git) encontrou:\n${list}\n` +
        "Corrija (crie a branch certa ou ajuste a mensagem) e commite de novo. " +
        "Se o usuário preferir seguir assim, repita o mesmo comando com GIT_STANDARD_OK=1 na frente.",
    };

console.log(JSON.stringify({ hookSpecificOutput: output }));
