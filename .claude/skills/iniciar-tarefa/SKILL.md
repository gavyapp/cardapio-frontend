---
name: iniciar-tarefa
description: Começa uma tarefa neste repo. Atualiza a main, cria a branch no padrão e vincula a issue. Use quando o usuário disser que vai começar uma task ("iniciar tarefa 12", "vou pegar a #12", "começar um fix de ...") ou chamar /iniciar-tarefa.
---

# Iniciar tarefa

Entrada (argumento ou conversa), uma destas:

- número da issue: `12`, `#12` ou `T12` (issue N = task TN);
- tipo + descrição, para trabalho sem issue: `fix "header quebrado no mobile"`;
- nada: pergunte qual a task ou o que vai ser feito.

Padrão de branch, tipos e mensagens: seção "Padrão git" do `CLAUDE.md`.

## Passos

1. **Alterações pendentes.** Rode `git status --porcelain`. Se houver algo, mostre o resumo e pergunte: levar para a nova branch, guardar com `git stash`, ou parar. Não descarte nada.

2. **Atualizar a base.** A base é `main`, salvo se o usuário pedir outra.

   ```bash
   git fetch origin main
   git switch main
   git pull --ff-only origin main
   ```

   Se o `pull --ff-only` falhar porque a main local tem commits que não estão no remoto, avise e pergunte o que fazer antes de seguir. Se a opção escolhida no passo 1 foi levar as alterações, crie a branch a partir de `origin/main` sem trocar para a main: `git switch -c <branch> origin/main`.

3. **Ler a task.** Com número de issue, busque título, labels e responsáveis com `gh issue view N --json title,labels,assignees,state` (ou as ferramentas do GitHub MCP, se o `gh` não estiver disponível). Se a issue estiver fechada, avise e confirme se é essa mesma.
   - Tipo: `fix` se for bug, `feat` para funcionalidade nova, `refactor`, `chore`, `docs` ou `test` conforme o caso. Na dúvida, `feat`.
   - Descrição da branch: 2 a 5 palavras do título, minúsculas, sem acento, separadas por hífen.

   Sem número de issue, pergunte uma vez se o usuário quer criar uma issue para o trabalho. Se sim, crie com `gh issue create` (tipo "Task") e use o número. Se não, siga sem task, sem insistir.

4. **Criar a branch.** `tipo/numero-descricao` (ex.: `feat/12-cardapio-publico`), ou `tipo/descricao` sem task.
   Se a branch já existir, local ou no remoto, troque para ela em vez de criar outra.

   ```bash
   git switch -c feat/12-cardapio-publico
   ```

5. **Vincular.** Com issue, atribua ao usuário se ninguém estiver atribuído: `gh issue edit N --add-assignee @me`. Se a issue já for de outra pessoa, só avise.

6. **Resumo.** Diga em poucas linhas: branch criada, base atualizada até qual commit, task vinculada (ou "sem task"). Lembre que o commit e o PR seguem pela skill `gerenciar-git`.
