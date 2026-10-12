# Architect as a Service

> The enterprise-grade AI powployed platform that answers **every** architecture question
> with complete, unwavering confidence.

**Request in. Decisive answer out.** Every question is answered with one of eleven
classic architect non-answers — from _"To zależy"_ and _"Have we considered
event-driven architecture?"_ to _"Let's do a spike and come back with findings"_ and
a two-thousand-character architecture lecture that never gets to the point. Each
archetype ships a cynical variant that shows up less often.

Supports **Polish, English, German and Japanese**. No database. Runs in Docker.

## Answer archetypes

| Kind             | Archetype            | Base → cynical variant                                   |
| ---------------- | -------------------- | -------------------------------------------------------- |
| `depends`        | hedging              | _To zależy._ → _To brzmi jak Mikroserwisy!_              |
| `sponsors`       | stakeholder alignment| _…potrzeby sponsorów?_ → _(poza szybko, tanio i dobrze)_  |
| `archimate`      | modeling             | _rozpisać w ArchiMate_ → _…żeby wszyscy pokiwali głowami_ |
| `diagrams`       | documentation        | _diagramy przepływu i sekwencji?_ → _…i tak wrzucą to do AI_ |
| `eventdriven`    | pattern inquiry      | _Czy rozważaliśmy EDA?_ → _…nie dość bolesne w utrzymaniu_ |
| `boundedcontext` | domain boundary      | _wyzwanie z bounded contextem_ → _…wszyscy będą się obwiniać_ |
| `nfr`            | non-functional       | _latency i availability?_ → _…prod padnie w piątek o 15:50_ |
| `slo`            | reliability          | _zdefiniować SLI/SLO_ → _…ładne metryki jak deploy się sypie_ |
| `workshop`       | process              | _Musimy umówić warsztat_ → _…co omówimy na kolejnym warsztacie_ |
| `spike`          | discovery            | _spike i wróćmy z wnioskami_ → _…kupimy dwa tygodnie ciszy_ |
| `monologue`      | the long way round   | _~2,000-char wywód o TOGAF/CQRS/DDD… kończący się „A właściwie o co mnie pytałeś?"_ → _…a i tak nikt tego nie przeczyta do końca_ |

Distribution is configurable (see the two `ARCHITECT_*` variables below).

---

## Stack

- **Astro 7** (SSR, `@astrojs/node` standalone adapter) — front + API in one codebase
- **TypeScript** end-to-end
- **Zero dependencies** beyond Astro (no DB, no ORM, no external services)
- **Docker** + **docker-compose** for a one-command environment

## Quick start (Docker — recommended)

```sh
docker compose up --build
```

Open <http://localhost:4321>. Stop with `Ctrl+C` (`docker compose down`).

## Quick start (local dev)

```sh
npm install
npm run dev      # http://localhost:4321
```

Production build without Docker:

```sh
npm run build
npm run start    # node ./dist/server/entry.mjs
```

## The API

Both the Front and the API answer requests. `POST /api/ask` is the public surface.

```sh
curl -s http://localhost:4321/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"Should we split the monolith?","language":"pl"}'
```

```json
{
  "requestId": "…",
  "language": "pl",
  "languageLabel": "Polski",
  "answer": "To zależy.",
  "kind": "depends",
  "kindLabel": "Canonical Answer",
  "usedVariant": false,
  "confidence": 0.5,
  "processingTimeMs": 1,
  "model": "arch-4o-enterprise",
  "tokensIn": 8,
  "tokensOut": 3,
  "patternsDetected": [],
  "considerations": ["…", "…"]
}
```

There is also a GET form for quick exploration:

```sh
curl -s 'http://localhost:4321/api/ask?q=Should%20we%20use%20Kafka%3F&language=de'
```

### Endpoints

| Method | Path          | Purpose                                        |
| ------ | ------------- | ---------------------------------------------- |
| `POST` | `/api/ask`    | Ask a question — returns the canonical answer  |
| `GET`  | `/api/ask`    | Same, via `?q=` and `?language=` query params  |
| `GET`  | `/api/health` | Liveness probe (used by Docker healthcheck)    |

### Supported languages

| Code | Language |
| ---- | -------- |
| `pl` | Polski   |
| `en` | English  |
| `de` | Deutsch  |
| `ja` | 日本語    |

## Configuration

| Variable                         | Default | Meaning                                                       |
| -------------------------------- | ------- | ------------------------------------------------------------ |
| `ARCHITECT_CANON_WEIGHT`         | `2`     | Relative weight of the `To zależy` archetype (`1` = flat, `10` = dominant) |
| `ARCHITECT_VARIANT_PROBABILITY`  | `0.3`   | Probability the cynical variant phrasing is used (`0`..`1`)  |
| `PORT`                           | `4321`  | HTTP port                                                    |
| `HOST`                           | `0.0.0.0` | Bind address                                               |

## Project structure

```text
src/
├── lib/
│   └── architect.ts        # the one business rule: 99% / 1%
├── layouts/
│   └── Layout.astro
└── pages/
    ├── index.astro         # enterprise AI console (front)
    └── api/
        ├── ask.ts          # POST + GET /api/ask
        └── health.ts       # GET /api/health
Dockerfile
docker-compose.yml
context/                    # product docs: PRD, tech-stack, verification log
```

## Docs

- `context/foundation/prd.md` — the product spec
- `context/foundation/tech-stack.md` — stack selection hand-off
- `context/changes/bootstrap-verification/verification.md` — bootstrap audit log

## License

[Death and Repudiation License v1.0](LICENSE.md) — every question, including "may I use this?", is answered with "it depends."
