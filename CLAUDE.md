# Cardápio digital

Next.js + Supabase + Vercel. Setup e comandos no `README.md`.

Decisões de arquitetura ficam em `docs/adr/`. Banco: só muda por migration, e migration aplicada não se edita (ADR 0001).

Acesso ao banco só por `src/lib/data/`, nunca Supabase direto em página ou componente (ADR 0003).

Estilo: só tokens do protótipo (`text-meta`, `rounded-control`...), nunca valor solto como `text-[13px]` ou `rounded-lg`; painel e cardápio do cliente mudam os valores pelo tema (ADR 0004).

Testes do banco: pgTAP em `supabase/tests/database/`, um arquivo por assunto, cenário em `-- Dado:` e descrição `quando → então` (ADR 0002).

Nomes dizem o propósito, não o mecanismo (`NewItemButton`, não `SearchParamButton`); boas práticas de código na ADR 0005.

Nome de arquivo e comentário dizem o assunto, nunca o código da task (T04, B3...). Código de task só no PR, na branch e no commit.

Código em inglês: funções, variáveis, tipos, constantes e nomes de arquivo (`formatPhone`, `complement-rules.ts`). Texto de interface, comentários, commits e PRs em pt-BR.

`src/lib` organizado por assunto, com nome curto porque a pasta dá o contexto (`catalog/types.ts`, `store/theme.ts`): `catalog`, `store`, `panel`, `hooks`, `routing` e, a cada fluxo novo, uma pasta dele (ex.: `orders`). Na raiz ficam só `data/`, `supabase/`, `format.ts`, `utils.ts` e `database.types.ts`.

Componentes em Atomic Design, em `src/components`: `atoms` (primitivos do shadcn e peças indivisíveis), `molecules` (composições pequenas, como campo com rótulo), `organisms` (seções, cabeçalhos, menus), `templates` (esqueleto de página) e `providers` (estado por contexto). Rotas em `src/app` só ligam dados ao template; nada de UI reutilizável dentro de `src/app`. O `shadcn add` grava em `atoms` (alias `ui` do `components.json`).

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
- Regras das validações: `scripts/git/validate.mjs`.
