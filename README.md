# Cardápio digital

Next.js + Supabase, hospedado na Vercel.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha URL e publishable key do Supabase de dev
npm run dev
```

## Testes

```bash
npm test          # testes de unidade (Vitest), uma vez
npm run test:watch
```

Testes de unidade ficam ao lado do código, em `src/**/*.test.ts`, e cobrem funções puras de `src/lib`. O CI roda junto com lint, typecheck e build. Os testes do banco são pgTAP (seção Supabase).

## Git

Branches, commits e PRs seguem o padrão descrito em `CLAUDE.md` (seção "Padrão git"). O `npm install` ativa um hook que avisa quando algo foge do padrão, sem bloquear.

## Supabase

A CLI vem como dependência de dev (`npx supabase ...`). Projeto de dev: `evvisoyaehtvgzvqapmv`.

```bash
npx supabase login    # uma vez por máquina, abre o navegador
npm run db:link       # pede a senha do banco (Supabase > Project Settings > Database)
npm run db:types      # gera src/lib/database.types.ts a partir do banco linkado
```

O código acessa o banco só por `src/lib/data/` (ver `docs/adr/0003-camada-de-dados.md`).

Migrations ficam em `supabase/migrations/`. Mudança no banco só entra por migration em PR; passo a passo em `docs/adr/0001-banco-so-muda-por-migration.md`. Testes do banco em `supabase/tests/database/` (`npx supabase test db`); padrão em `docs/adr/0002-testes-do-banco.md`. O GitHub Actions roda esses testes em todo PR que mexe em `supabase/` (workflow "Testes do banco") e, depois do merge, aplica as migrations novas no dev (workflow "Aplicar migrations", secret `SUPABASE_DEV_DB_URL`).

A primeira (`20261031013000_schema_base.sql`) versiona o schema que já existia no projeto de dev, criado pelo dashboard. Lá ela não deve rodar de novo, só ser marcada como aplicada (uma vez):

```bash
npx supabase migration repair --status applied 20261031013000 --linked
```

### Dados de exemplo

`supabase/seed.sql` cria a Stack Burguer com o cardápio real (categorias, produtos, complementos e horários) e um login do painel: `dono@stackburguer.test` / `stack1234`. Roda sozinho no `supabase db reset` local. No projeto de dev, rode uma vez a partir da main:

```bash
npx supabase db push --linked --include-seed
```

Nunca em produção: a senha está no repositório. Se a loja `stack-burguer` já existe, o seed não faz nada.

### Criação de pedido

O cliente cria o pedido por `POST /api/pedidos`, sem login. O contrato de entrada e saída, com os códigos de erro, fica em `src/lib/orders/create-order.ts`; o checkout e a rota importam de lá. O navegador manda só ids e quantidades: preço, taxa e total são calculados pelo `create_order`.

A rota confere um limite de tentativas antes de chamar o banco: 5 em 10 minutos, por IP e por telefone, respondendo 429. As tentativas ficam na tabela `order_attempts`, com IP e telefone embaralhados por um segredo do servidor (a `SUPABASE_SECRET_KEY`), nunca em texto. Trocar essa chave zera os limites em andamento, sem outro efeito.

Cada recusa do `create_order` leva um código estável no `HINT` do erro (`store_closed`, `item_unavailable`, `minimum_order`…) e, nas recusas de item, o id do produto no `DETAIL`. Recusa nova no banco precisa do código lá e da tradução em `refusalFromDatabase`; um teste de unidade falha se faltar.

## Vercel

Projeto ligado a este repositório, região `gru1` (São Paulo, ver `vercel.json`). Cada PR ganha um preview; `main` vai para produção.

Variáveis de ambiente (Production e Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` (esta sem `NEXT_PUBLIC_`, nunca vai para o navegador).
