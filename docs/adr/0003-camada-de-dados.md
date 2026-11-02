# ADR 0003: camada de dados

- Status: aceito
- Data: 2026-10-31

## Contexto

O front fala direto com o Supabase, sem API no meio. Se cada página montar suas próprias consultas, regras como "o que é uma loja aberta" ou "quanto custa a entrega" se espalham pelo código e a chave secreta pode acabar importada num componente do navegador.

## Decisão

Todo acesso ao banco passa por `src/lib/data/`. Páginas e componentes importam funções de lá, nunca o Supabase.

```
src/lib/supabase/   clientes (só lib/data usa)
  browser.ts   componentes "use client"; chave pública, passa pelo RLS
  server.ts    Server Components, Server Actions, Route Handlers; sessão dos cookies, passa pelo RLS
  admin.ts     chave secreta, ignora o RLS; só tarefas sem usuário (ex.: push)
  session.ts   renova a sessão do painel, chamado por src/proxy.ts
src/lib/data/       único ponto de acesso, um arquivo por assunto
```

Regras:

1. O ESLint (`eslint.config.mjs`) acusa erro em import de `@supabase/*` ou de `src/lib/supabase` fora de `src/lib/data` e `src/lib/supabase`.
2. Prefira `server.ts` ou `browser.ts`, que respeitam o RLS. `admin.ts` só quando não existe usuário logado que possa fazer a operação.
3. A chave secreta (`SUPABASE_SECRET_KEY`) nunca leva o prefixo `NEXT_PUBLIC_`. `admin.ts` e `server.ts` importam `server-only`: o build falha se um componente do navegador chegar neles.
4. JSON guardado no banco (como `stores.settings`) tem schema zod em `src/lib/data`, que é a lista oficial das chaves. Chave nova entra primeiro no schema.

## Consequências

- Trocar uma consulta ou regra mexe num arquivo só.
- Componente do navegador que precisa de dados (carrinho, quadro de pedidos em tempo real) chama uma função de `src/lib/data` que usa `browser.ts`.
- `src/proxy.ts` roda em toda requisição para renovar a sessão do painel. Sem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` definidas, o site inteiro responde erro.
