# Planejador de Pace por Altimetria — Documentação do Projeto Inicial

Sep 29, 2026 · @Everton Dias

## Visão geral

O app estima o tempo de chegada e o pace de cada quilômetro de uma prova de rua com altimetria, a partir de uma prova de referência plana do corredor. Roda inteiro no navegador, em Angular, e é publicado no GitHub Pages sem backend.

**Premissa central: esforço equivalente, não pace equivalente.** Quem corre uma meia plana em 1:30 não repete 1:30 numa meia com subidas. O app assume que o corredor mantém o mesmo condicionamento (VDOT) e calcula quanto tempo esse esforço rende no terreno real.

O mesmo cálculo produz duas saídas:

- **Tempo estimado de chegada** no percurso com altimetria.
- **Pace alvo por km**, mais lento nas subidas e mais rápido nas descidas, com esforço constante do início ao fim.

Fluxo típico: o usuário carrega o GPX da prova, informa uma prova de referência (por exemplo, 21,1 km em 1:30:00 no plano) e recebe a estimativa, o gráfico de altimetria com o pace sobreposto e a tabela de splits.

## Escopo do MVP

O MVP entrega o cálculo completo para um percurso carregado via GPX e uma prova de referência, sem contas de usuário nem integrações.

**Dentro do escopo**

- Upload de arquivo GPX (drag and drop ou seletor de arquivo).
- Elevação a partir do próprio GPX, com opção de substituir pela Open-Meteo Elevation API.
- Reamostragem e suavização configuráveis do perfil de elevação.
- Entrada da prova de referência: distância (3 km, 5 km, 10 km, 21,1 km, 42,2 km ou livre) e tempo. O 3 km entra por ser um teste de campo comum.
- VDOT do corredor exibido logo após a prova de referência, com previsões no plano (tempo e pace) para 3 km, 5 km, 10 km, meia e maratona num bloco expansível.
- Cálculo de VDOT, tempo estimado no percurso e pace alvo por km.
- Mapa do percurso, gráfico de altimetria com pace sobreposto e tabela de splits.
- Escolha do modelo de inclinação (Minetti com limite de descida ou curva conservadora).
- Últimos cálculos salvos em `localStorage`.
- Interface em português, inglês e espanhol (um build por idioma: raiz, `/en/` e `/es/`), com seletor no topo; na primeira visita vale o idioma do navegador.
- Unidade de distância em km ou milhas, escolhida no topo: pace, distâncias, parciais, gráfico e marcadores do mapa seguem a preferência. Elevação continua em metros.

**Fora do escopo (por enquanto)**

- Integração com Strava ou Garmin, que exige OAuth com segredo e, portanto, backend.
- Ajustes de clima (calor, umidade, vento), piso e curvas.
- Estratégias de prova diferentes de esforço constante (negative split, segurar subidas iniciais).
- Contas de usuário, compartilhamento de planos e catálogo de provas oficiais.

## Padrões do projeto

Todo o código do projeto é escrito em inglês. A documentação e os textos exibidos ao usuário ficam em português.

- **Identificadores:** variáveis, funções, classes, interfaces, tipos, enums, signals e seletores de componentes em inglês.
- **Arquivos e pastas:** em inglês e em kebab-case (`route-upload/`, `grade-cost.ts`), seguindo o style guide do Angular.
- **Comentários, JSDoc, logs e mensagens de erro técnicas:** em inglês.
- **Git:** mensagens de commit, nomes de branch, títulos de PR e issues em inglês.
- **Unidades no nome:** sufixos explícitos, como `distanceM`, `timeS` e `paceSPerKm`, para evitar ambiguidade entre metros, segundos e minutos.
- **Textos de interface:** em português, fora da lógica, marcados com `$localize` para permitir outros idiomas depois.
- **Verificação:** `cspell` com dicionário em inglês rodando no CI, para barrar identificadores em português.

### Glossário de domínio

Os termos do domínio sempre usam a mesma tradução no código.

| Português | Inglês no código |
| --- | --- |
| Percurso | `route` |
| Prova de referência | `referenceRace` |
| Altimetria, perfil de elevação | `elevationProfile`, `profile` |
| Inclinação | `grade` |
| Ganho e perda de elevação (D+ e D−) | `gainM`, `lossM` |
| Segmento | `segment` |
| Multiplicador de custo | `costMultiplier` |
| Distância plana equivalente | `equivalentDistanceM` |
| Velocidade plana equivalente | `flatSpeed` |
| Pace plano equivalente | `equivalentPace` |
| Piso e fator de descida | `downhillFloor`, `downhillFactor` |
| Reamostragem, suavização | `resampling`, `smoothing` |
| Estimativa | `estimate` |
| Parcial (por km ou milha) | `split` |

## Modelo fisiológico

O modelo combina o VDOT de Jack Daniels, que traduz a prova de referência em condicionamento, com o custo energético por inclinação de Minetti, que traduz o terreno em esforço. Uma meia plana em 1:30:00 dá VDOT ≈ 51,0.

### VDOT a partir da prova de referência

Com v em metros por minuto e t em minutos, o custo de oxigênio da corrida e a fração do VO2max sustentável por t minutos são:

```latex
VO_2(v) = -4{,}60 + 0{,}182258\,v + 0{,}000104\,v^2
```

```latex
\%VO_{2max}(t) = 0{,}8 + 0{,}1894393\,e^{-0{,}012778\,t} + 0{,}2989558\,e^{-0{,}1932605\,t}
```

```latex
VDOT = \frac{VO_2(v_{ref})}{\%VO_{2max}(t_{ref})}
```

**A intensidade sustentável depende da duração, não da distância.** Na meia em 1:30, o corredor sustenta 86,0% do VO2max. Se o percurso com morros levar 1:40, ele sustenta 85,3%. É por isso que o esforço "de 1:30" no percurso difícil é ligeiramente menos intenso por minuto, e o cálculo precisa ser iterativo.

As equações de Daniels e Gilbert foram ajustadas a provas de cerca de 1.500 m até a maratona, em percursos planos. Fora dessa faixa, a estimativa perde validade.

### Inversão: do VO2 alvo para a velocidade plana equivalente

Dado um VO2 alvo, a velocidade plana equivalente é a raiz positiva da equação quadrática, com a = 0,000104, b = 0,182258 e c = −4,60:

```latex
v_{plana} = \frac{-b + \sqrt{b^2 - 4a\,(c - VO_2^{alvo})}}{2a}
```

### Custo energético por inclinação

Minetti et al. (2002) mediram em esteira o custo da corrida, em J/kg/m, de 10 corredores de elite de montanha nas inclinações 0, ±10%, ±20%, ±30%, ±35%, ±40% e ±45%, e ajustaram aos resultados um polinômio de 5º grau, com i em fração (0,05 = 5%). No plano, o custo medido foi 3,40 J/kg/m; o polinômio dá 3,6.

```latex
C(i) = 155{,}4\,i^5 - 30{,}4\,i^4 - 43{,}3\,i^3 + 46{,}3\,i^2 + 19{,}5\,i + 3{,}6
```

O multiplicador de custo do trecho é m(i) = C(i) / 3,6, e a velocidade no trecho é v = v\_plana / m(i). O modelo assume que o custo por metro não depende da velocidade, e o artigo confirma isso: em cada inclinação, o custo ficou praticamente constante em todas as velocidades testadas.

**Atenção à faixa das provas de rua.** Quase todo percurso de rua fica entre −10% e +10%, e nessa faixa o polinômio se apoia em apenas três pontos medidos (−10%, 0 e +10%). Os valores intermediários são interpolação, não medição.

&#91;embedded content: Minetti et al. (2002), polinômio avaliado de −20% a +20% · modos de descida com parâmetros padrão\]

A curva é assimétrica: a subida pesa mais do que a descida alivia, por isso um percurso de ida e volta é sempre mais lento que o plano.

### Limites nas descidas

**Minetti é otimista nas descidas, e o próprio artigo mostra isso.** Em −10%, o multiplicador é 0,60, o que significa correr 67% mais rápido que no plano. Comparando com provas reais só de descida, os autores viram que a velocidade prevista era, em média, 3,4 vezes a medida, e atribuem a diferença principalmente a segurança e controle motor. Os voluntários também eram atletas de montanha, com custo na descida cerca de 40% menor que o relatado para sedentários. O app oferece dois modos, com parâmetros ajustáveis, comparados abaixo com Minetti puro e com a curva da Strava:

| Modo | Regra para i < 0 | m em −10% | m em −18% |
| --- | --- | --- | --- |
| Minetti puro | C(i) / 3,6 | 0,60 | 0,50 |
| Minetti com piso | max(C(i) / 3,6; piso), piso = 0,85 | 0,85 | 0,85 |
| Conservador | 1 + fator × (C(i) / 3,6 − 1), fator = 0,5 | 0,80 | 0,75 |
| Referência: Strava 2017 | Curva empírica, sem fórmula publicada | ≈ 0,88 (mínimo em −9%) | 1,00 |

O modelo de GAP da Strava (Robb, 2017) foi ajustado a cerca de 6 milhões de corridas de 240 mil atletas, com base em frequência cardíaca equivalente. Nas subidas, ele é quase igual a Minetti; nas descidas, o maior ganho é 0,88 em −9%, e em −18% o multiplicador volta a 1,0.

**Os dois modos limitados continuam mais otimistas que a Strava**, e o "conservador" é o menos conservador nas descidas fortes, porque não volta a subir depois de −9%. Nas subidas, todos os modos usam Minetti puro. Os padrões devem ser calibrados com provas reais (ver Testes e validação).

## Algoritmo de estimativa

O percurso vira uma única "distância plana equivalente", e o tempo final sai de um ponto fixo que converge em poucas iterações. O pace plano equivalente é o mesmo em todos os km; o pace real de cada km varia com o terreno.

**Insight que simplifica tudo:** como m(i) não depende da velocidade, a soma Σ ds × m(i) é constante para o percurso. Basta calculá-la uma vez; a iteração só ajusta a velocidade plana à duração.

1. Calcule o VDOT a partir da prova de referência.
2. Divida o percurso em segmentos de comprimento ds com inclinação i (ver Dados de elevação).
3. Calcule a distância plana equivalente: D\_eq = Σ ds × m(i).
4. Chute inicial: T₀ pela fórmula de Riegel, T₀ = t\_ref × (D\_eq / D\_ref)^1,06.
5. Itere até |T\_novo − T| < 0,5 s, com teto de 50 iterações:
   1. VO2 alvo = VDOT × %VO2max(T).
   2. v\_plana = inversão da quadrática para esse VO2.
   3. T\_novo = D\_eq / v\_plana.
6. Splits: o tempo da parcial k (1 km ou 1 milha, conforme a preferência do usuário) é Σ ds × m(i) / v\_plana sobre os trechos daquela parcial. Um segmento que cruza o limite de uma parcial é dividido nele, então qualquer comprimento de parcial funciona sobre a grade de 20 m. A última parcial pode ser incompleta (por exemplo, os 97,5 m finais da meia em km); uma sobra menor que 5 m é somada à parcial anterior.

```typescript
export function estimate(
  reference: ReferenceRace,
  segments: Segment[],
  model: GradeCostModel,
): Estimate {
  const vdot = calculateVdot(reference.distanceM, reference.timeS / 60);
  const totalDistanceM = segments.reduce((sum, s) => sum + s.distanceM, 0);
  const equivalentDistanceM = segments.reduce(
    (sum, s) => sum + s.distanceM * model.costMultiplier(s.grade),
    0,
  );

  // Riegel seed: t = tRef * (d / dRef)^1.06
  let timeMin = (reference.timeS / 60) * Math.pow(equivalentDistanceM / reference.distanceM, 1.06);
  let flatSpeed = 0; // m/min
  let iterations = 0;

  for (; iterations < 50; iterations++) {
    flatSpeed = speedForVo2(vdot * vo2maxFraction(timeMin));
    const nextTimeMin = equivalentDistanceM / flatSpeed;
    const converged = Math.abs(nextTimeMin - timeMin) * 60 < 0.5;
    timeMin = nextTimeMin;
    if (converged) break;
  }

  const totalTimeS = timeMin * 60;
  return {
    vdot,
    totalTimeS,
    equivalentPaceSPerKm: 60_000 / flatSpeed,
    averagePaceSPerKm: totalTimeS / (totalDistanceM / 1000),
    iterations: Math.min(iterations + 1, 50),
    splits: groupBySplits(segments, flatSpeed, model, splitLengthM),
  };
}
```

Todas as funções são puras e sem dependência de Angular, o que permite testá-las isoladamente e reaproveitá-las num Web Worker se o percurso for muito longo.

## Dados de elevação

O MVP usa a elevação do próprio GPX por padrão e a Open-Meteo como alternativa, ambas sem backend. A qualidade da estimativa depende mais do tratamento do perfil do que do modelo fisiológico: ruído de poucos metros vira rampas falsas de 10% a 20%.

| Fonte | Resolução | Chave | Observações |
| --- | --- | --- | --- |
| Elevação do GPX | Depende do dispositivo | Não | Boa com barômetro; ruidosa com GPS puro. Zero dependência. |
| [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api) | 90 m (Copernicus DEM GLO-90) | Não, para uso não comercial | Até 100 coordenadas por requisição. Exige atribuição ao Copernicus e à Open-Meteo. |
| AWS Terrain Tiles (Terrarium) | Varia por zoom | Não | Decodificação de PNG em `canvas`: elevação = R × 256 + G + B / 256 − 32768. Fica para pós-MVP. |

### Pipeline de processamento

1. **Parse do GPX** com `DOMParser`, lendo `trkpt` (e `rtept` como fallback): latitude, longitude e `ele` quando existir.
2. **Distância acumulada** entre pontos pela fórmula de haversine.
3. **Ajuste de distância opcional:** se o usuário informar a distância oficial (por exemplo, 21,0975 km), escalar a distância acumulada para bater com ela.
4. **Reamostragem** em passo fixo de 20 m por interpolação linear. Como 20 divide 1000, todo limite de km cai num ponto.
5. **Elevação pela API (se escolhida):** amostrar a cada 50 m, enviar em lotes de 100 coordenadas e interpolar para a grade de 20 m. Uma meia gera cerca de 420 pontos, ou 5 requisições.
6. **Suavização** com Savitzky-Golay ou média móvel, janela padrão de 100 m, configurável.
7. **Inclinação por segmento** por diferença central numa janela de 60 m, limitada a ±30% como proteção contra valores absurdos.
8. **Ganho e perda acumulados** com histerese de 3 m, para exibir D+ e D− e comparar com o valor oficial da prova, quando houver.

Se o D+ calculado ficar muito acima do oficial, a suavização está fraca; se ficar muito abaixo, está forte demais. Essa comparação é a principal ferramenta de calibração.

## Arquitetura Angular

A aplicação é uma SPA em Angular com componentes standalone e estado em signals, separada em três camadas: núcleo de cálculo em TypeScript puro, estado reativo e componentes de interface. O núcleo não importa nada de Angular.

&#91;embedded content: arquitetura · entradas, store, núcleo e interface\]

As entradas só alteram signals; o store chama as funções puras do núcleo, e a interface apenas lê os resultados.

### Estrutura de pastas

```text
src/app/
├── core/
│   ├── model/                    # plain TypeScript, no Angular
│   │   ├── vdot.ts               # calculateVdot, vo2maxFraction, speedForVo2
│   │   ├── grade-cost.ts         # minetti, floor and conservative modes
│   │   ├── estimator.ts          # estimate(): iteration and equivalent distance
│   │   └── splits.ts             # groupBySplits (km or mile)
│   ├── route/
│   │   ├── gpx-parser.ts         # DOMParser -> GpsPoint[]
│   │   ├── geo.ts                # haversine, cumulative distance
│   │   ├── resampling.ts         # fixed 20 m grid
│   │   ├── smoothing.ts          # Savitzky-Golay / moving average
│   │   └── profile.ts            # grade, elevation gain and loss
│   └── elevation/
│       ├── elevation.service.ts  # picks the source (GPX or API)
│       └── open-meteo.client.ts  # batches of 100 coordinates
├── state/
│   └── planner.store.ts          # signals + computed
├── features/
│   ├── route-upload/
│   ├── reference-race/
│   ├── model-settings/
│   ├── estimate-summary/
│   ├── route-map/                # Leaflet + OpenStreetMap
│   ├── elevation-chart/          # ECharts: elevation x pace
│   └── splits-table/
├── shared/
│   └── formatters.ts             # pace mm:ss/km, time h:mm:ss
├── app.config.ts
└── app.routes.ts
```

### Estado

`PlannerStore` é um serviço `providedIn: 'root'` com signals de entrada e `computed` de saída:

- **Entradas (signals):** `rawRoute`, `elevationSource`, `profileConfig` (passo, janela de suavização), `referenceRace`, `modelConfig`.
- **Derivados (computed):** `profile`, `segments`, `estimate`. Qualquer mudança de entrada recalcula a estimativa na hora, sem botão de "calcular".
- **Assíncrono:** a busca na Open-Meteo roda via `HttpClient` e grava o resultado num signal `apiElevation`; o `profile` usa esse signal quando a fonte é a API.
- **Persistência:** um `effect` grava `referenceRace` e as configurações em `localStorage`, dentro de try/catch.

### Dependências

| Pacote | Uso |
| --- | --- |
| `leaflet` | Mapa do percurso com tiles do OpenStreetMap |
| `echarts` + `ngx-echarts` | Gráfico de altimetria com pace em eixo secundário |
| `angular-cli-ghpages` (dev) | Comando `ng deploy` para o GitHub Pages |

Parse de GPX, geodésia, suavização e o modelo são implementados à mão: são poucas linhas e evitam dependências.

## Modelos de dados

Todas as distâncias ficam em metros, tempos em segundos e inclinações em fração, convertidos só na camada de formatação.

```typescript
// Raw GPX input
export interface GpsPoint {
  lat: number;
  lon: number;
  elevationM?: number;        // missing in route GPX files without elevation
}

// Resampled and smoothed profile
export interface ProfilePoint {
  distanceM: number;          // cumulative from the start line
  lat: number;
  lon: number;
  elevationM: number;         // already smoothed
}

export interface Segment {
  startM: number;
  distanceM: number;          // grid step, usually 20
  grade: number;              // 0.05 = 5%
}

export interface ProfileSummary {
  totalDistanceM: number;
  gainM: number;              // D+
  lossM: number;              // D-
  minElevationM: number;
  maxElevationM: number;
}

// Reference race entered by the user
export interface ReferenceRace {
  distanceM: number;          // e.g. 21097.5
  timeS: number;              // e.g. 5400
}

export type GradeMode = 'minetti-floor' | 'conservative';

export interface ModelConfig {
  mode: GradeMode;
  downhillFloor: number;      // default 0.85
  downhillFactor: number;     // default 0.5
}

export interface GradeCostModel {
  costMultiplier(grade: number): number;
}

export type ElevationSource = 'gpx' | 'open-meteo';

export interface ProfileConfig {
  stepM: number;              // default 20
  smoothingWindowM: number;   // default 100
  gradeWindowM: number;       // default 60
  officialDistanceM?: number;
}

// Result: one split per km or mile, as the user prefers
export interface Split {
  index: number;              // 1-based, for display
  startM: number;
  distanceM: number;          // 1000 or 1609.344, except the last one
  timeS: number;
  paceSPerKm: number;
  gainM: number;
  lossM: number;
  averageGrade: number;
}

export interface Estimate {
  vdot: number;
  totalTimeS: number;
  equivalentPaceSPerKm: number; // flat pace of the sustained effort
  averagePaceSPerKm: number;
  iterations: number;
  splits: Split[];
}
```

## Interface e fluxo do usuário

O MVP é uma única tela: entradas numa coluna lateral e resultados no painel principal, recalculados a cada alteração. No celular, a coluna lateral vira um bloco acima dos resultados.

### Fluxo

1. O usuário arrasta o GPX ou escolhe o arquivo. O app mostra nome, distância e D+ detectados.
2. Informa a prova de referência: seletor de distância (3 km, 5 km, 10 km, 21,1 km, 42,2 km, outra) e tempo em h:mm:ss. O app mostra o VDOT na hora e, ao expandir, as previsões no plano para as outras distâncias.
3. Opcionalmente, informa a distância oficial da prova e troca a fonte de elevação para a Open-Meteo.
4. O painel mostra a estimativa imediatamente.
5. Em "Configurações avançadas", ajusta o modo de descida, o piso ou o fator, e as janelas de suavização.

### Painel de resultados

| Componente | Conteúdo |
| --- | --- |
| `estimate-summary` | Tempo estimado, pace médio, pace plano equivalente, VDOT e diferença em relação ao tempo plano na mesma distância |
| `route-map` | Traçado no Leaflet com marcadores a cada km; o km selecionado fica destacado |
| `elevation-chart` | Elevação em área e pace alvo em degraus por km, em eixo secundário invertido (pace menor fica acima) |
| `splits-table` | Km, pace alvo, tempo acumulado, D+, D− e inclinação média; clicar numa linha destaca o km no mapa e no gráfico |

### Validações de entrada

- GPX sem pontos ou com menos de 500 m: erro claro.
- GPX sem elevação: sugerir automaticamente a Open-Meteo.
- Prova de referência fora da faixa em que as fórmulas foram ajustadas (menos de 1.500 m ou mais que uma maratona): aviso de que a estimativa perde precisão.
- Falha na API: manter a elevação do GPX, se houver, e mostrar o aviso.

## Testes e validação

O núcleo de cálculo é puro, então a maior parte dos testes é unitária e roda em milissegundos no runner padrão do Angular CLI. A validação do modelo em si exige provas reais.

### Testes unitários com valores de referência

| Caso | Resultado esperado |
| --- | --- |
| VDOT de 21.097,5 m em 5.400 s | ≈ 51,0 |
| %VO2max(90 min) | ≈ 0,860 |
| Multiplicador de Minetti em 0% | 1,000 |
| Multiplicador de Minetti em +10% | ≈ 1,658 |
| Multiplicador de Minetti em −10% | ≈ 0,598 (antes do piso) |
| Percurso plano de 21.097,5 m com referência de 1:30:00 | Estimativa de 1:30:00 ± 1 s |
| Mesmo percurso plano, referência de 10 km em 40:00 | Igual à previsão de meia da tabela VDOT para esse 10 km |
| Ida e volta simétrica com subida e descida | Mais lento que o plano (o ganho na descida não compensa a subida) |
| Iteração | Converge em menos de 10 iterações para percursos de 5 a 42,2 km |

O caso do percurso plano é o teste mais importante: se ele não devolve exatamente o tempo de referência, há erro na inversão da quadrática ou na iteração.

### Testes do pipeline de percurso

- Fixtures de GPX em `src/testing/fixtures/`: um plano sintético, uma rampa sintética de 5% e pelo menos duas provas reais.
- Haversine: distância entre dois pontos conhecidos com erro menor que 0,5%.
- Reamostragem: todo múltiplo de 1.000 m existe na grade.
- Suavização: numa rampa sintética com ruído de ±3 m, a inclinação recuperada fica a menos de 0,5 ponto percentual dos 5%.

### Validação e calibração do modelo

Para cada prova real com altimetria, registrar a prova plana de referência mais próxima no tempo, o tempo real obtido e o tempo estimado pelo app. O erro médio orienta o ajuste do piso e do fator de descida. Uma meta razoável para o MVP é errar menos de 2% em provas de 10 km a meia maratona.

## Build e deploy no GitHub Pages

O site fica em `https://<usuario>.github.io/<repositorio>/`, então o build precisa do base href com o nome do repositório. Os exemplos usam o repositório `pace-planner`.

### Opção A: `ng deploy` local

A v2 do [angular-cli-ghpages](https://github.com/angular-schule/angular-cli-ghpages) suporta Angular 17 ou superior e publica por padrão a pasta `dist/<projeto>/browser`. Ela também cria `404.html` e `.nojekyll` por padrão ([notas de versão](https://www.github.com/angular-schule/angular-cli-ghpages/releases)).

```bash
ng add angular-cli-ghpages
ng deploy --base-href=/pace-planner/
```

Depois, em Settings → Pages do repositório, selecione a branch `gh-pages` como origem.

### Opção B: GitHub Actions (recomendada)

Publica a cada push na `main` e só se os testes passarem. Em Settings → Pages, selecione "GitHub Actions" como origem. Confira as versões mais recentes das actions ao configurar.

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx ng test --watch=false
      - run: npx ng build --base-href /pace-planner/
      - run: cp dist/pace-planner/browser/index.html dist/pace-planner/browser/404.html
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/pace-planner/browser
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Rotas

O GitHub Pages não faz fallback de SPA. A cópia de `index.html` para `404.html` resolve o acesso direto a rotas; a alternativa é `withHashLocation()` no `provideRouter`. O MVP tem uma única tela, então isso só passa a importar quando houver rotas como `/prova/:id`.

### Checklist de publicação

- [ ] Criar o repositório `pace-planner` no GitHub
- [ ] Gerar o projeto com `ng new pace-planner --style=scss --routing`
- [ ] Adicionar o workflow `.github/workflows/deploy.yml`
- [ ] Configurar Settings → Pages → GitHub Actions
- [ ] Incluir no rodapé a atribuição ao Copernicus e à Open-Meteo e o crédito do OpenStreetMap

## Roadmap e riscos

O MVP sai em cinco fases curtas, cada uma com um critério de saída verificável. O núcleo de cálculo vem antes da interface para que o modelo seja validado cedo.

&#91;embedded content: roadmap do MVP · 5 fases com critério de saída\]

O modelo é validado na fase 1, antes de qualquer tela; a calibração com provas reais fecha o MVP.

**Depois do MVP:** ajuste de calor e umidade, estratégias de prova além do esforço constante, AWS Terrain Tiles para mais resolução, catálogo de provas oficiais em JSON no repositório e, se valer a pena, integração com Strava via uma função serverless.

### Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Elevação ruidosa no GPX | Superestima D+ e o tempo | Suavização configurável e comparação com o D+ oficial |
| Descidas otimistas no Minetti | Subestima o tempo em provas com descidas fortes | Piso e modo conservador, calibrados com provas reais |
| Prova de referência fora da faixa das fórmulas | Estimativa imprecisa para provas muito curtas ou ultras | Aviso na interface fora de 1.500 m a 42,2 km |
| Indisponibilidade ou limite da Open-Meteo | Sem elevação para GPX de rota | Fallback para a elevação do GPX e mensagem de erro clara |
| Referência antiga ou em condições diferentes | Estimativa desalinhada com a forma atual | Texto de ajuda sugerindo uma prova recente, de preferência dos últimos 3 meses |

## Referências

**Modelo fisiológico**

- Minetti, A. E.; Moia, C.; Roi, G. S.; Susta, D.; Ferretti, G. "Energy cost of walking and running at extreme uphill and downhill slopes". *Journal of Applied Physiology*, 93(3), 1039–1046, 2002. DOI 10.1152/japplphysiol.01177.2001. [Texto completo (PDF)](http://www.softrun.fr/J%20Appl%20Physiol-2002-Minetti-1039-46.pdf). Conferido no original: polinômio, amostra de 10 atletas, inclinações medidas, custo independente da velocidade e superestimação nas descidas.
- Robb, D. ["An Improved GAP Model"](https://medium.com/strava-engineering/an-improved-gap-model-8b07ae8886c3). Strava Engineering, 2017. Conferido: modelo por frequência cardíaca equivalente, cerca de 6 milhões de corridas, mínimo de 0,88 em −9% e 1,0 em −18%. O post diz que o estudo de Minetti teve 30 atletas; o artigo original relata 10.
- Daniels, J.; Gilbert, J. *Oxygen Power: Performance Tables for Distance Runners*, 1979. Livro fora de catálogo e sem versão online. As equações foram conferidas apenas em fontes secundárias, como a [calculadora VDOT da FitMetricLab](https://fitmetriclab.com/en/tools/running/vdot-calculator/), que também indica a faixa de 1.500 m à maratona.
- Daniels, J. *Daniels' Running Formula*, 4ª ed. Human Kinetics, 2021. Fonte das tabelas VDOT para validar os testes; tabelas ainda não conferidas.

**Dados e ferramentas** (páginas consultadas)

- [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api): Copernicus DEM GLO-90, até 100 coordenadas por requisição, atribuição obrigatória.
- [angular-cli-ghpages](https://github.com/angular-schule/angular-cli-ghpages) e [notas de versão](https://www.github.com/angular-schule/angular-cli-ghpages/releases): deploy para GitHub Pages com Angular 17 ou superior.
