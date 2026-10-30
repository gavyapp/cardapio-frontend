# Cardápio digital

Next.js + Supabase, hospedado na Vercel.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha URL e publishable key do Supabase de dev
npm run dev
```

## Supabase

A CLI vem como dependência de dev (`npx supabase ...`). Projeto de dev: `evvisoyaehtvgzvqapmv`.

```bash
npx supabase login    # uma vez por máquina, abre o navegador
npm run db:link       # pede a senha do banco (Supabase > Project Settings > Database)
npm run db:types      # gera src/lib/database.types.ts a partir do banco linkado
```

Migrations ficam em `supabase/migrations/`. Mudança no banco só entra por migration em PR.

## Vercel

Projeto ligado a este repositório, região `gru1` (São Paulo, ver `vercel.json`). Cada PR ganha um preview; `main` vai para produção.

Variáveis de ambiente (Production e Preview): `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
