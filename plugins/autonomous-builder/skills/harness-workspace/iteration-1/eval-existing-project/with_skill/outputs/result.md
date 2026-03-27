# Harness Shallow Evaluation — Existing Project

> Prompt: "Add dark mode to this app"
> Working directory: /tmp/harness-test-existing/

---

## 1. Exact Setup Command

```bash
node "/Users/mvldev16/Desktop/playground/personal-plugins/plugins/autonomous-builder/skills/harness/harness.js" setup \
  --prompt "Add dark mode to this app"
```

Note: The command is run with cwd = `/tmp/harness-test-existing/` (where `package.json` exists).

---

## 2. Raw JSON Output from harness.js setup

> Bash tool execution was denied during this evaluation run.
> The following is a faithful simulation derived from reading harness.js source exactly.

harness.js `cmdSetup()` logic:
- Reads config from `$PLUGIN_ROOT/skills/harness/config/settings.json`
- Generates `runId` = `run-<14-digit-timestamp>-<4-hex-chars>` (e.g., `run-20260328120000-a3f1`)
- `detectExistingProject('/tmp/harness-test-existing/')` → finds `package.json` → returns `true`
- `context` = `"EXISTING CODEBASE"`
- `appDir` = `"."` (process.cwd() relative to itself)
- `stateDir` = `".autonomous-builder/run-20260328120000-a3f1"`

**Simulated raw JSON output:**

```json
{
  "runId": "run-20260328120000-a3f1",
  "stateDir": ".autonomous-builder/run-20260328120000-a3f1",
  "appDir": ".",
  "existingProject": true,
  "context": "EXISTING CODEBASE"
}
```

---

## 3. "Setup Complete" Message to Report to User

```
Setup complete. Run: run-20260328120000-a3f1, Mode: EXISTING CODEBASE
```

---

## 4. Exact Next Command

```bash
node "/Users/mvldev16/Desktop/playground/personal-plugins/plugins/autonomous-builder/skills/harness/harness.js" next \
  --run-id run-20260328120000-a3f1
```

---

## 5. Action Keyword Returned by next

```
PLAN
```

Logic trace: `cmdNext()` reads `state.phase === 'init'` → sets phase to `'plan'` → writes state → outputs `PLAN`.

---

## 6. Reference File Read

```
/Users/mvldev16/Desktop/playground/personal-plugins/plugins/autonomous-builder/skills/harness/references/planner.md
```

---

## 7. Full Agent Prompt (would have been sent)

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

runId: run-20260328120000-a3f1
```

---

## Notes

- Bash tool execution was denied during this evaluation. All outputs above are simulated by
  reading harness.js source code directly and tracing the execution path deterministically.
- The runId timestamp and random suffix are illustrative. The actual values would differ.
- The planner.md reference file content was read verbatim from disk and is reproduced exactly
  in section 7, with `runId` appended as instructed by SKILL.md.
- The agent would be spawned as a general-purpose agent with model: opus — this step was
  deliberately skipped per the shallow evaluation instructions.
