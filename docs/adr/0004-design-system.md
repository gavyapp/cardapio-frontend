# ADR 0004: design system do front

- Status: proposto (falta a revisão do Tartare)
- Data: 2026-11-09

## Contexto

O painel tinha duas linguagens visuais: as telas de pedidos seguiam o protótipo (cantos de 4px, controles de 36/44px) e as de catálogo, configurações e login herdavam os padrões do shadcn (cantos de 6, 8, 10 e 14px, texto de 14px). O tema só tinha tokens de cor; canto e tamanho de texto eram escritos à mão em cada tela (`rounded-[4px]`, `text-[13px]`) e variavam. A jornada do cliente vai usar os mesmos átomos com outro tema, então a regra precisa existir antes dela.

## Decisão

1. **O protótipo v9 é a fonte dos valores visuais.** Nenhuma tela inventa tamanho, canto, cor ou sombra. A página "Componentes do painel" do protótipo resume os tokens.

2. **Tokens** (em `src/app/globals.css`), sempre pelo nome:

   | Token                | Valor no painel | Uso                                         |
   | -------------------- | --------------- | ------------------------------------------- |
   | `text-caption`       | 12px            | legenda, cabeçalho de tabela, selo          |
   | `text-support`       | 13px            | texto secundário, rótulo, ajuda             |
   | `text-body`          | 15px            | texto padrão, campos, botões, menus         |
   | `text-section-title` | 18px            | título de seção e de modal                  |
   | `text-page-title`    | 24px            | título da página                            |
   | `text-big-number`    | 40px            | número grande                               |
   | `rounded-control`    | 4px             | botão, campo, card, selo, miniatura         |
   | `rounded-surface`    | 8px             | modal, menu, painel, tabela, bloco de lista |
   | `rounded-full`       | círculo         | switch, etapa, avatar                       |

   Pesos: 400, 500 e 600. Espaçamento e alturas em múltiplos de 4 (escala do Tailwind). Controles: 44px (padrão) e 36px no computador (compacto, para cabeçalhos, filtros e cards). Sombra só em modal, menu e toast (`shadow-elevated`). Cores pelos tokens do tema (`text-muted-foreground`, `bg-warning-soft`, `border-border-strong`…), nunca hex; token de cor tem nome pelo papel na paleta, não pela tela que o usa (ADR 0005).

3. **Duas superfícies, um conjunto de átomos.** O painel usa os valores acima. O cardápio do cliente sobrescreve as variáveis no layout da loja (`src/lib/store/theme.ts`): cor, fonte e cantos (`--control-radius`, `--surface-radius`). Nenhum componente sabe em qual superfície está.

4. **Onde o estilo mora.** Valores base ficam nos átomos (`src/components/atoms`). Telas usam as variantes e os tokens, nunca valor solto (`text-[13px]`, `rounded-[4px]`, `rounded-lg`, `text-sm`). Átomo novo do `shadcn add` é ajustado aos tokens ao entrar. O `cn` de `src/lib/utils.ts` conhece os tokens; importe dele, não do pacote `cn`.

5. **Atomic Design** em `src/components`: `atoms` (primitivos e peças indivisíveis), `molecules` (composições pequenas), `organisms` (seções, cabeçalhos, listas, editores), `templates` (esqueleto de página) e `providers` (estado compartilhado por contexto, como os pedidos em tempo real e o formulário das configurações). Um trecho vira componente compartilhado a partir do segundo uso real, não antes.

6. **Breakpoints:** `sm` (640px) para o respiro da página e `lg` (1024px) para o layout de computador.

## Consequências

- Mudar um padrão (ex.: o texto secundário) mexe num token, não em 40 arquivos.
- Revisão de tela tem critério objetivo: valor fora da tabela é erro.
- Os valores do cardápio do cliente (10 e 14px hoje) são confirmados no protótipo pela jornada do cliente.
- Exceções (larguras fixas de gaveta, alturas de linha específicas) continuam permitidas quando o protótipo pede.
