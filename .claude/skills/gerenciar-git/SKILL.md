---
name: gerenciar-git
description: Cuida de commit, sincronização com a main, push e PR neste repo seguindo o padrão do time. Use sempre que for commitar, subir alterações, abrir ou atualizar PR, ou limpar a branch depois do merge, mesmo sem o usuário citar a skill, e quando ele chamar /gerenciar-git.
---

# Gerenciar git

Funciona sozinha, tenha ou não sido usada a `iniciar-tarefa`. Padrão: seção "Padrão git" do `CLAUDE.md`.
Regra principal: **nunca proibir**. Quando algo foge do padrão, avise e sugira a correção. Se o usuário quiser seguir assim, siga.

Um hook (`.claude/settings.json`) confere todo `git commit` antes de rodar. Se ele segurar o commit, corrija o que ele apontou ou confirme com o usuário. Para seguir mesmo assim, repita o comando com `PADRAO_GIT_OK=1` na frente.

## 1. Ler o estado

```bash
git status -sb
git branch --show-current
git fetch origin main
git log --oneline origin/main..HEAD
```

Descubra a task pelo nome da branch (`feat/12-...` → issue 12). Se não houver, siga sem task e lembre disso no PR.

## 2. Branch

- **Na main com alterações:** não commite na main. Pergunte o número da task, se houver, e crie a branch no padrão (`git switch -c tipo/numero-descricao`). As alterações vão junto.
- **Branch fora do padrão:** sugira renomear (`git branch -m novo-nome`) uma vez. Se já estiver no remoto, renomear exige apagar a antiga lá, então só sugira se ainda não tiver push.

## 3. Commit

- Veja o diff (`git diff` e `git diff --staged`) antes de escrever a mensagem.
- Se as alterações forem de assuntos diferentes, sugira separar em mais de um commit.
- Nunca adicione `.env*` (exceto `.env.example`), segredos ou arquivos gerados. Prefira `git add <arquivos>` a `git add -A`.
- Mensagem: `tipo: descrição` em português, no presente, minúscula, até 72 caracteres (ex.: `feat: adiciona carrinho no cardápio`). Corpo opcional explicando o porquê.

## 4. Antes do push

- Se `origin/main` tem commits que a branch não tem, atualize: `git rebase origin/main`. Em conflito, pare e mostre os arquivos ao usuário. Se a branch já tem PR revisado por outra pessoa, prefira `git merge origin/main` para não reescrever o que foi revisado.
- Ponto de extensão: quando existirem skills de teste ou de review no repo (`.claude/skills/`), rode-as aqui. Falhas viram aviso ao usuário, não bloqueio.

## 5. Push

```bash
git push -u origin <branch>
```

Depois de um rebase em branch que já tinha push, use `git push --force-with-lease`. Nunca force push na main.

## 6. PR

Veja se já existe: `gh pr view --json number,title,body,state` (ou ferramentas do GitHub MCP).

- **Título:** vira o commit na main (merge squash). `tipo(TN): descrição`, ex.: `feat(T12): cardápio público`. Sem task: `tipo: descrição`.
- **Corpo:** siga `.github/pull_request_template.md`. Com task, a primeira linha é `Closes #N`: o merge fecha a issue e o Project move o card sozinho. Sem task, troque por `Sem task vinculada.`
- Criar: `gh pr create --title "..." --body "..." --assignee @me`.
- Já existe: atualize título ou corpo só se estiverem fora do padrão ou desatualizados.
- Sem task: pergunte uma vez se há issue para vincular antes de abrir. Se não houver, abra assim mesmo.

## 7. Depois do merge

Quando o usuário disser que o PR foi mergeado, ou `gh pr view` mostrar `MERGED`:

```bash
git switch main
git pull --ff-only origin main
git branch -D <branch>
```

`-D` é necessário porque o squash não deixa os commits da branch na main. Confira antes que o PR está mesmo `MERGED`.

## Resumo para o usuário

No fim, diga em poucas linhas o que foi feito (commit, push, link do PR) e os avisos que ficaram, como "sem task vinculada".
