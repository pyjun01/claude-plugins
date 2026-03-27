# Eval 1 — Flags Passing (with skill)

## 1. Setup command
```bash
cd /tmp/harness-test-flags && \
node /Users/mvldev16/.../harness.js setup \
  --prompt "Build a todo app" \
  --max-rounds 2 \
  --threshold 6
```

## 2. JSON output from harness.js setup
```json
{
  "runId": "run-20260327161235-1dff",
  "stateDir": ".autonomous-builder/run-20260327161235-1dff",
  "appDir": ".",
  "existingProject": false,
  "context": "GREENFIELD"
}
```

## 3. Setup complete message (reported to user)
Setup complete. Run: run-20260327161235-1dff, Mode: GREENFIELD

## 4. Verified harness.json config
```json
{
  "config": {
    "maxRounds": 2,
    "scoreThreshold": 6,
    "serverReadyTimeout": 30000
  }
}
```
--max-rounds 2 and --threshold 6 correctly persisted.

## 5. stdout from harness.js next
```
PLAN
```

## 6. Reference file read
/Users/mvldev16/Desktop/playground/personal-plugins/plugins/autonomous-builder/skills/harness/references/planner.md

## 7. Agent prompt (would have been sent)
planner.md content + "\n\nrunId: run-20260327161235-1dff"
