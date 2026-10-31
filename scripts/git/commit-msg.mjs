// Chamado pelo .githooks/commit-msg com o caminho do arquivo da mensagem.
import { readFileSync } from "node:fs";
import { branchAtual, validarBranch, validarMensagem } from "./validar.mjs";

const mensagem = readFileSync(process.argv[2], "utf8");
const avisos = [...validarBranch(branchAtual()), ...validarMensagem(mensagem)];

if (avisos.length) {
  console.error("\n⚠ Padrão git (commit feito mesmo assim):");
  for (const aviso of avisos) console.error(`  - ${aviso}`);
  console.error("");
}
