# Cardápio digital

Next.js + Supabase + Vercel. Setup e comandos no `README.md`.

## Padrão git

Fluxo: `main` + branches curtas, uma por task, com merge squash via PR.

**Branch:** `tipo/numero-descricao`, ex. `feat/12-cardapio-publico`. Sem task: `tipo/descricao`. O número é o da issue (issue N = task TN).

**Tipos:** `feat` (funcionalidade), `fix` (correção), `refactor`, `chore` (config, dependências), `docs`, `test`.

**Commit:** `tipo: descrição` em português, no presente, até 72 caracteres. Ex.: `fix: corrige total com taxa de entrega`.

**PR:** o título vira o commit na main. `tipo(TN): descrição`, ex. `feat(T12): cardápio público`. O corpo começa com `Closes #N`, assim o merge fecha a issue.

**Sem task não é proibido:** as validações só avisam.

### Automação

- `/iniciar-tarefa 12`: atualiza a main, cria a branch e atribui a issue.
- `gerenciar-git`: commit, rebase com a main, push e PR. Entra sozinha quando você pede pra commitar ou subir, ou via `/gerenciar-git`.
- Hook do Claude Code (`.claude/settings.json`): confere branch e mensagem antes de todo `git commit` feito pelo Claude.
- Hook do git (`.githooks/commit-msg`, ativado pelo `npm install`): as mesmas validações para commits pelo terminal ou editor. Só mostra avisos.
- Regras das validações: `scripts/git/validar.mjs`.
