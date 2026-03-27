#!/bin/bash
# Minimal e2e test for harness.js state machine
# Tests the full phase transition: init → plan → build → evaluate → done
# Uses mock files instead of real agents/servers

set -e

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
HARNESS_JS="$REPO_ROOT/plugins/autonomous-builder/skills/harness/harness.js"
HARNESS="node $HARNESS_JS"
SETTINGS="$REPO_ROOT/plugins/autonomous-builder/skills/harness/config/settings.json"
SETTINGS_BACKUP="${SETTINGS}.bak"

PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $label"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local label="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $label"
    echo "    expected to contain: $expected"
    echo "    actual: $actual"
    FAIL=$((FAIL + 1))
  fi
}

assert_file_exists() {
  local label="$1" filepath="$2"
  if [ -f "$filepath" ]; then
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $label ($filepath not found)"
    FAIL=$((FAIL + 1))
  fi
}

# Work in a temp directory (simulates a real project dir)
WORK_DIR=$(mktemp -d)
echo "<html><body>test</body></html>" > "$WORK_DIR/index.html"
cd "$WORK_DIR"
git init -q

cleanup() {
  cd /
  rm -rf "$WORK_DIR"
  # Restore original settings if backup exists
  if [ -f "$SETTINGS_BACKUP" ]; then
    mv "$SETTINGS_BACKUP" "$SETTINGS"
  fi
}
trap cleanup EXIT

# Use short timeout for tests (no real server)
cp "$SETTINGS" "$SETTINGS_BACKUP"
python3 -c "
import json
s = json.load(open('$SETTINGS'))
s['serverReadyTimeout'] = 2000
json.dump(s, open('$SETTINGS', 'w'), indent=2)
"

echo "═══════════════════════════════════════"
echo " harness.js State Machine E2E Test"
echo "═══════════════════════════════════════"
echo " workdir: $WORK_DIR"
echo ""

# ─── Test 1: Setup ────────────────────────────────────────
echo "Test 1: setup"
SETUP_OUTPUT=$($HARNESS setup --prompt "Build a simple counter app" 2>/dev/null)
RUN_ID=$(echo "$SETUP_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['runId'])")
STATE_DIR=$(echo "$SETUP_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['stateDir'])")
CONTEXT=$(echo "$SETUP_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['context'])")
EXISTING=$(echo "$SETUP_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['existingProject'])")

assert_contains "runId starts with run-" "run-" "$RUN_ID"
assert_file_exists "harness.json created" "$STATE_DIR/harness.json"
assert_eq "context is GREENFIELD" "GREENFIELD" "$CONTEXT"
assert_eq "existingProject is False (no package.json)" "False" "$EXISTING"

echo ""

# ─── Test 2: next → PLAN ─────────────────────────────────
echo "Test 2: next (init → plan) → PLAN"
OUTPUT=$($HARNESS next --run-id "$RUN_ID" 2>/dev/null)
assert_eq "returns PLAN" "PLAN" "$OUTPUT"

PHASE=$(python3 -c "import json; print(json.load(open('$STATE_DIR/harness.json'))['phase'])")
assert_eq "phase is plan" "plan" "$PHASE"

echo ""

# ─── Test 3: next without spec.md → FATAL ────────────────
echo "Test 3: next (plan, no spec.md) → FATAL"
OUTPUT=$($HARNESS next --run-id "$RUN_ID" 2>/dev/null)
assert_contains "returns FATAL" "FATAL" "$OUTPUT"

echo ""

# ─── Test 4: Create mock spec.md, next → BUILD ───────────
echo "Test 4: next (plan, with spec.md) → BUILD"

# Reset phase to plan
python3 -c "
import json
state = json.load(open('$STATE_DIR/harness.json'))
state['phase'] = 'plan'
json.dump(state, open('$STATE_DIR/harness.json', 'w'), indent=2)
"

cat > "$STATE_DIR/spec.md" << 'SPEC'
# Counter App Spec
## Features
1. Increment button
2. Decrement button
3. Display current count
SPEC

OUTPUT=$($HARNESS next --run-id "$RUN_ID" 2>/dev/null)
assert_contains "returns BUILD" "BUILD" "$OUTPUT"
assert_contains "round=1" "round=1" "$OUTPUT"
assert_contains "strategy=initial" "strategy=initial" "$OUTPUT"
assert_contains "context=GREENFIELD" "context=GREENFIELD" "$OUTPUT"

PHASE=$(python3 -c "import json; print(json.load(open('$STATE_DIR/harness.json'))['phase'])")
assert_eq "phase is build" "build" "$PHASE"

echo ""

# ─── Test 5: next (build, server auto-detected) → EVALUATE ──
echo "Test 5: next (build, html detected) → server starts → EVALUATE"
OUTPUT=$($HARNESS next --run-id "$RUN_ID" 2>/dev/null)
assert_contains "returns EVALUATE" "EVALUATE" "$OUTPUT"
assert_contains "port=5173" "port=5173" "$OUTPUT"

# Server should be running — stop it via state
python3 -c "
import json
state = json.load(open('$STATE_DIR/harness.json'))
pid = state.get('serverPid')
if pid:
    import os, signal
    try: os.killpg(pid, signal.SIGTERM)
    except: pass
    state['serverPid'] = None
    json.dump(state, open('$STATE_DIR/harness.json', 'w'), indent=2)
"

echo ""

# ─── Test 6: Simulate evaluate phase with mock scores ─────
echo "Test 6: Simulate evaluate phase with mock scores (below threshold)"

# State should already be in evaluate phase from test 5
mkdir -p "$STATE_DIR/round-1"
cat > "$STATE_DIR/round-1/scores.json" << 'SCORES'
{
  "round": 1,
  "timestamp": "2026-03-26T16:00:00Z",
  "scores": {
    "product_depth": 5,
    "functionality": 4,
    "visual_design": 6,
    "code_quality": 5
  },
  "allPassed": false,
  "summary": "Basic structure exists but core features are stubs"
}
SCORES

OUTPUT=$($HARNESS next --run-id "$RUN_ID" 2>/dev/null)
assert_contains "returns BUILD (REFINE)" "BUILD" "$OUTPUT"
assert_contains "strategy=REFINE" "REFINE" "$OUTPUT"
assert_file_exists "score-history.json created" "$STATE_DIR/score-history.json"

HISTORY_LEN=$(python3 -c "import json; print(len(json.load(open('$STATE_DIR/score-history.json'))))")
assert_eq "score history has 1 entry" "1" "$HISTORY_LEN"

echo ""

# ─── Test 7: Simulate passing scores → DONE ──────────────
echo "Test 7: Simulate passing scores → DONE"

python3 -c "
import json
state = json.load(open('$STATE_DIR/harness.json'))
state['phase'] = 'evaluate'
state['round'] = 2
state['serverPid'] = None
json.dump(state, open('$STATE_DIR/harness.json', 'w'), indent=2)
"

mkdir -p "$STATE_DIR/round-2"
cat > "$STATE_DIR/round-2/scores.json" << 'SCORES'
{
  "round": 2,
  "timestamp": "2026-03-26T17:00:00Z",
  "scores": {
    "product_depth": 8,
    "functionality": 7,
    "visual_design": 8,
    "code_quality": 8
  },
  "allPassed": true,
  "summary": "All criteria meet threshold"
}
SCORES

OUTPUT=$($HARNESS next --run-id "$RUN_ID" 2>/dev/null)
assert_eq "returns DONE" "DONE" "$OUTPUT"

PHASE=$(python3 -c "import json; print(json.load(open('$STATE_DIR/harness.json'))['phase'])")
assert_eq "phase is done" "done" "$PHASE"

echo ""

# ─── Test 8: Report ───────────────────────────────────────
echo "Test 8: report"
REPORT=$($HARNESS report --run-id "$RUN_ID" 2>/dev/null)
assert_contains "report contains prompt" "counter app" "$REPORT"
assert_contains "report contains GREENFIELD" "GREENFIELD" "$REPORT"
assert_contains "report contains R1 scores" "depth=5" "$REPORT"
assert_contains "report contains R2 scores" "depth=8" "$REPORT"
assert_contains "report contains state dir" "$STATE_DIR" "$REPORT"

echo ""

# ─── Test 9: next after done → DONE ──────────────────────
echo "Test 9: next after done → still DONE"
OUTPUT=$($HARNESS next --run-id "$RUN_ID" 2>/dev/null)
assert_eq "returns DONE" "DONE" "$OUTPUT"

echo ""

# ─── Summary ──────────────────────────────────────────────
echo "═══════════════════════════════════════"
TOTAL=$((PASS + FAIL))
echo -e " Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${TOTAL} total"
echo "═══════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
