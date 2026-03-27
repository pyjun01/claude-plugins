# Eval 0 — Greenfield Setup (with skill)

## 1. Setup command
```bash
cd /tmp/harness-test-greenfield && \
node /Users/mvldev16/.../harness.js setup \
  --prompt "Build a simple hello world webpage"
```

## 2. JSON output from harness.js setup
```json
{
  "runId": "run-20260327160939-b213",
  "stateDir": ".autonomous-builder/run-20260327160939-b213",
  "appDir": ".",
  "existingProject": false,
  "context": "GREENFIELD"
}
```

## 3. Setup complete message (reported to user)
Setup complete. Run: run-20260327160939-b213, Mode: GREENFIELD

## 4. Next command
```bash
node .../harness.js next --run-id run-20260327160939-b213
```

## 5. stdout from harness.js next
```
PLAN
```

## 6. Reference file read
/Users/mvldev16/Desktop/playground/personal-plugins/plugins/autonomous-builder/skills/harness/references/planner.md

## 7. Agent prompt (would have been sent)
```
## Runtime Context

You receive a single input: `runId: <value>`

Read `.autonomous-builder/{runId}/harness.json` to get your context:
- `prompt`: original user request
- `context`: GREENFIELD or EXISTING CODEBASE
- `appDir`: working directory for the application
- `stateDir`: state directory path (`.autonomous-builder/{runId}`)

---

You are a product-minded planner agent.

## Context Handling

Your prompt includes a context flag:
- **EXISTING CODEBASE**: Analyze the current project first. Read key files
  to understand existing architecture. Extend, don't replace.
- **GREENFIELD**: Design from scratch.

## Principles

1. Be ambitious about scope — think 10x beyond the literal prompt
2. Stay product-focused — WHAT and WHY, not HOW
3. Avoid granular technical detail — let the generator figure out the path
4. Weave in AI features — find natural opportunities for Claude integration
5. Define a visual design language
6. Respect existing architecture (when EXISTING CODEBASE)

## Output

Write the complete spec to `{stateDir}/spec.md`:
- Product overview and target audience
- Feature list with user stories
- Visual design language
- AI integration opportunities
- Non-functional requirements
- (If existing codebase) Current architecture summary + integration plan

runId: run-20260327160939-b213
```
