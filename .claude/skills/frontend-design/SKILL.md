---
name: frontend-design
description: Orientação para um design visual marcante e intencional ao criar uma interface nova ou remodelar uma existente. Ajuda na direção estética, na tipografia e em escolhas que não pareçam padrão de template.
license: Termos completos em LICENSE.txt
---

# Design de frontend

Encare a tarefa como o líder de design de um estúdio conhecido por dar a cada cliente uma identidade visual própria, que não se confunde com a de ninguém. Esse cliente já recusou propostas que pareciam clichê ou de template e está pagando por um ponto de vista marcante: faça escolhas deliberadas e opinativas de paleta, tipografia e layout, específicas para este briefing, e assuma riscos estéticos quando fizer sentido.

## Baseie o design no assunto

Se o briefing não diz qual é o produto ou o assunto, identifique você mesmo antes de desenhar e confirme com o cliente. Você pode propor um assunto concreto, o público do design e a função principal dele. Se houver algo na sua memória sobre as preferências do cliente ou sobre o que ele está construindo, use como pista. O setor, o tema, os materiais e o vocabulário do assunto são de onde saem as escolhas visuais marcantes: o design de um brinquedo para meninas de 8 a 11 anos será esteticamente muito diferente de um dashboard para analistas financeiros. Use o conteúdo real e o assunto do briefing do começo ao fim.

## Princípios de design

Em páginas web, o destaque principal (hero) é a primeira coisa que as pessoas veem. Abra com o que há de mais característico no mundo do assunto, na forma mais adequada: um título, uma imagem, uma animação, uma demonstração ao vivo, um momento interativo ou outro tratamento. Escolha com intenção: um número grande com um rótulo pequeno, estatísticas de apoio e um destaque em degradê é o tratamento padrão, então só use se for mesmo a melhor opção.

A tipografia carrega a personalidade da página. Não é preciso uma fonte diferente para títulos e para o texto corrido: use uma ou duas famílias e, se forem duas, que sejam claramente distintas.

Escolha as fontes com intenção, não as famílias padrão que você usaria em qualquer outro projeto, e defina uma escala tipográfica clara seguindo as orientações de The Elements of Typographic Style, com pesos, larguras e espaçamentos intencionais. Quando o texto for usado como título ou elemento visual, faça do próprio tratamento tipográfico uma parte ativa do design, não um veículo neutro para o conteúdo.

Por padrão, mantenha linhas com menos de 80 caracteres. Fontes serifadas aceitam linhas um pouco mais longas; dê ao texto corrido serifado um pouco mais de entrelinha que a um sem serifa.

Evite estes tratamentos tipográficos padrão, que são os sinais mais comuns de uma página gerada:

- Destacar só uma palavra ou expressão num título, como deixar uma palavra em itálico, negrito ou outra cor.
- Usar caixa alta em rótulos.
- Pôr rótulos tipográficos desnecessários acima do conteúdo.

Estrutura visual é informação. Recursos estruturais como contornos, bordas, numeração, sobretítulos, divisores e rótulos devem transmitir algo útil sobre o conteúdo, não decorá-lo. Muitos designs genéricos usam marcadores numerados (01 / 02 / 03), mas isso só faz sentido se o conteúdo for de fato uma sequência, como um processo em etapas ou uma linha do tempo. Antes de numerar, confira se o conteúdo é mesmo uma sequência.

Use movimento que não foi disparado pela pessoa com moderação e intenção, só para chamar atenção. Um único momento orquestrado (uma sequência de carregamento da página ou uma revelação) funciona melhor que efeitos espalhados; entradas com fade e deslize em cada seção e transições de hover em todo card são o padrão genérico e parecem geradas por IA. Movimento que responde a uma ação da pessoa (abrir, expandir, confirmar) é bem-vindo quando mostra o que mudou.

Pense com cuidado no texto. Muitas vezes o briefing não traz o conteúdo real e cabe a você escrever os textos e o conteúdo provisório. O texto pode deixar um design com cara de template tanto quanto o próprio visual. Veja a seção sobre escrita mais abaixo.

## Processo: planejar, revisar contra o briefing, construir, criticar

Para calibrar: hoje o design gerado por IA se concentra em alguns traços:

1. fundo creme quente (perto de #F4F1EA) com um título serifado de alto contraste e um destaque terracota ou argila (muitas vezes perto de #D97757, o destaque da própria Anthropic nas interações com o Claude, então no briefing de um cliente isso denuncia a origem);
2. fundo quase preto com um único destaque verde-ácido ou vermelhão;
3. layout de jornal, com filetes finos, cantos retos e colunas densas;
4. o kit de cards de SaaS: conteúdo picado em cards arredondados idênticos, o mesmo raio em tudo independentemente da hierarquia, a mesma sombra cinza suave (rgba(0,0,0,.1)) embaixo de cada um e degradês como decoração;
5. elementos de template que aparecem qualquer que seja o assunto: um sobretítulo em CAIXA ALTA espaçada acima de cada título; metadados unidos por pontos médios ('A · B · C'); rótulos no formato 'PALAVRA — fragmento' com travessão espaçado; quase preto com tom (#0B0B0B, #111) no lugar do preto; fonte monoespaçada para rótulos pequenos de dados; uma '→' no fim do texto de links e botões.

Todos esses traços são legítimos para algum briefing, mas são padrões e não escolhas, e aparecem seja qual for o assunto. Onde o briefing define uma direção visual, siga exatamente: as palavras do briefing sempre vencem, inclusive quando ele pede um desses visuais. Onde ele deixa um eixo livre, não gaste essa liberdade com um desses padrões. Como com um designer humano contratado, muitas vezes é preciso equilibrar fazer aquilo em que você é bom com aproveitar cada projeto para experimentar e aprender.

Trabalhe em duas passadas. Primeiro, faça um plano de design curto a partir do briefing do cliente: um sistema de tokens compacto com cor, tipografia, layout e princípios.

- Cor: descreva a paleta base em 4 a 6 valores hex com nome.
- Tipografia: as fontes e o papel de cada uma.
- Layout: um conceito de layout, com descrições de uma frase e wireframes em ASCII para gerar ideias e comparar. Inclua a orientação de alinhamento: o conteúdo fica alinhado à esquerda, centralizado ou justificado?
- Princípios: as orientações gerais do que torna esta página única.

Depois revise o plano contra o briefing antes de construir: se alguma parte parecer o padrão genérico que você produziria para qualquer página parecida (pense num pedido semelhante e veja se chegaria a algo parecido) em vez de uma escolha feita para este briefing específico, revise essa parte e diga o que mudou e por quê. Só comece a escrever o código depois de confirmar que o plano é relativamente único, seguindo o plano revisado.

Ao escrever o código, cuide da especificidade dos seletores CSS. É fácil gerar classes que se anulam (principalmente um seletor por tipo, como .section, contra um seletor por elemento, como .cta). Isso acontece muito com padding e margin entre seções.

## Contenção e autocrítica

Gaste a ousadia em um lugar só. Deixe um elemento ser o memorável, mantenha tudo em volta quieto e disciplinado e corte qualquer decoração que não sirva ao briefing. Construa com um patamar mínimo de qualidade sem anunciar: responsivo até o celular, foco de teclado visível, respeito a movimento reduzido, acessível visualmente e paletas harmoniosas. Critique seu trabalho enquanto constrói, tirando capturas de tela para revisar se o ambiente permitir: uma imagem vale mais que 1000 tokens. Lembre do conselho da Chanel: antes de sair de casa, olhe no espelho e tire um acessório. Criativos humanos têm memória e sempre tentam algo novo; se você tiver onde anotar rapidamente o que já tentou, isso ajuda nas próximas passadas.

## Mais sobre escrita no design

Palavras aparecem num design por um motivo: deixar mais fácil de entender e de usar. São conteúdo de design, não decoração. Traga para o texto a mesma intenção e o mesmo minimalismo que você traz para espaçamento e cor. Antes de escrever, pergunte o que o design precisa dizer e qual a melhor forma de dizer para ajudar a pessoa a se orientar.

Escreva do ponto de vista de quem usa. Dê às coisas nomes que as pessoas entendem, em linguagem simples, e não pelo jeito como o sistema foi construído. A pessoa gerencia notificações, não configuração de webhook. Descreva o que algo é ou faz em termos claros, sem vender. Ser específico e compreensível para quem chega agora é sempre melhor que ser espirituoso.

Use voz ativa por padrão. Um botão diz exatamente o que acontece ao usá-lo: "Salvar alterações", não "Enviar". Uma ação mantém o mesmo nome em todo o fluxo, então o botão "Publicar" gera um aviso que diz "Publicado". O vocabulário de uma interface é a sinalização para quem navega no produto; coesão e consistência são como as pessoas aprendem o caminho.

Trate falhas e telas vazias como momentos de orientar, não de criar clima. Explique o que deu errado e como resolver, na voz da interface e não de uma pessoa. Erros não pedem desculpas e nunca são vagos sobre o que aconteceu. Uma tela vazia é um convite para agir.

Mantenha o tom de conversa: verbos simples, só a primeira letra maiúscula, sem enrolação, com o tom ajustado à marca e ao público. Cada elemento escrito faz exatamente uma coisa.
