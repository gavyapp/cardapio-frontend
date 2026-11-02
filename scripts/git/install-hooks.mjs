// Roda no "prepare" do npm install. Aponta o git para .githooks; ignora falhas (ex.: build na Vercel sem .git).
import { execSync } from "node:child_process";

try {
  execSync("git config core.hooksPath .githooks", {
    stdio: "ignore",
  });
} catch {
  // sem repositório git: nada a fazer
}
