# ADR 0002: testes do banco

- Status: aceito
- Data: 2026-10-31

## Contexto

As regras de negócio que mais importam vivem no banco: RLS, funções como `create_order` e `update_order_status`, permissões por coluna. O front chama o Supabase direto, então um erro nessas regras não é pego por nenhuma camada no meio. Os testes precisam ser fáceis de achar e de ler meses depois, quando ninguém lembra da task que os criou.

## Decisão

### Ferramenta

Testes em SQL com pgTAP, em `supabase/tests/database/`. Cada arquivo roda dentro de uma transação que termina em `rollback`, então os dados de teste nunca ficam no banco.

```bash
npx supabase test db
```

Precisa do Supabase local (Docker). O CI deve rodar os mesmos testes a cada PR.

### Um arquivo por assunto

O nome do arquivo diz o que ele testa, nunca a task ou o bug que o motivou: `loja_aberta.test.sql`, `criar_pedido.test.sql`, `permissoes_da_loja.test.sql`. O mesmo vale para comentários no SQL: explicam o comportamento, sem códigos como "T04" ou "B3". Código de task fica só no PR, na branch e no commit.

Cada arquivo cria os próprios dados. Não há dados compartilhados entre arquivos.

### Dado, quando, então

- **Dado:** um comentário `-- Dado: ...` em cima de cada bloco de dados, dizendo o cenário.
- **Quando → então:** a descrição de cada teste diz a situação e o resultado esperado, separados por `→`.

```sql
-- Dado: loja que abre sexta 18:00 e fecha sábado 02:00
insert into public.stores ...;
insert into public.store_hours ...;

select ok(
  public.is_store_open('...', '2026-10-31 04:00Z'),
  'sábado 01:00 → aberta (turno de sexta)'
);
```

Quando um teste falha, a linha do resultado já mostra o cenário e o esperado, sem abrir o arquivo.

### Usuário logado

Para testar como membro de uma loja, troque o papel e informe o usuário do token dentro da transação:

```sql
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims', '{"sub": "<uuid do usuário>", "role": "authenticated"}', true);
end $$;
```

## Consequências

- Toda migration que muda regra de negócio ou permissão vem com teste no mesmo PR.
- Achar o teste de uma regra é procurar pelo assunto no nome do arquivo.
- Um teste que falha no CI já diz o que quebrou pela descrição.
