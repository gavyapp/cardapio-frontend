# ADR 0001: o banco só muda por migration

- Status: aceito
- Data: 2026-10-31

## Contexto

O schema foi criado pelo dashboard do Supabase, sem histórico nem revisão. A T03 versionou esse estado na migration base `supabase/migrations/20261031013000_schema_base.sql`, já marcada como aplicada no projeto de dev.

## Decisão

Toda mudança de estrutura no banco (tabela, coluna, índice, função, trigger, policy, bucket, grant) entra por um arquivo em `supabase/migrations/`, revisado em PR. O dashboard serve só para consultar dados e estrutura.

### Passo a passo

1. Criar o arquivo:
   ```bash
   npx supabase migration new descricao_curta
   ```
   Gera `supabase/migrations/<AAAAMMDDHHMMSS>_descricao_curta.sql` vazio. O prefixo de data define a ordem de execução.
2. Escrever o SQL da mudança no arquivo. Use nomes qualificados (`public.products`).
3. Aplicar no projeto de dev:
   ```bash
   npx supabase db push --linked
   ```
   Roda só as migrations que ainda não estão no histórico do banco.
4. Regenerar os tipos:
   ```bash
   npm run db:types
   ```
5. Commitar a migration junto com `src/lib/database.types.ts` e abrir o PR.

Para conferir o que está aplicado: `npx supabase migration list --linked`.

Nenhum desses passos precisa de Docker. Ele só é necessário para rodar um Supabase local (`supabase start`, `db reset`, `db diff`).

### Regra de ouro

**Migration aplicada não se edita.** Depois que uma migration rodou em algum banco, o arquivo fica congelado. Para corrigir ou desfazer algo, crie uma migration nova.

O histórico do banco guarda só a versão de cada migration, não o conteúdo. Editar um arquivo já aplicado faz o repo e o banco divergirem sem nenhum aviso: o dev continua com o SQL antigo e um banco novo (produção, por exemplo) recebe o SQL editado.

## Consequências

- Qualquer banco novo (produção, T36) é criado rodando as migrations em ordem e fica igual ao de dev.
- Mudanças feitas pelo dashboard se perdem ou quebram o próximo `db push`. Se acontecer por engano, transforme a mudança em migration e marque como aplicada com `npx supabase migration repair --status applied <versão> --linked`.
- `database.types.ts` sempre acompanha a migration no mesmo PR.
