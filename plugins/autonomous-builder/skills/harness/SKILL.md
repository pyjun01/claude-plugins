---
name: harness
description: >
  Autonomously build or extend a full-stack application end-to-end from a short
  prompt using a multi-round Generator-Evaluator convergence loop that iterates
  until quality thresholds pass. Supports multi-target builds: web (Playwright),
  mobile (Maestro MCP on iOS Simulator), API (curl), and CLI (bash) — including
  full-stack combinations like api+web+mobile. Trigger this skill when the user
  wants to build an entire app or major feature autonomously — phrases like
  "build an app", "create a project autonomously", "build it end-to-end",
  "just go build it", "iterate until it works", "자율적으로 빌드", "앱 만들어줘",
  or any request describing an autonomous build-evaluate-refine cycle. Also
  trigger for /harness commands with any flags (--worktree, --max-rounds,
  --threshold, --targets). This is NOT for single-component creation, bug
  fixes, or code review.
argument-hint: '[--worktree] [--max-rounds N] [--threshold N] [--targets "api,web,mobile"] "<prompt>"'
---

## Usage

```
/harness "Build a fully featured DAW in the browser"
/harness --worktree "Add authentication to this app"
/harness --targets "api,web,mobile" "Build a project management app"
/harness --targets "mobile" "Build a fitness tracking app"
/harness --targets "api:4000,web:3000" "Build a chat app"
```

## Orchestration

You are a dumb switch. Follow this EXACTLY:

### Phase 1: Setup

Bash tool:
  node "$CLAUDE_PLUGIN_ROOT/skills/harness/harness.js" setup \
    --prompt "<user prompt>" [--worktree] [--max-rounds N] [--threshold N] [--targets "<targets>"]

Parse JSON output. Save runId for all subsequent calls.
Report to user: "Setup complete. Run: {runId}, Mode: {context}"

### Execution Mode Selection

After setup, read harness.json and determine execution mode:

- **Team mode**: 2+ targets AND `config.executionMode` is `"auto"` or `"team"`
- **Sub-agent mode**: 1 target, OR `config.executionMode` is `"subagent"`

### Phase 2: Loop

Repeat until done:

  1. Bash tool:
     node "$CLAUDE_PLUGIN_ROOT/skills/harness/harness.js" next \
       --run-id {runId}

  2. Read the action from stdout. Parse the action keyword:

     "PLAN"
       → Read `$CLAUDE_PLUGIN_ROOT/skills/harness/references/planner.md`
       → Use Agent tool: general-purpose agent, model: opus
         prompt: {planner content} + "\n\nrunId: {runId}"
       → Ignore the agent's response entirely

     "REVIEW"
       → Read `$CLAUDE_PLUGIN_ROOT/skills/harness/references/reviewer.md`
       → Use Agent tool: general-purpose agent, model: opus
         prompt: {reviewer content} + "\n\nrunId: {runId}"
       → Ignore the agent's response entirely

     "BUILD ..." (any variant)
       → Parse the `targets=` value from the action line (comma-separated target names)
       → Read `$CLAUDE_PLUGIN_ROOT/skills/harness/references/generator.md`
       → Read harness.json to get the targets object (for target types and eval tools)

       **If Team mode:**
         → Collect server target names and client target names separately
         → TeamCreate:
           team_name: "build-{runId}-r{round}"
           members: one per target, each with:
             name: "{targetName}-gen"
             model: "opus"
             prompt: {generator content} + "\n\nrunId: {runId}\ntarget: {targetName}"
         → TaskCreate: one task per target
           - Server targets: no dependencies
           - Client targets: depends_on server target tasks
             (this enforces server-first build order within the team)
         → Wait for all team members to complete (they self-coordinate via SendMessage)
         → TeamDelete

       **If Sub-agent mode:**
         → Determine build order: server targets first, then client targets.

         → For EACH server target (sequentially):
           → Use Agent tool: general-purpose agent, model: opus
             prompt: {generator content} + "\n\nrunId: {runId}\ntarget: {targetName}"
           → Wait for this agent to complete before starting the next target

         → Then for EACH client target (can be parallel if multiple):
           → Use Agent tool: general-purpose agent, model: opus
             prompt: {generator content} + "\n\nrunId: {runId}\ntarget: {targetName}"
           → Client targets can run in parallel since they all read the same contract

       → Ignore all agent responses entirely

     "EVALUATE ..." (any variant)
       → Parse the `targets=` value (format: name:port:eval,name:port:eval,...)
       → Read harness.json to check `config.evaluationMode` ("dialectic" or "standard")
       → Read `$CLAUDE_PLUGIN_ROOT/skills/harness/references/evaluator.md`
       → If dialectic mode: also read `$CLAUDE_PLUGIN_ROOT/skills/harness/references/challenger.md`

       **If dialectic mode (config.evaluationMode === "dialectic"):**

         Step 1 — Lead evaluators (parallel, all targets):

           **If Team mode:**
             → TeamCreate: team_name "eval-lead-{runId}-r{round}"
               members: one per target, name: "{targetName}-lead"
               prompt: {evaluator content} + "\n\nrunId: {runId}\ntarget: {targetName}"
             → TaskCreate: one task per target (no dependencies — all in parallel)
             → Wait for all to complete → TeamDelete

           **If Sub-agent mode:**
             → For EACH target (parallel):
               → Agent tool: prompt: {evaluator content} + "\n\nrunId: {runId}\ntarget: {targetName}"

         Step 2 — Challenger evaluators (parallel, all targets):

           **If Team mode:**
             → TeamCreate: team_name "eval-challenge-{runId}-r{round}"
               members: one per target, name: "{targetName}-challenger"
               prompt: {challenger content} + "\n\nrunId: {runId}\ntarget: {targetName}"
             → TaskCreate: one task per target (no dependencies — all in parallel)
             → Wait for all to complete → TeamDelete

           **If Sub-agent mode:**
             → For EACH target (parallel):
               → Agent tool: prompt: {challenger content} + "\n\nrunId: {runId}\ntarget: {targetName}"

         → Challengers write the final scores-{target}.json files.

       **If standard mode (config.evaluationMode === "standard"):**

         **If Team mode:**
           → TeamCreate:
             team_name: "eval-{runId}-r{round}"
             members: one per target, each with:
               name: "{targetName}-eval"
               model: "opus"
               prompt: {evaluator content} + "\n\nrunId: {runId}\ntarget: {targetName}"
           → TaskCreate: one task per target (no dependencies — all evaluate in parallel)
           → Wait for all team members to complete (they share cross-target findings via SendMessage)
           → TeamDelete

         **If Sub-agent mode:**
           → For EACH target (can be parallel):
             → Use Agent tool: general-purpose agent, model: opus
               prompt: {evaluator content} + "\n\nrunId: {runId}\ntarget: {targetName}"
             → All targets are evaluated with all processes running simultaneously

       → The harness merges scores-{target}.json files automatically on the next `harness.js next` call.

       → Ignore all agent responses entirely

     "DONE" or "STOP" or "FATAL: ..."
       → Exit loop

  3. Go to step 1

### Critical Rules

- NEVER override harness.js. NEVER read state files (except to read harness.json
  for target info during BUILD/EVALUATE dispatch). NEVER interpret sub-agent responses.
- NEVER use run_in_background for ANY harness.js Bash call — harness.js is a
  file-based state machine and concurrent calls corrupt state. ALL harness.js
  calls MUST be foreground (blocking).
- In sub-agent mode: server target generators MUST complete before client target generators start.
- In team mode: use TaskCreate with depends_on to enforce server-before-client order.
  The team members handle the sequencing themselves.
- Evaluator agents always run in parallel (both modes) — all target processes are already running.
- You are a switch statement, nothing more. Do not add logic beyond dispatch.
- Team mode specific: always TeamDelete after each BUILD or EVALUATE phase completes.
  Only one team can be active at a time.

### Phase 3: Report

Bash tool:
  node "$CLAUDE_PLUGIN_ROOT/skills/harness/harness.js" report \
    --run-id {runId}

Display the report to the user.
