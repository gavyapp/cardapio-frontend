// Chamado pelo .githooks/commit-msg com o caminho do arquivo da mensagem.
import { readFileSync } from "node:fs";
import {
  currentBranch,
  validateBranch,
  validateMessage,
} from "./validate.mjs";

const message = readFileSync(process.argv[2], "utf8");
const warnings = [
  ...validateBranch(currentBranch()),
  ...validateMessage(message),
];

if (warnings.length) {
  console.error(
    "\n⚠ Padrão git (commit feito mesmo assim):",
  );
  for (const warning of warnings)
    console.error(`  - ${warning}`);
  console.error("");
}
