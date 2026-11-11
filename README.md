# Cardápio digital

Next.js + Supabase, hospedado na Vercel.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha URL e publishable key do Supabase de dev
npm run dev
```

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

## Vercel

Projeto ligado a este repositório, região `gru1` (São Paulo, ver `vercel.json`). Cada PR ganha um preview; `main` vai para produção.

Por enquanto no plano Hobby (gratuito), o que exige o repositório público e não permite uso comercial: antes do piloto rodar, o projeto passa para o Pro (T36). Endereço atual: https://cardapio-frontend-roan.vercel.app (cardápio em `/stack-burguer`, painel em `/painel`, sem domínio próprio até a T36).

Não use a integração Supabase da Vercel: ela cria variáveis com outros nomes e liga um único projeto a todos os ambientes. Cadastre as variáveis abaixo à mão.

Variáveis de ambiente (Production e Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` (esta sem `NEXT_PUBLIC_`, marcada como Sensitive, nunca vai para o navegador). Hoje as duas apontam para o Supabase de dev; na T36, Production passa para o projeto de produção.
