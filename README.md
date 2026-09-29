# Pace Planner

Estima o tempo de chegada e o pace alvo de cada km de uma prova com altimetria, a partir de uma
prova de referência plana. Mesmo esforço (VDOT de Daniels), terreno real (custo por inclinação de
Minetti). Roda inteiro no navegador, sem backend.

- Especificação do projeto: [doc.md](doc.md)
- Diretivas de design: [design-system.md](design-system.md)

## Desenvolvimento

Requer Node 24 (ou 22.22.3+).

```bash
npm install
npm start          # http://localhost:4200
npm test -- --watch=false
npm run spell      # cspell: identificadores e comentários em inglês
npm run format     # prettier
```

## Estrutura

```text
src/app/
├── core/          # TypeScript puro, sem Angular
│   ├── model/     # VDOT, custo por inclinação, estimador, splits
│   ├── route/     # GPX, haversine, grade de 20 m, suavização, perfil
│   └── elevation/ # Open-Meteo (único ponto com HttpClient)
├── state/         # PlannerStore: signals, computed e localStorage
├── features/      # componentes da tela
└── shared/        # formatadores, tema, ícones
```

## Deploy

O workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) roda spell check,
formatação, testes e build a cada push e publica a `main` no GitHub Pages em
`https://<usuario>.github.io/pace-planner/`. Em Settings → Pages do repositório, escolha
"GitHub Actions" como origem.

## Créditos

Elevação: Copernicus DEM GLO-90 via [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). Mapa ©
colaboradores do [OpenStreetMap](https://www.openstreetmap.org/copyright).
