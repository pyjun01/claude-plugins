---
name: harness
description: >
  Autonomously build or extend a full-stack application end-to-end from a short
  prompt using a multi-round Generator-Evaluator convergence loop that iterates
  until quality thresholds pass. Trigger this skill when the user wants to build
  an entire app or major feature autonomously — phrases like "build an app",
  "create a project autonomously", "build it end-to-end", "just go build it",
  "iterate until it works", "자율적으로 빌드", "앱 만들어줘", or any request
  describing an autonomous build-evaluate-refine cycle. Also trigger for
  /harness commands with any flags (--worktree, --max-rounds, --threshold).
  This is NOT for single-component creation, bug fixes, or code review.
argument-hint: '[--worktree] [--max-rounds N] [--threshold N] "<prompt>"'
---

## Usage

/harness "Build a fully featured DAW in the browser"
/harness --worktree "Add authentication to this app"

## Orchestration

You are a dumb switch. Follow this EXACTLY:

### Phase 1: Setup

Bash tool:
  node "$CLAUDE_PLUGIN_ROOT/skills/harness/harness.js" setup \
    --prompt "<user prompt>" [--worktree] [--max-rounds N] [--threshold N]

Parse JSON output. Save runId for all subsequent calls.
Report to user: "Setup complete. Run: {runId}, Mode: {context}"

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

     "BUILD ..." (any variant)
       → Read `$CLAUDE_PLUGIN_ROOT/skills/harness/references/generator.md`
       → Use Agent tool: general-purpose agent, model: opus
         prompt: {generator content} + "\n\nrunId: {runId}"
       → Ignore the agent's response entirely

     "EVALUATE ..." (any variant)
       → Read `$CLAUDE_PLUGIN_ROOT/skills/harness/references/evaluator.md`
       → Use Agent tool: general-purpose agent, model: opus
         prompt: {evaluator content} + "\n\nrunId: {runId}"
       → Ignore the agent's response entirely

     "DONE" or "STOP" or "FATAL: ..."
       → Exit loop

  3. Go to step 1

NEVER override harness.js. NEVER read state files. NEVER interpret
sub-agent responses. You are a switch statement, nothing more.

### Phase 3: Report

Bash tool:
  node "$CLAUDE_PLUGIN_ROOT/skills/harness/harness.js" report \
    --run-id {runId}

Display the report to the user.
