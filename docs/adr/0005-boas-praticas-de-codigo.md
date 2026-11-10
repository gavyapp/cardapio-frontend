# ADR 0005: boas práticas de código

- Status: proposto (falta a revisão do Tartare)
- Data: 2026-11-09

## Contexto

O código é lido muito mais vezes do que escrito, quase sempre por quem não estava lá quando ele nasceu. Nomes que contam como algo funciona (`SearchParamButton`) obrigam quem lê a abrir o arquivo para descobrir para que ele serve. As regras abaixo valem para todo código novo do front e para o que for tocado numa mudança. Banco, dados e estilo têm regras próprias nas ADRs 0001 a 0004.

## Decisão

### 1. O nome diz o propósito, não o mecanismo

Componentes, funções, hooks, props, variáveis, constantes e arquivos são nomeados pelo que fazem para o produto, não por como fazem. O mecanismo pode mudar sem o nome mudar.

| Propósito                           | Mecanismo (evitar)                 |
| ----------------------------------- | ---------------------------------- |
| `NewItemButton`                     | `SearchParamButton`                |
| `isUnpaid(order)`                   | `paidAtIsNull(order)`              |
| `afterMenuChange(storeId)`          | `updateTagAndRefresh(storeId)`     |
| `requirePanelAccess(route)`         | `getUserAndStoreOrRedirect(route)` |
| `actions={{ advance, closeOrder }}` | `actions={{ rpc1, updateStatus }}` |

- Booleano se lê como pergunta: `isLate`, `hasPhoto`, `canEdit`.
- Callback diz o que aconteceu no produto (`onSave`, `markRead`), não o evento do navegador (`handleClick2`).
- Exceção: peça genérica de verdade, sem assunto do produto, tem o mecanismo como propósito (`useSearchParamState`, `Switch`, `formatCurrency`).
- Tokens de design (cor, canto, sombra) são feitos para reaproveitar, então têm nome pelo papel na paleta ou pela intensidade (`border-strong`, `gray-medium`, `warning-soft`, `rounded-surface`), nunca por uma tela. O uso fica no código que escolhe o token: `orderTone` diz que a etapa "em preparo" usa `gray-medium`. A escala de texto segue os papéis tipográficos do protótipo (`caption`, `support`, `body`, `section-title`, `page-title`, `big-number`).

### 2. Nome pelo assunto, nunca pela task

Arquivo, teste e comentário falam do assunto (`complement-rules.ts`, `loja_aberta.test.sql`). Código de task (T04, B3) fica só em branch, commit e PR. Já previsto no `CLAUDE.md` e na ADR 0002.

### 3. Comentário explica o porquê

- Todo componente e função exportados têm uma frase de propósito em `/** */`, dita para quem usa.
- Comentário dentro do código só existe quando o porquê não é óbvio: uma regra de negócio, um limite do framework, uma escolha que parece errada mas é de propósito.
- Comentário não repete o código, não conta história ("antes era…", "corrigido em…") e não guarda código desativado. O histórico está no git.

### 4. Cada regra mora num lugar só

| Onde                         | O quê                                                                       |
| ---------------------------- | --------------------------------------------------------------------------- |
| Banco (constraint, RLS, RPC) | O que nunca pode ser violado: transição de status, quem vê o quê, totais.   |
| `src/lib/<assunto>`          | Regras puras do front, sem React nem Supabase (`isLate`, `nextStep`).       |
| `src/lib/data`               | Acesso ao banco (ADR 0003).                                                 |
| Componentes                  | Mostrar e chamar. Nenhuma regra de negócio escrita dentro de um componente. |
| Rotas em `src/app`           | Ligar dados e actions ao template.                                          |

Se a mesma condição aparece em dois lugares, ela vira uma função com nome de propósito.

### 5. Abstração a partir do segundo uso real

- Função, hook ou componente compartilhado nasce no segundo uso real, não antes.
- Não se cria opção, prop ou variante que ninguém usa "para o futuro".
- Quando o uso some, a opção sai junto (ex.: o `variant` do `SegmentedControl` saiu quando ficou um visual só).

### 6. Tipos vêm da fonte

Tipos do banco saem de `database.types.ts` (`Enums<"order_status">`), JSON guardado no banco sai do schema zod (ADR 0003). Não se redeclara à mão uma união ou um formato que já existe.

### 7. Estado que a pessoa espera recuperar mora na URL

Busca, filtro, página e editor aberto ficam na URL (`?busca=`, `?produto=novo`). Assim o "voltar" fecha o editor, o link pode ser compartilhado e recarregar não perde o contexto. Estado passageiro (menu aberto, rascunho de campo) fica no componente.

### 8. Erro fala com a pessoa

- Server Action devolve `ActionResult`: sucesso ou a mensagem que a tela mostra. Não lança erro para a interface.
- A mensagem diz o que aconteceu e o que fazer, sem detalhe técnico e sem pedir desculpas ("Não foi possível copiar o link").
- Erro inesperado nunca é engolido: vai para o log (`errorMessage`) e a tela mostra a mensagem padrão.

### 9. Pendência vira issue

Não entra `TODO` nem `FIXME` no código. O que ficou para depois vira issue, com o motivo.

## Consequências

- Revisão de PR tem critério objetivo para nome, comentário e lugar de cada regra.
- Renomear pelo propósito é refatoração válida e pequena, feita quando o código é tocado.
- As regras de nome também valem para o banco: colunas curtas, com a tabela dando o contexto.
