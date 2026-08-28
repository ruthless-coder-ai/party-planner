# party-planner

中文派对策划助手 — a Chinese-language party planning assistant. Give it a theme,
a time, and a headcount; it returns a timeline and a supplies checklist.

An Express server proxies requests to OpenRouter so the API key stays server-side.

## Layout

| Path | What it is |
| --- | --- |
| `server.mjs` | Express server — static hosting plus the OpenRouter proxy |
| `public/index.html` | The frontend |
| `package.json` | Dependencies: express, cors, dotenv |

## Running it

```bash
npm install
```

Create a `.env` in the project root:

```
OPENROUTER_API_KEY=sk-or-...
PORT=3000
```

Then:

```bash
node server.mjs
```

The app is served at `http://localhost:3000`.

`.env` is gitignored and must never be committed.

## Model

Calls `openrouter/sherlock-dash-alpha` via
`https://openrouter.ai/api/v1/chat/completions`. The system prompt constrains the
model to return strict JSON — title, vibe, duration, headcount, timeline, and
supplies list — which the frontend renders.
