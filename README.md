# deeplossless-ui

**AI Execution Forensics** — see what the AI actually did.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Requires a running deeplossless instance.

## Features

| Page | Description |
|------|-------------|
| `/` | **Signal Trace** — classified event timeline with burst folding. **Findings** sidebar with confidence/source labels. Share card export |
| `/replay/[id]` | **Execution Cinema** — narrative execution analysis with stats, signal trace, evidence chain |
| `/plan/[id]` | **Execution Divergence** — plan vs actual comparison |
| `/health/[id]` | **Execution Corruption** — DAG anomalies as runtime diagnostics |
| `/stability` | **Cache Stability** — prompt hash heatmap + system prompt diff viewer |
| `/latency` | **Latency Dashboard** — canvas sparkline, P50/P95/P99 stats, recent records |

## Stack

Next.js 16 · Tailwind CSS 4 · shadcn/ui · Motion · html-to-image

## Architecture

```
src/
  app/              Pages (/, /replay, /plan, /health, /stability, /latency)
  components/       signal-trace, claim-evidence, diff-evidence, share-card, status-bar
  lib/
    api.ts          API client (auto-refresh every 5s)
    classify.ts     Shared tool → semantic category classification
    rule-engine.ts  Integrity detection (confidence/source labels)
    types.ts        Shared TypeScript types
    use-sessions.ts Session data hook with auto-refresh
```
