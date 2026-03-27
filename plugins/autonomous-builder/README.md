# autonomous-builder

Autonomously builds or extends full-stack applications from a short prompt using a Generator-Evaluator convergence loop.

## Usage

```
/harness "Build a fully featured DAW in the browser"
/harness --worktree "Add authentication to this app"
/harness --max-rounds 3 --threshold 8 "Build a todo app"
```

## How It Works

1. **Planner** expands your prompt into an ambitious product spec
2. **Generator** implements the app (or extends existing code)
3. **Evaluator** tests the running app via Playwright and scores it
4. **harness.js** decides: REFINE (keep improving), PIVOT (change approach), or DONE
5. Repeat until all scores pass threshold or max rounds reached

## Configuration

Edit `skills/harness/config/settings.json`:

| Field | Default | Description |
|-------|---------|-------------|
| maxRounds | 5 | Max build-QA iterations |
| scoreThreshold | 7 | Min score (1-10) to pass |
| serverStartCommand | npm run dev | Dev server command |
| serverPort | 5173 | Dev server port |
| serverReadyTimeout | 30000 | ms to wait for server |

## State

All harness state is stored in `.autonomous-builder/` (gitignored).
Each run gets a unique ID. Inspect state files for debugging:

```
.autonomous-builder/{runId}/
├── harness.json         # State machine
├── spec.md              # Product spec
├── score-history.json   # All scores
└── round-N/
    ├── self-eval.md     # Generator's self-assessment
    ├── scores.json      # Evaluator's scores
    └── feedback.md      # Evaluator's findings
```

## Prerequisites

- Playwright MCP must be installed for the evaluator to work
- Node.js runtime (for harness.js)
