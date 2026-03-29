#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawn } = require('child_process');

// ─── Arg parsing ────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0];

function getFlag(name) {
  const idx = args.indexOf('--' + name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name) {
  return args.includes('--' + name);
}

// ─── Paths ──────────────────────────────────────────────────
const PLUGIN_ROOT = path.resolve(__dirname);
const CONFIG_PATH = path.join(PLUGIN_ROOT, 'config', 'settings.json');
const STATE_ROOT = path.resolve('.autonomous-builder');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function statePath(runId) {
  return path.join(STATE_ROOT, runId);
}

function readState(runId) {
  const p = path.join(statePath(runId), 'harness.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeState(state) {
  const p = path.join(statePath(state.runId), 'harness.json');
  fs.writeFileSync(p, JSON.stringify(state, null, 2));
}

// ─── Utilities ──────────────────────────────────────────────
function generateRunId() {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = crypto.randomBytes(2).toString('hex');
  return `run-${ts}-${rand}`;
}

function detectExistingProject(dir) {
  const markers = ['package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml',
                   'pom.xml', 'build.gradle', 'Makefile'];
  return markers.some(m => fs.existsSync(path.join(dir, m)));
}

// ─── Target defaults ────────────────────────────────────────
const TARGET_DEFAULTS = {
  web:    { type: 'client', port: 5173, eval: 'playwright' },
  mobile: { type: 'client', port: 8081, eval: 'maestro' },
  api:    { type: 'server', port: 3001, eval: 'curl' },
  cli:    { type: 'client', port: null, eval: 'bash' },
};

/**
 * Parse --targets flag into targets object.
 *
 * Formats:
 *   "web"                         → { web: { type: client, port: 5173, eval: playwright } }
 *   "api,web,mobile"              → { api: {...}, web: {...}, mobile: {...} }
 *   "api:4000,web:3000"           → { api: {..., port: 4000}, web: {..., port: 3000} }
 */
function parseTargetsFlag(flag) {
  if (!flag) return null;
  const targets = {};
  for (const part of flag.split(',')) {
    const trimmed = part.trim();
    const [name, portStr] = trimmed.split(':');
    const defaults = TARGET_DEFAULTS[name];
    if (!defaults) {
      console.error(`WARNING: Unknown target "${name}", using client defaults`);
      targets[name] = { type: 'client', port: parseInt(portStr) || 5173, eval: 'playwright', pid: null };
      continue;
    }
    targets[name] = {
      ...defaults,
      port: portStr ? parseInt(portStr) : defaults.port,
      pid: null,
    };
  }
  return targets;
}

/**
 * Parse targets from spec.md.
 *
 * Expected format at top of spec:
 *   targets:
 *     api: { type: server, port: 3001 }
 *     web: { type: client, port: 5173, eval: playwright }
 *     mobile: { type: client, port: 8081, eval: maestro }
 */
function parseTargetsFromSpec(specContent) {
  const targets = {};
  const targetsMatch = specContent.match(/^targets:\s*\n((?:\s+\w+:.*\n?)+)/m);
  if (!targetsMatch) return null;

  const lines = targetsMatch[1].split('\n').filter(l => l.trim());
  for (const line of lines) {
    const lineMatch = line.match(/^\s+(\w+):\s*\{(.+)\}/);
    if (!lineMatch) continue;
    const name = lineMatch[1];
    const props = lineMatch[2];

    const defaults = TARGET_DEFAULTS[name] || { type: 'client', port: 5173, eval: 'playwright' };
    const target = { ...defaults, pid: null };

    const typeMatch = props.match(/type:\s*(\w+)/);
    if (typeMatch) target.type = typeMatch[1];

    const portMatch = props.match(/port:\s*(\d+)/);
    if (portMatch) target.port = parseInt(portMatch[1]);

    const evalMatch = props.match(/eval:\s*(\w+)/);
    if (evalMatch) target.eval = evalMatch[1];

    targets[name] = target;
  }
  return Object.keys(targets).length > 0 ? targets : null;
}

// ─── Target helpers ─────────────────────────────────────────

/** Returns true if a target needs a dev process (has a port). */
function targetNeedsProcess(target) {
  return target.port !== null;
}

/** Returns sorted target names: server targets first, then client targets. */
function sortedTargetNames(targets) {
  const names = Object.keys(targets);
  const servers = names.filter(n => targets[n].type === 'server');
  const clients = names.filter(n => targets[n].type === 'client');
  return [...servers, ...clients];
}

/** Returns scoring criteria for a given target based on its eval tool. */
function scoreCriteria(target) {
  const common = ['product_depth', 'functionality', 'code_quality'];
  switch (target.eval) {
    case 'playwright':
      return [...common, 'visual_design', 'security'];
    case 'maestro':
      return [...common, 'visual_design', 'mobile_ux', 'security'];
    case 'curl':
      return [...common, 'api_design', 'security'];
    case 'bash':
      return [...common, 'ux_design', 'security'];
    default:
      return [...common, 'visual_design', 'security'];
  }
}

/** Returns all scoring criteria across all targets (flat, deduplicated). */
function allCriteria(targets) {
  const set = new Set();
  for (const t of Object.values(targets)) {
    for (const c of scoreCriteria(t)) set.add(c);
  }
  return [...set];
}

// ─── Server management ──────────────────────────────────────
function detectServerConfig(appDir, port) {
  const resolved = path.resolve(appDir);

  if (!fs.existsSync(resolved)) {
    return { command: 'node', args: ['-e', `process.exit(1)`] };
  }

  const pkgPath = path.join(resolved, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const scripts = pkg.scripts || {};
      if (scripts.dev) {
        return { command: 'npm', args: ['run', 'dev', '--', '--port', String(port)] };
      }
      if (scripts.start) {
        return { command: 'npm', args: ['run', 'start', '--', '--port', String(port)] };
      }
    } catch {}
  }

  const pyprojectPath = path.join(resolved, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    return { command: 'python3', args: ['-m', 'uvicorn', 'main:app', '--port', String(port)] };
  }

  try {
    const htmlFiles = fs.readdirSync(resolved).filter(f => f.endsWith('.html'));
    if (htmlFiles.length > 0) {
      return { command: 'python3', args: ['-m', 'http.server', String(port)] };
    }
  } catch {}

  return { command: 'npx', args: ['serve', '-l', String(port)] };
}

function waitForPort(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const host of ['127.0.0.1', '::1']) {
      try {
        execFileSync('node', ['-e', `
          const http = require('http');
          const req = http.get({host:'${host}',port:${port},timeout:1000}, () => {
            process.exit(0);
          });
          req.on('error', () => process.exit(1));
          req.on('timeout', () => { req.destroy(); process.exit(1); });
        `], { timeout: 3000, stdio: 'pipe' });
        return true;
      } catch {}
    }
    const buf = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(buf), 0, 0, 1000);
  }
  return false;
}

/**
 * Start all target processes that need a port.
 * Reads per-target server-command-{name}.txt files, falls back to auto-detection.
 * Returns { ok, errors[] }.
 */
function tryStartTargets(state) {
  const sd = statePath(state.runId);
  const errors = [];

  // Read per-target server command files
  const serverCommands = {};
  for (const name of Object.keys(state.targets)) {
    const cmdFile = path.join(sd, `server-command-${name}.txt`);
    if (fs.existsSync(cmdFile)) {
      serverCommands[name] = fs.readFileSync(cmdFile, 'utf-8').trim();
    }
  }

  for (const [name, target] of Object.entries(state.targets)) {
    if (!targetNeedsProcess(target)) continue;

    let serverConfig;
    let useShell = false;
    if (serverCommands[name]) {
      const raw = serverCommands[name].trim();
      // Use shell execution if the command contains shell operators (cd, &&, ||, |, ;)
      if (/\b(cd|&&|\|\||[|;])/.test(raw)) {
        serverConfig = { command: raw, args: [] };
        useShell = true;
      } else {
        const parts = raw.split(/\s+/);
        serverConfig = { command: parts[0], args: parts.slice(1) };
      }
    } else {
      serverConfig = detectServerConfig(state.appDir, target.port);
    }

    try {
      const server = spawn(serverConfig.command, serverConfig.args, {
        cwd: path.resolve(state.appDir),
        shell: useShell,
        stdio: ['ignore',
          fs.openSync(path.join(sd, `${name}-stdout.log`), 'w'),
          fs.openSync(path.join(sd, `${name}-stderr.log`), 'w')],
        detached: true,
      });
      server.unref();

      state.targets[name].pid = server.pid;
      writeState(state);

      const ready = waitForPort(target.port, state.config.serverReadyTimeout);
      if (!ready) {
        try { process.kill(-server.pid); } catch {}
        state.targets[name].pid = null;
        const stderrLog = path.join(sd, `${name}-stderr.log`);
        const stderr = fs.existsSync(stderrLog)
          ? fs.readFileSync(stderrLog, 'utf-8').slice(0, 500)
          : 'no stderr';
        errors.push({ target: name, error: `${name} (${serverConfig.command} ${serverConfig.args.join(' ')}) did not respond on port ${target.port} within ${state.config.serverReadyTimeout}ms. stderr: ${stderr}` });
      }
    } catch (e) {
      errors.push({ target: name, error: `Failed to start ${name} (${serverConfig.command}): ${e.message}` });
    }
  }

  writeState(state);
  return { ok: errors.length === 0, errors };
}

/** Check if a port is in use. */
function isPortInUse(port) {
  try {
    execFileSync('node', ['-e', `
      const http = require('http');
      const req = http.get({host:'127.0.0.1',port:${port},timeout:500}, () => process.exit(0));
      req.on('error', () => process.exit(1));
      req.on('timeout', () => { req.destroy(); process.exit(1); });
    `], { timeout: 2000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Kill any process occupying a port (platform: macOS/Linux). */
function killProcessOnPort(port) {
  try {
    const pid = execFileSync('lsof', ['-ti', `:${port}`], { stdio: 'pipe' }).toString().trim();
    if (pid) {
      for (const p of pid.split('\n')) {
        try { process.kill(parseInt(p), 'SIGKILL'); } catch {}
      }
    }
  } catch {}
}

/** Kill all running target processes and wait for ports to be released. */
function stopTargets(targets) {
  // Send SIGTERM to all processes first
  for (const [name, target] of Object.entries(targets)) {
    if (!target.pid) continue;
    try {
      if (process.platform === 'win32') {
        execFileSync('taskkill', ['/PID', String(target.pid), '/T', '/F'], { stdio: 'pipe' });
      } else {
        process.kill(-target.pid, 'SIGTERM');
      }
    } catch {}
    target.pid = null;
  }

  // Wait for ports to be released, force-kill if stuck
  for (const [name, target] of Object.entries(targets)) {
    if (!target.port) continue;
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && isPortInUse(target.port)) {
      const buf = new SharedArrayBuffer(4);
      Atomics.wait(new Int32Array(buf), 0, 0, 500);
    }
    // If port is still in use after 5s, force kill
    if (isPortInUse(target.port)) {
      killProcessOnPort(target.port);
      // Brief wait for SIGKILL to take effect
      const buf = new SharedArrayBuffer(4);
      Atomics.wait(new Int32Array(buf), 0, 0, 1000);
    }
  }
}

// ─── Score helpers ──────────────────────────────────────────
function avgScore(scores) {
  const vals = Object.values(scores);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Compute average score across all targets' scores. */
function avgScoreAllTargets(targetsScores) {
  let sum = 0;
  let count = 0;
  for (const t of Object.values(targetsScores)) {
    for (const v of Object.values(t.scores)) {
      sum += v;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

/** Validate that scores data has the expected structure for all targets. */
function validateTargetScores(data, targets) {
  if (!data || typeof data !== 'object') return false;
  if (!data.targets || typeof data.targets !== 'object') return false;
  for (const [name, target] of Object.entries(targets)) {
    const targetData = data.targets[name];
    if (!targetData || !targetData.scores || typeof targetData.scores !== 'object') return false;
    const criteria = scoreCriteria(target);
    if (!criteria.every(k => typeof targetData.scores[k] === 'number')) return false;
  }
  return true;
}

function readScoreHistory(stateDir) {
  const p = path.join(stateDir, 'score-history.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function appendScoreHistory(stateDir, entry, targets) {
  if (!validateTargetScores(entry, targets)) {
    console.error(`WARNING: Invalid score entry rejected: ${JSON.stringify(entry).slice(0, 200)}`);
    return readScoreHistory(stateDir);
  }
  const history = readScoreHistory(stateDir);
  history.push(entry);
  fs.writeFileSync(path.join(stateDir, 'score-history.json'), JSON.stringify(history, null, 2));
  return history;
}

function writeFeedback(state, targetName, message) {
  const roundDir = path.join(statePath(state.runId), `round-${state.round}`);
  fs.mkdirSync(roundDir, { recursive: true });
  const filename = targetName ? `feedback-${targetName}.md` : 'feedback.md';
  const feedbackPath = path.join(roundDir, filename);
  const existing = fs.existsSync(feedbackPath)
    ? fs.readFileSync(feedbackPath, 'utf-8') + '\n\n---\n\n'
    : '';
  fs.writeFileSync(feedbackPath, existing + `## Harness Error\n\n${message}\n`);
}

function writeDefaultScores(state) {
  const roundDir = path.join(statePath(state.runId), `round-${state.round}`);
  fs.mkdirSync(roundDir, { recursive: true });
  const targetsScores = {};
  for (const [name, target] of Object.entries(state.targets)) {
    const criteria = scoreCriteria(target);
    const scoreObj = {};
    criteria.forEach(k => { scoreObj[k] = 0; });
    targetsScores[name] = { scores: scoreObj, summary: 'Default scores — evaluator did not produce results' };
  }
  const scores = {
    round: state.round,
    timestamp: new Date().toISOString(),
    targets: targetsScores,
    allPassed: false,
  };
  fs.writeFileSync(path.join(roundDir, 'scores.json'), JSON.stringify(scores, null, 2));
}

/**
 * Check if all scores across all targets meet the threshold.
 * Returns true only if every criterion in every target >= threshold.
 */
function allScoresPassed(targetsScores, threshold) {
  for (const t of Object.values(targetsScores)) {
    for (const v of Object.values(t.scores)) {
      if (v < threshold) return false;
    }
  }
  return true;
}

function strategicDecision(currentTargetsScores, history, config) {
  if (allScoresPassed(currentTargetsScores, config.scoreThreshold)) return 'DONE';
  if (history.length >= config.maxRounds) return 'STOP';
  if (history.length >= 2) {
    const prevEntry = history[history.length - 2];
    if (!prevEntry.targets) return 'REFINE';
    const prev = avgScoreAllTargets(prevEntry.targets);
    const curr = avgScoreAllTargets(currentTargetsScores);
    return curr >= prev ? 'REFINE' : 'PIVOT';
  }
  return 'REFINE';
}

// ─── Commands ───────────────────────────────────────────────

function cmdSetup() {
  const prompt = getFlag('prompt');
  if (!prompt) {
    console.error('FATAL: --prompt is required');
    process.exit(1);
  }

  const config = readConfig();
  const runId = generateRunId();
  const stateDir = statePath(runId);
  const worktree = hasFlag('worktree');
  const maxRounds = parseInt(getFlag('max-rounds') || config.maxRounds, 10);
  const threshold = parseInt(getFlag('threshold') || config.scoreThreshold, 10);

  // Create state directory
  fs.mkdirSync(stateDir, { recursive: true });

  // Create .autonomous-builder/.gitignore
  const abGitignore = path.join(STATE_ROOT, '.gitignore');
  if (!fs.existsSync(abGitignore)) {
    fs.writeFileSync(abGitignore, '*\n');
  }

  // Determine app directory
  let appDir;
  if (worktree) {
    const worktreeDir = path.join(stateDir, 'worktree');
    const branchName = `harness/${runId}`;
    execFileSync('git', ['worktree', 'add', worktreeDir, '-b', branchName],
      { cwd: process.cwd(), stdio: 'pipe' });
    appDir = worktreeDir;
  } else {
    appDir = process.cwd();
    if (!fs.existsSync(path.join(appDir, '.git'))) {
      execFileSync('git', ['init'], { cwd: appDir, stdio: 'pipe' });
    }
  }

  const existingProject = detectExistingProject(appDir);
  const context = existingProject ? 'EXISTING CODEBASE' : 'GREENFIELD';

  // Check for concurrent runs in normal mode
  if (!worktree) {
    const runs = fs.existsSync(STATE_ROOT)
      ? fs.readdirSync(STATE_ROOT).filter(d => d.startsWith('run-'))
      : [];
    for (const r of runs) {
      if (r === runId) continue;
      const hPath = path.join(STATE_ROOT, r, 'harness.json');
      if (fs.existsSync(hPath)) {
        const h = JSON.parse(fs.readFileSync(hPath, 'utf-8'));
        if (h.phase !== 'done') {
          console.error(`WARNING: Another run is active: ${r} (phase: ${h.phase})`);
        }
      }
    }
  }

  // Parse --targets flag
  const targetsFlag = getFlag('targets');
  const targets = parseTargetsFlag(targetsFlag);

  // Write initial state
  const state = {
    runId,
    prompt,
    worktree,
    existingProject,
    context,
    phase: 'init',
    round: 0,
    strategy: null,
    targets, // null if not specified — planner will define targets in spec.md
    startedAt: new Date().toISOString(),
    appDir: path.relative(process.cwd(), appDir) || '.',
    stateDir: path.relative(process.cwd(), stateDir),
    config: {
      maxRounds,
      scoreThreshold: threshold,
      serverReadyTimeout: config.serverReadyTimeout || 30000,
      executionMode: config.executionMode || 'auto',
      techStack: config.techStack || {},
    },
  };
  writeState(state);

  // Output for SKILL.md to parse
  console.log(JSON.stringify({
    runId: state.runId,
    stateDir: state.stateDir,
    appDir: state.appDir,
    existingProject: state.existingProject,
    context: state.context,
  }));
}

function cmdNext() {
  const runId = getFlag('run-id');
  if (!runId) { console.error('FATAL: --run-id is required'); process.exit(1); }

  const state = readState(runId);
  const sd = statePath(runId);

  // Concurrency guard
  const _snapPhase = state.phase;
  const _snapRound = state.round;
  const writeState = (s) => {
    const current = readState(runId);
    if (current.phase !== _snapPhase || current.round !== _snapRound) {
      console.log(`FATAL: Concurrent modification detected (expected ${_snapPhase}/R${_snapRound}, found ${current.phase}/R${current.round})`);
      process.exit(1);
    }
    const p = path.join(statePath(s.runId), 'harness.json');
    fs.writeFileSync(p, JSON.stringify(s, null, 2));
  };

  switch (state.phase) {
    case 'init': {
      state.phase = 'plan';
      writeState(state);
      console.log('PLAN');
      break;
    }

    case 'plan': {
      if (!fs.existsSync(path.join(sd, 'spec.md'))) {
        console.log('FATAL: Planner did not produce spec.md');
        break;
      }
      // Parse targets from spec.md if not already set via --targets flag
      if (!state.targets) {
        const spec = fs.readFileSync(path.join(sd, 'spec.md'), 'utf-8');
        const parsed = parseTargetsFromSpec(spec);
        if (parsed) {
          state.targets = parsed;
          // Ensure all targets have pid field
          for (const t of Object.values(state.targets)) {
            if (t.pid === undefined) t.pid = null;
          }
        } else {
          // Fallback: single web target
          state.targets = { web: { ...TARGET_DEFAULTS.web, pid: null } };
        }
      }
      state.phase = 'review';
      writeState(state);
      console.log('REVIEW');
      break;
    }

    case 'review': {
      // review-notes.md is optional — reviewer writes it if changes were made
      state.phase = 'build';
      state.round = 1;
      state.strategy = 'initial';
      writeState(state);
      const targetNames = Object.keys(state.targets).join(',');
      console.log(`BUILD round=1 strategy=initial context=${state.context} targets=${targetNames}`);
      break;
    }

    case 'build': {
      const roundDir = path.join(sd, `round-${state.round}`);
      fs.mkdirSync(roundDir, { recursive: true });

      const startResult = tryStartTargets(state);
      if (!startResult.ok) {
        for (const err of startResult.errors) {
          writeFeedback(state, err.target, `Server failed to start: ${err.error}`);
        }
        // Stop any targets that did start
        stopTargets(state.targets);

        const history = readScoreHistory(sd);
        if (history.length >= state.config.maxRounds) {
          state.phase = 'done';
          writeState(state);
          console.log('STOP');
          break;
        }
        state.round++;
        state.strategy = 'REFINE';
        writeState(state);
        const targetNames = Object.keys(state.targets).join(',');
        console.log(`BUILD round=${state.round} strategy=REFINE context=${state.context} targets=${targetNames}`);
        break;
      }

      state.phase = 'evaluate';
      writeState(state);

      // Build port map and sorted target list for evaluator
      const targetInfo = sortedTargetNames(state.targets)
        .map(n => `${n}:${state.targets[n].port || 'none'}:${state.targets[n].eval}`)
        .join(',');
      console.log(`EVALUATE round=${state.round} targets=${targetInfo}`);
      break;
    }

    case 'evaluate': {
      stopTargets(state.targets);

      const roundDir = path.join(sd, `round-${state.round}`);
      const scoresPath = path.join(roundDir, 'scores.json');

      // Merge per-target score files (scores-{target}.json) into scores.json
      if (!fs.existsSync(scoresPath)) {
        const mergedTargets = {};
        let hasAny = false;
        for (const name of Object.keys(state.targets)) {
          const perTargetPath = path.join(roundDir, `scores-${name}.json`);
          if (fs.existsSync(perTargetPath)) {
            try {
              const perTarget = JSON.parse(fs.readFileSync(perTargetPath, 'utf-8'));
              if (perTarget.targets && perTarget.targets[name]) {
                // Correct nested format
                mergedTargets[name] = perTarget.targets[name];
                hasAny = true;
              } else {
                // Auto-normalize flat formats: { product_depth: 8, ... } or { scores: { ... } }
                const criteria = scoreCriteria(state.targets[name]);
                let scores = null;
                if (perTarget.scores && typeof perTarget.scores === 'object' && !Array.isArray(perTarget.scores)) {
                  scores = perTarget.scores;
                } else if (criteria.some(c => typeof perTarget[c] === 'number')) {
                  scores = {};
                  for (const c of criteria) {
                    if (typeof perTarget[c] === 'number') scores[c] = perTarget[c];
                  }
                }
                if (scores && Object.keys(scores).length > 0) {
                  mergedTargets[name] = { scores, summary: perTarget.summary || '' };
                  hasAny = true;
                  console.error(`WARNING: scores-${name}.json used non-standard format, auto-normalized`);
                }
              }
            } catch {}
          }
        }
        if (hasAny) {
          const merged = {
            round: state.round,
            timestamp: new Date().toISOString(),
            targets: mergedTargets,
            allPassed: false,
          };
          fs.writeFileSync(scoresPath, JSON.stringify(merged, null, 2));
        } else {
          writeFeedback(state, null, 'Evaluator failed to produce scores. App may be too broken to test.');
          writeDefaultScores(state);
        }
      }

      let scoresData = JSON.parse(fs.readFileSync(scoresPath, 'utf-8'));

      if (!validateTargetScores(scoresData, state.targets)) {
        const expectedShape = {};
        for (const [name, target] of Object.entries(state.targets)) {
          expectedShape[name] = { scores: Object.fromEntries(scoreCriteria(target).map(c => [c, 'number'])), summary: 'string' };
        }
        writeFeedback(state, null, `Evaluator wrote invalid scores.json. Received:\n\`\`\`json\n${JSON.stringify(scoresData, null, 2).slice(0, 500)}\n\`\`\`\nExpected: { round, timestamp, targets: ${JSON.stringify(expectedShape, null, 2).slice(0, 500)}, allPassed }`);
        writeDefaultScores(state);
        scoresData = JSON.parse(fs.readFileSync(
          path.join(sd, `round-${state.round}`, 'scores.json'), 'utf-8'));
      }

      const history = appendScoreHistory(sd, scoresData, state.targets);
      const decision = strategicDecision(scoresData.targets, history, state.config);

      if (decision === 'DONE' || decision === 'STOP') {
        state.phase = 'done';
        writeState(state);
        console.log(decision);
        break;
      }

      state.phase = 'build';
      state.round++;
      state.strategy = decision;
      writeState(state);
      const targetNames = Object.keys(state.targets).join(',');
      console.log(`BUILD round=${state.round} strategy=${decision} context=${state.context} targets=${targetNames}`);
      break;
    }

    case 'done': {
      console.log('DONE');
      break;
    }

    default:
      console.log(`FATAL: Unknown phase: ${state.phase}`);
  }
}

function cmdReport() {
  const runId = getFlag('run-id');
  if (!runId) { console.error('FATAL: --run-id is required'); process.exit(1); }

  const state = readState(runId);
  const sd = statePath(runId);
  const history = readScoreHistory(sd);
  const elapsed = Date.now() - new Date(state.startedAt).getTime();
  const minutes = Math.round(elapsed / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const lastEntry = history.length > 0 ? history[history.length - 1] : null;
  const result = state.phase === 'done'
    ? (lastEntry && lastEntry.allPassed ? 'DONE' : 'STOP')
    : 'IN PROGRESS';

  const targetNames = state.targets ? Object.keys(state.targets).join(', ') : 'none';

  const lines = [
    '═══════════════════════════════════════',
    ` HARNESS REPORT: ${runId}`,
    '═══════════════════════════════════════',
    ` Prompt: "${state.prompt}"`,
    ` Mode: ${state.context}${state.worktree ? ' (worktree)' : ''}`,
    ` Targets: ${targetNames}`,
    ` Rounds: ${history.length}`,
    ` Duration: ${duration}`,
    ` Result: ${result}`,
    '',
    ' Score progression:',
  ];

  for (const h of history) {
    if (!h.targets) {
      lines.push(`   R${h.round}: (invalid score data)`);
      continue;
    }
    const avg = avgScoreAllTargets(h.targets).toFixed(2);
    lines.push(`   R${h.round}: (avg ${avg})`);
    for (const [name, t] of Object.entries(h.targets)) {
      const parts = Object.entries(t.scores).map(([k, v]) => `${k}=${v}`).join(' ');
      lines.push(`     ${name}: ${parts}`);
    }
  }

  if (lastEntry && lastEntry.targets) {
    lines.push('');
    lines.push(' Last round summaries:');
    for (const [name, t] of Object.entries(lastEntry.targets)) {
      if (t.summary) lines.push(`   ${name}: ${t.summary}`);
    }
  }

  lines.push('');
  lines.push(` State: ${state.stateDir}/`);
  if (state.worktree) {
    lines.push(` Worktree: ${state.stateDir}/worktree/`);
  }
  lines.push('═══════════════════════════════════════');

  console.log(lines.join('\n'));
}

// ─── Main / Exports ────────────────────────────────────────
if (require.main === module) {
  switch (command) {
    case 'setup':
      cmdSetup();
      break;
    case 'next':
      cmdNext();
      break;
    case 'report':
      cmdReport();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: harness.js <setup|next|report> [options]');
      process.exit(1);
  }
} else {
  module.exports = {
    targetNeedsProcess,
    scoreCriteria,
    allCriteria,
    avgScore,
    avgScoreAllTargets,
    validateTargetScores,
    allScoresPassed,
    strategicDecision,
    parseTargetsFlag,
    parseTargetsFromSpec,
    sortedTargetNames,
    TARGET_DEFAULTS,
  };
}
