# PACE

Diretivas de design para um projeto web de corrida de rua. A ideia central: **performance com clareza**. A energia vem do contraste extremo entre preto e branco, da tipografia condensada e dos números grandes; a clareza vem do espaço em branco, das linhas finas e da disciplina em usar poucos elementos por tela.

Referências: a leitura de dados da **Suunto** (métricas grandes, interface silenciosa, muito respiro, tema escuro de primeira classe) e a atitude gráfica da **Adidas** (caixa-alta condensada, blocos pretos chapados, cantos retos, fotografia de ação protagonista). Não copiamos nenhum elemento de marca das duas; pegamos a lógica.

## Princípios

1. **O número é o herói.** Pace, tempo e distância são o conteúdo mais importante da tela. Aparecem em `metric-xl`, cor `ink`, com a unidade ao lado em `label` e `ink-muted`.
2. **Contraste é o acento.** Não existe cor de marca. O destaque é feito invertendo o bloco (`inverse` + `on-inverse`). Um bloco invertido grande por tela; se tudo é destaque, nada é. A única exceção de matiz são as cores semânticas `positive` (verde) e `negative` (vermelho), reservadas para o significado de um dado, nunca para destaque ou decoração.
3. **Linhas, não sombras.** Profundidade vem de `line` (1px) e da troca `bg` → `surface`. Sem sombras, sem gradientes, sem glassmorphism.
4. **Velocidade na forma, calma na leitura.** Display condensado e itálico opcional para impacto; Inter regular e bem espaçada para todo texto que precisa ser lido.
5. **Respiro generoso.** Seções separadas por `space-24` no desktop. Na dúvida, mais espaço, não mais conteúdo.

## Cor

Nove tokens neutros (sem matiz) e quatro semânticos, em dois temas: **Claro** (padrão para conteúdo editorial, inscrições, blog) e **Escuro** (padrão para dashboards de treino, resultados ao vivo e páginas de evento à noite). O tema escuro não é um "inverso automático": `bg` escuro é `#0A0A0A`, não preto puro, para reduzir o smear em telas OLED.

- Página: `bg`. Cards e faixas: `surface`. Hover/pressed e trilhos de gráfico: `surface-strong`.
- Texto: `ink` (principal), `ink-muted` (apoio, unidades), `ink-subtle` (labels, metadados; só sobre `bg` e `surface`).
- Destaque: `inverse` com texto `on-inverse` — botão primário, hero sem foto, card de "recorde pessoal", faixa de resultado.
- Proporção de uso aproximada no tema claro: 70% `bg`/`surface`, 20% `ink`, 10% `inverse`.

**Cores semânticas.** Verde e vermelho dizem se um dado favorece ou pesa para o corredor, sempre do ponto de vista do esforço:

- `negative` (vermelho): subida, pace mais lento que o plano, piora de tempo.
- `positive` (verde): descida, pace mais rápido que o plano, melhora de tempo.
- `positive-subtle` e `negative-subtle`: fundos e preenchimentos (faixas de gráfico, badges), com texto em `positive`/`negative` ou `ink` por cima.
- Valores próximos de zero ficam em `ink`: uma inclinação de ±0,3% não é subida nem descida.
- A cor nunca é a única pista: acompanhe sempre o sinal (+/−) ou o ícone de seta (`arrow-up` mais lento/piora, `arrow-down` mais rápido/melhora).
- Nunca use em botões, links, títulos, ícones decorativos ou blocos `inverse`; sobre `inverse`, o texto volta a `on-inverse`.
- No máximo uma coluna ou série colorida por componente, para o verde e o vermelho não disputarem com os números.

**Estados sem cor.** Estados de interface continuam sem matiz, comunicados por forma e texto: erro = borda `ink` de 2px + ícone + mensagem; sucesso = bloco `inverse` com ícone de check. Verde e vermelho são para dados, não para validação de formulário. Nunca dependa só de tom de cinza para diferenciar séries em gráficos: use tracejado vs. sólido, espessura e rótulo direto.

## Tipografia

Três famílias do Google Fonts, cada uma com um papel só:

- **Barlow Condensed** (display, 700–800, sempre caixa-alta) — `display-xl`, `display-l`, `heading`. Herda o DNA do DIN usado em sinalização e no esporte. Itálico permitido apenas no `display-xl` do hero, para sugerir movimento.
- **Inter** (texto) — `title`, `body`, `small`, `label`. Neutra e extremamente legível em telas pequenas, ao ar livre, em movimento.
- **JetBrains Mono** (dados) — `metric-xl`, `metric`. Dígitos de largura fixa: um cronômetro rodando não faz o layout tremer. Alternativa aceitável: Inter com `font-variant-numeric: tabular-nums`.

Regras: no máximo três tamanhos por card; a unidade nunca tem o mesmo tamanho do número (`4:52` em `metric-xl`, `MIN/KM` em `label`); títulos display nunca passam de três linhas; `body` com linha de até 68 caracteres.

## Layout e grid

Grid de 12 colunas no desktop (máx. 1280px, gutter `space-6`), 4 colunas no mobile (gutter `space-4`). Base de 8px para tudo. Cantos retos (`radius-0`) em botões, cards e imagens; `radius-pill` só em chips e tags de distância (5K · 10K · 21K · 42K); `radius-sm` em campos e na moldura de mapas.

Composições recomendadas: hero com foto sangrando a tela e título `display-xl` sobreposto em `on-inverse`; grids de métricas com divisores `line` entre células (em vez de cards separados); listas de provas como tabelas limpas, uma linha `line` entre itens.

## Componentes (diretivas)

- **Botão primário**: fundo `inverse`, texto `on-inverse` em `label` (caixa-alta), altura 48px, `radius-0`. Hover: inverte para `bg` com borda 2px `ink`.
- **Botão secundário**: fundo `bg`, borda 1px `ink`, mesmo texto. Link-botão terciário: sublinhado 2px com offset 4px.
- **Card de métrica**: `surface`, padding `space-6`, `label` em cima (`ink-subtle`), `metric-xl` embaixo, unidade em `label`. Sem ícone decorativo.
- **Chip de filtro**: `radius-pill`, borda 1px `line`; selecionado = `inverse`.
- **Barra de progresso / splits**: trilho `surface-strong`, preenchimento `ink`, altura 4px, `radius-sm`.
- **Foco**: contorno 2px `ink` com offset 2px em todos os elementos interativos, nos dois temas.

## Iconografia

[Feather Icons](https://feathericons.com) (MIT): traço de 1.5px (2px abaixo de 20px), terminais e junções arredondados como no original, grid de 24px, sem preenchimento. Ícones sempre em `ink` ou `on-inverse`, nunca em cinza claro. Setas e chevrons são o motivo recorrente: indicam direção e ritmo. Setas de tendência são sempre ícones (`arrow-up`/`arrow-down`), nunca caracteres como ▲/▼, que mudam de forma e tamanho conforme a fonte.

## Fotografia

Preto e branco ou dessaturada, alto contraste, grão leve. Corredores reais em movimento, ruas e asfalto, luz dura de manhã cedo. Cortes agressivos (pernas, tênis, respiração) e muito espaço negativo para sobrepor tipografia. Nada de sorrisos posados de banco de imagem.

## Movimento

Rápido e decidido: 150–200ms, easing `cubic-bezier(0.2, 0, 0, 1)`. Números animam contando (count-up) ao entrar na tela; nada quica, nada gira. Respeitar `prefers-reduced-motion`.

## Voz

Frases curtas, verbos no imperativo, números concretos. "Largada 6h30. Kit no sábado." em vez de "Não perca a oportunidade de participar!". Títulos em caixa-alta condensada; corpo em frase normal.


---

# Tokens

Use estes nomes como variáveis CSS (`--nome`). Fontes via Google Fonts: Barlow Condensed (700, 800, 800 itálico), Inter (400, 600), JetBrains Mono (500).

## Cores

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#0A0A0A` | Fundo da página. O branco puro (ou quase-preto no tema escuro) é o respiro do layout. |
| `surface` | `#F4F4F4` | `#161616` | Cards, faixas de seção, campos de formulário em repouso. |
| `surface-strong` | `#E6E6E6` | `#242424` | Hover e pressed de superfícies; trilho de barras de progresso e gráficos. |
| `line` | `#DADADA` | `#2E2E2E` | Divisores de 1px e bordas de cards. Linhas separam, sombras não. |
| `ink` | `#0A0A0A` | `#F7F7F7` | Texto principal, títulos e números de performance sobre bg e surface. |
| `ink-muted` | `#575757` | `#A8A8A8` | Texto de apoio, descrições, unidades (km, min/km) sobre bg e surface. |
| `ink-subtle` | `#6E6E6E` | `#8C8C8C` | Labels em caixa-alta, metadados, placeholders. Passa 4.5:1 sobre bg e surface; não usar sobre surface-strong. |
| `inverse` | `#0A0A0A` | `#FFFFFF` | Blocos de impacto: botão primário, hero, faixa de resultado, card em destaque. Máximo um bloco invertido grande por tela. |
| `on-inverse` | `#FFFFFF` | `#0A0A0A` | Texto e ícones sobre inverse. |

### Semânticas

Só para o significado de um dado (ver "Cores semânticas"). Contraste medido (WCAG) de `positive`/`negative` sobre `bg`, `surface` e o próprio `-subtle`: no mínimo 5.1:1 no claro e 6.1:1 no escuro.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `positive` | `#18743A` | `#4ADE80` | Texto e traços de dado favorável: descida, pace mais rápido que o plano, melhora. |
| `positive-subtle` | `#E6F4EA` | `#10291A` | Fundo ou preenchimento de dado favorável (faixa de gráfico, badge). |
| `negative` | `#B91C1C` | `#F87171` | Texto e traços de dado que pesa: subida, pace mais lento que o plano, piora. |
| `negative-subtle` | `#FBE9E9` | `#2E1414` | Fundo ou preenchimento de dado que pesa. |

## Famílias

| Chave | Stack |
|---|---|
| `--font-display` | `"Barlow Condensed", "Arial Narrow", sans-serif` |
| `--font-sans` | `Inter, system-ui, -apple-system, "Segoe UI", sans-serif` |
| `--font-mono` | `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace` |

## Estilos de texto

| Estilo | Família | Tamanho | Altura de linha | Peso | Tracking | Uso |
|---|---|---|---|---|---|---|
| `display-xl` | display | 96px | 0.9 | 800 | -0.01em | Hero da home e de eventos. Uma vez por página. Caixa-alta. |
| `display-l` | display | 64px | 0.95 | 800 | -0.01em | Títulos de página e de seções-âncora. Caixa-alta. |
| `heading` | display | 32px | 1 | 700 | 0 | Títulos de seção e de cards grandes. Caixa-alta. |
| `title` | sans | 20px | 28px | 600 | -0.01em | Títulos de card, itens de lista, nomes de prova. |
| `body` | sans | 16px | 24px | 400 | 0 | Texto corrido. Linha máxima de 68 caracteres. |
| `small` | sans | 14px | 20px | 400 | 0 | Texto de apoio, legendas, notas de formulário. |
| `label` | sans | 12px | 16px | 600 | 0.08em | Rótulos de métricas, tags, navegação secundária. Caixa-alta, cor ink-subtle. |
| `metric-xl` | mono | 56px | 1 | 500 | -0.03em | Métrica herói: pace, tempo final, distância. Uma por card. |
| `metric` | mono | 20px | 24px | 500 | -0.01em | Métricas secundárias em grids e tabelas de splits. |

## Espaçamento

Base de 8px (com 4px para ajustes finos). Muito espaço em branco: o layout respira como uma pista vazia.

| Token | Valor | Uso |
|---|---|---|
| `space-1` | 4px | Ícone ↔ label; métrica ↔ unidade. |
| `space-2` | 8px | Padding interno de tags e chips; gap entre label e métrica. |
| `space-4` | 16px | Padding de botões e campos; gutter mobile. |
| `space-6` | 24px | Padding de cards; gutter desktop. |
| `space-10` | 40px | Entre blocos dentro de uma seção. |
| `space-16` | 64px | Entre seções no mobile. |
| `space-24` | 96px | Entre seções no desktop; respiro do hero. |

## Raios

Cantos retos por padrão (precisão, pista). Pílula só para elementos pequenos e selecionáveis.

| Token | Valor | Uso |
|---|---|---|
| `radius-0` | 0 | Botões, cards, imagens, blocos invertidos. |
| `radius-sm` | 4px | Campos de formulário, tooltips, barras de progresso, moldura de mapas. |
| `radius-pill` | 9999px | Chips de filtro, tags de distância (5K, 10K, 21K), toggles, avatares. |

## CSS pronto

```css
:root, [data-theme="light"] {
  --bg: #FFFFFF;
  --surface: #F4F4F4;
  --surface-strong: #E6E6E6;
  --line: #DADADA;
  --ink: #0A0A0A;
  --ink-muted: #575757;
  --ink-subtle: #6E6E6E;
  --inverse: #0A0A0A;
  --on-inverse: #FFFFFF;
  --positive: #18743A;
  --positive-subtle: #E6F4EA;
  --negative: #B91C1C;
  --negative-subtle: #FBE9E9;
}
[data-theme="dark"] {
  --bg: #0A0A0A;
  --surface: #161616;
  --surface-strong: #242424;
  --line: #2E2E2E;
  --ink: #F7F7F7;
  --ink-muted: #A8A8A8;
  --ink-subtle: #8C8C8C;
  --inverse: #FFFFFF;
  --on-inverse: #0A0A0A;
  --positive: #4ADE80;
  --positive-subtle: #10291A;
  --negative: #F87171;
  --negative-subtle: #2E1414;
}
:root {
  --font-display: "Barlow Condensed", "Arial Narrow", sans-serif;
  --font-sans: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-6: 24px;
  --space-10: 40px;
  --space-16: 64px;
  --space-24: 96px;
  --radius-0: 0;
  --radius-sm: 4px;
  --radius-pill: 9999px;
}
```
