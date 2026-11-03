# ADR 0004: testes E2E

- Status: aceito
- Data: 2026-11-03

## Contexto

O pgTAP (ADR 0002) cobre as regras do banco, mas não pega uma tela que deixou de salvar, um redirecionamento errado ou um formulário que não envia. Com o painel e o cardápio crescendo em paralelo, cada PR precisa chegar com a garantia de que o caminho que ele mexe funciona no navegador.

## Decisão

### Ferramenta

Playwright, só no Chromium. Testes em `e2e/`, configuração em `playwright.config.ts`.

Os testes rodam sempre contra o Supabase local, com todas as migrations e o `supabase/seed.sql`. Nunca contra o projeto de dev: eles criam dados. O `playwright.config.ts` lê URL e chaves do `supabase status` e se recusa a rodar se a URL não for local.

```bash
npx supabase start        # uma vez; aplica migrations e seed
npm run test:e2e          # sobe o Next na porta 3100 e roda os testes
npm run test:e2e:ui       # modo interativo, para escrever e depurar
```

Localmente precisa de Docker, como o `supabase test db`. No GitHub, o workflow `.github/workflows/testes-e2e.yml` faz o mesmo do zero em todo PR: Supabase local, build de produção do Next e os testes. Quando falha, o relatório do Playwright (com trace e print) fica nos artefatos do run.

### Um arquivo por assunto

Mesma regra do ADR 0002: o nome diz o que o arquivo testa, nunca a task. `panel-login.spec.ts`, `panel-categories.spec.ts`, `menu-checkout.spec.ts`. Nome de arquivo e código em inglês; descrição dos testes em português.

```
e2e/
  auth.setup.ts           entra como dono da loja do seed e guarda a sessão
  support/seed.ts         dados do seed usados nos testes
  support/panel.ts        ações repetidas do painel (login etc.)
  panel-login.spec.ts
```

### Quando, então

A descrição de cada teste diz a situação e o resultado, separados por `→`:

```ts
test("senha errada → mostra o erro e continua no login", async ({ page }) => {
```

O `test.describe` diz a tela ou o fluxo (`"login do painel"`).

### Sessão do painel

O projeto `setup` entra uma vez com `dono@stackburguer.test` e grava a sessão em `e2e/.auth/owner.json` (fora do git). Todo teste já começa logado como dono da Stack Burguer. Quem precisa começar sem sessão usa:

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

Nenhum teste faz logout do usuário do seed: o logout do Supabase encerra todas as sessões do usuário e derrubaria os testes que rodam em paralelo. Teste de logout cria o próprio usuário.

### Dados

- O seed é a base comum e ninguém altera os registros dele num teste.
- Quem precisa de dados próprios cria pela tela, com nome único (ex.: `Categoria ${Date.now()}`), e procura só pelo que criou.
- Os testes rodam em paralelo e em qualquer ordem; nenhum depende do resultado de outro.
- O banco não é limpo entre testes. No CI ele nasce do zero a cada run; localmente, `npx supabase db reset` volta ao seed.

### Seletores

Pelo que a pessoa vê: `getByRole`, `getByLabel`, `getByText`. `data-testid` só quando não há texto nem papel acessível que identifique o elemento.

## Consequências

- Tela nova ou fluxo alterado vem com teste E2E no mesmo PR.
- Um teste que só passa com um seletor frágil é sinal de que a tela precisa de rótulo acessível.
- O workflow E2E é o mais lento do CI (alguns minutos, a maior parte subindo o Supabase).
