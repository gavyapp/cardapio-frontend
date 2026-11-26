# ADR 0006: formato das promoções

- Status: proposto (falta a revisão do Tartare)
- Data: 2026-11-24

## Contexto

A tabela `promotions` nasceu com `kind` livre e `rule` e `schedule` em JSON vazio. O cálculo no banco, o cardápio e a tela de promoções precisam ler o mesmo formato, e uma promoção mal gravada (pela tela ou direto pela API) mudaria o preço que o cliente paga. O protótipo v9 define os tipos, as regras e os períodos que o painel oferece.

## Decisão

### Tipos

`promotions.kind` aceita três valores, os mesmos do assistente "Nova promoção" do protótipo:

| kind               | No painel                            | O que faz                                                |
| ------------------ | ------------------------------------ | -------------------------------------------------------- |
| `product_discount` | Desconto em produtos                 | Muda o preço dos produtos escolhidos                     |
| `free_delivery`    | Entrega grátis                       | Zera a taxa de entrega a partir de um subtotal           |
| `order_discount`   | Desconto no pedido acima de um valor | Tira um valor ou uma % do pedido a partir de um subtotal |

Tipo novo entra com migration (check `promotions_kind_check` e função `private.promotion_rule_is_valid`), o schema zod em `src/lib/data/promotions.ts` e uma atualização deste ADR.

### Regra (`rule`)

Valores em reais, número JSON com até 2 casas. Nenhuma chave além das listadas.

```json
// product_discount
{ "mode": "percent", "value": 20 }        // 20% de desconto
{ "mode": "amount_off", "value": 5 }      // R$ 5 a menos
{ "mode": "fixed_price", "value": 37 }    // novo preço R$ 37

// free_delivery
{ "min_subtotal": 70 }                    // pedidos a partir de R$ 70
{ "min_subtotal": 0 }                     // qualquer pedido com entrega

// order_discount
{ "min_subtotal": 100, "mode": "amount_off", "value": 10 }  // R$ 10 off acima de R$ 100
{ "min_subtotal": 80, "mode": "percent", "value": 10 }      // 10% off acima de R$ 80
```

- `value` sempre maior que 0; em `percent`, menor que 100.
- `min_subtotal` maior ou igual a 0; em `order_discount`, maior que 0, e o desconto em reais menor que ele.

### Produtos (`promotion_products`)

Os produtos de uma promoção `product_discount` ficam em `promotion_products (store_id, promotion_id, product_id)`, com chaves compostas pelo `store_id`: promoção e produto precisam ser da mesma loja. Só promoção de produto tem linhas ali; para trocar o tipo de uma promoção, apague os produtos antes, na mesma transação. O público lê os produtos das promoções ligadas e não excluídas; os membros da loja gerenciam.

### Período (`schedule`)

Tudo no fuso de São Paulo, como `is_store_open`.

```json
{ "type": "always" }
{ "type": "weekly", "weekdays": [5, 6, 0] }
{ "type": "weekly", "weekdays": [1, 2, 3, 4, 5], "from": "18:00", "to": "20:00" }
{ "type": "dates", "start": "2026-12-01", "end": "2026-12-24" }
```

- `always`: "Sempre".
- `weekly`: "Dias e horários". `weekdays` de 0 (domingo) a 6 (sábado), sem repetir, pelo menos um. Sem `from` e `to`, vale o dia todo. Com eles (os dois, `"HH:MM"`), vale de `from` inclusive até `to` exclusive, e `from` vem antes de `to`: não atravessa a meia-noite.
- `dates`: "Entre datas". De `start` a `end`, dias inteiros, `start` até `end`.

### Liga e desliga

`is_active` é o botão da lista de promoções. O status mostrado no painel sai de `is_active` e `schedule`: **Pausada** (desligada), **Ativa agora**, **Agendada** (fora do dia ou do horário, ou antes do início) e **Encerrada** (depois do fim, só em `dates`). `deleted_at` é a exclusão.

### Como o desconto se aplica

- **Preço do produto:** `percent` = preço × (1 − value/100); `amount_off` = preço − value; `fixed_price` = value. Arredonda para centavos (meio para cima). Só vale se o resultado ficar maior que 0 e menor que o preço cheio; senão o produto segue com o preço cheio.
- **Um produto, uma promoção:** o painel não deixa o mesmo produto em duas promoções de produto ligadas e não encerradas. Se mesmo assim duas valerem no mesmo momento, vale o menor preço final; empate, a criada primeiro.
- **Subtotal das promoções de pedido:** soma dos itens já com o desconto de produto, sem a taxa de entrega.
- **Entrega grátis:** só em pedido com entrega. Basta uma promoção `free_delivery` vigente com `min_subtotal` alcançado.
- **Desconto no pedido:** entre as `order_discount` vigentes com `min_subtotal` alcançado, vale a de maior desconto em reais. `percent` arredonda para centavos. Soma com o desconto de produto e com a entrega grátis.
- **Entrega grátis em `stores.settings.free_delivery_above`:** passa a ser uma promoção. Quando o cálculo das promoções entrar no `create_order`, a chave sai das configurações e a loja que a tinha ganha uma promoção `free_delivery` sempre ligada com o mesmo mínimo.

### Onde a regra vive

- Banco: checks `promotions_kind_check`, `promotions_rule_check` e `promotions_schedule_check` e o trigger de `promotion_products`. Recusam o que está fora do formato, com código `23514`.
- Front: `src/lib/data/promotions.ts`, com as mesmas regras e mensagens em português para o formulário.
- Testes: `supabase/tests/database/formato_das_promocoes.test.sql` e `src/lib/data/promotions.test.ts`.

## Consequências

- Uma promoção fora do formato não chega ao banco, venha da tela ou da API.
- O cálculo lê produtos por `join`, sem abrir JSON.
- O check não conhece o preço do produto: a tela avisa quando o desconto não baixa o preço ("O preço com desconto de X precisa ficar entre R$ 0,00 e R$ Y"), e o cálculo ignora o produto nesse caso.
