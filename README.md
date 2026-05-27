# deeplossless-ui

**AI Execution Forensics** — a visual debugger for long coding sessions with DeepSeek.

See what the AI actually did. Specifically, see when it said "tested" but never ran a test.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js 16 (Turbopack)
- Tailwind CSS 4
- shadcn/ui
- Motion (Framer)
- html-to-image

## Architecture

```
src/
  app/          Layout + main page
  components/
    signal-trace    Event timeline with anomaly pulse visualization
    claim-evidence  Assertion vs Observed Execution confrontation
    diff-evidence   Code diff with inline warning markers
    share-card      Forensic report PNG export
    status-bar      Runtime-style status header
  lib/
    fake-data.ts    Prototype session data
```

## Design

`src/lib/rule-engine.ts` — visit the project to see the visual design in action.
