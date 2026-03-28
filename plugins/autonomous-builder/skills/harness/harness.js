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
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
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

// ─── Server management ──────────────────────────────────────
function detectServerConfig(appDir, port) {
  const resolved = path.resolve(appDir);

  // If appDir doesn't exist, return a command that will fail gracefully
  if (!fs.existsSync(resolved)) {
    return { command: 'node', args: ['-e', `process.exit(1)`] };
  }

  // Check package.json for dev/start scripts
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

  // Python project
  const pyprojectPath = path.join(resolved, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    return { command: 'python3', args: ['-m', 'uvicorn', 'main:app', '--port', String(port)] };
  }

  // Static HTML files at root
  try {
    const htmlFiles = fs.readdirSync(resolved).filter(f => f.endsWith('.html'));
    if (htmlFiles.length > 0) {
      return { command: 'python3', args: ['-m', 'http.server', String(port)] };
    }
  } catch {}

  // Fallback: npx serve
  return { command: 'npx', args: ['serve', '-l', String(port)] };
}

function waitForPort(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      execFileSync('node', ['-e', `
        const http = require('http');
        const req = http.get({host:'127.0.0.1',port:${port},timeout:1000}, (res) => {
          process.exit(0);
        });
        req.on('error', () => process.exit(1));
        req.on('timeout', () => { req.destroy(); process.exit(1); });
      `], { timeout: 3000, stdio: 'pipe' });
      return true;
    } catch {
      // Cross-platform sleep using Node.js Atomics
      const buf = new SharedArrayBuffer(4);
      Atomics.wait(new Int32Array(buf), 0, 0, 1000);
    }
  }
  return false;
}

function tryStartServer(state) {
  const sd = statePath(state.runId);

  // Prefer agent-written server command if available
  const cmdFilePath = path.join(sd, 'server-command.txt');
  let serverConfig;
  if (fs.existsSync(cmdFilePath)) {
    const raw = fs.readFileSync(cmdFilePath, 'utf-8').trim();
    const parts = raw.split(/\s+/);
    serverConfig = { command: parts[0], args: parts.slice(1) };
  } else {
    // Fallback to auto-detection
    serverConfig = detectServerConfig(state.appDir, state.serverPort);
  }

  try {
    const server = spawn(serverConfig.command, serverConfig.args, {
      cwd: path.resolve(state.appDir),
      stdio: ['ignore',
        fs.openSync(path.join(sd, 'server-stdout.log'), 'w'),
        fs.openSync(path.join(sd, 'server-stderr.log'), 'w')],
      detached: true,
    });
    server.unref();

    // Write PID immediately
    state.serverPid = server.pid;
    writeState(state);

    const ready = waitForPort(state.serverPort, state.config.serverReadyTimeout);
    if (!ready) {
      try { process.kill(-server.pid); } catch {}
      const stderrLog = path.join(sd, 'server-stderr.log');
      const stderr = fs.existsSync(stderrLog)
        ? fs.readFileSync(stderrLog, 'utf-8').slice(0, 500)
        : 'no stderr';
      return { ok: false, error: `Server (${serverConfig.command} ${serverConfig.args.join(' ')}) did not respond on port ${state.serverPort} within ${state.config.serverReadyTimeout}ms. stderr: ${stderr}` };
    }

    return { ok: true, pid: server.pid };
  } catch (e) {
    return { ok: false, error: `Failed to start server (${serverConfig.command}): ${e.message}` };
  }
}

function stopServer(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'pipe' });
    } else {
      process.kill(-pid, 'SIGTERM');
    }
  } catch {}
}

// ─── Score helpers ──────────────────────────────────────────
function avgScore(scores) {
  const vals = Object.values(scores);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function readScoreHistory(stateDir) {
  const p = path.join(stateDir, 'score-history.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function appendScoreHistory(stateDir, entry) {
  const history = readScoreHistory(stateDir);
  history.push(entry);
  fs.writeFileSync(path.join(stateDir, 'score-history.json'), JSON.stringify(history, null, 2));
  return history;
}

function writeFeedback(state, message) {
  const roundDir = path.join(statePath(state.runId), `round-${state.round}`);
  fs.mkdirSync(roundDir, { recursive: true });
  const feedbackPath = path.join(roundDir, 'feedback.md');
  const existing = fs.existsSync(feedbackPath)
    ? fs.readFileSync(feedbackPath, 'utf-8') + '\n\n---\n\n'
    : '';
  fs.writeFileSync(feedbackPath, existing + `## Harness Error\n\n${message}\n`);
}

function writeDefaultScores(state) {
  const roundDir = path.join(statePath(state.runId), `round-${state.round}`);
  fs.mkdirSync(roundDir, { recursive: true });
  const scores = {
    round: state.round,
    timestamp: new Date().toISOString(),
    scores: { product_depth: 0, functionality: 0, visual_design: 0, code_quality: 0 },
    allPassed: false,
    summary: 'Default scores — evaluator did not produce results',
  };
  fs.writeFileSync(path.join(roundDir, 'scores.json'), JSON.stringify(scores, null, 2));
}

function strategicDecision(currentScores, history, config) {
  const allPassed = Object.values(currentScores).every(s => s >= config.scoreThreshold);
  if (allPassed) return 'DONE';
  if (history.length >= config.maxRounds) return 'STOP';
  if (history.length >= 2) {
    const prev = avgScore(history[history.length - 2].scores);
    const curr = avgScore(currentScores);
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
    // Initialize git if needed
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

  // Parse --ui override (comma-separated, e.g. --ui web,terminal)
  const uiFlag = getFlag('ui');
  const ui = uiFlag ? uiFlag.split(',').map(s => s.trim()) : null;

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
    ui,
    startedAt: new Date().toISOString(),
    appDir: path.relative(process.cwd(), appDir) || '.',
    stateDir: path.relative(process.cwd(), stateDir),
    serverPort: config.serverPort,
    serverPid: null,
    config: {
      maxRounds,
      scoreThreshold: threshold,
      serverStartCommand: config.serverStartCommand,
      serverReadyTimeout: config.serverReadyTimeout,
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
      // Parse ui from spec.md if not already set via --ui flag
      if (!state.ui) {
        const spec = fs.readFileSync(path.join(sd, 'spec.md'), 'utf-8');
        const uiMatch = spec.match(/^ui:\s*\[([^\]]+)\]/m);
        if (uiMatch) {
          state.ui = uiMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
        } else {
          state.ui = [];
        }
      }
      state.phase = 'build';
      state.round = 1;
      state.strategy = 'initial';
      writeState(state);
      const uiStr = (state.ui && state.ui.length > 0) ? state.ui.join(',') : 'none';
      console.log(`BUILD round=1 strategy=initial context=${state.context} ui=${uiStr}`);
      break;
    }

    case 'build': {
      const roundDir = path.join(sd, `round-${state.round}`);
      fs.mkdirSync(roundDir, { recursive: true });

      const serverResult = tryStartServer(state);
      if (!serverResult.ok) {
        writeFeedback(state, `Server failed to start: ${serverResult.error}`);
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
        const uiStrRetry = (state.ui && state.ui.length > 0) ? state.ui.join(',') : 'none';
        console.log(`BUILD round=${state.round} strategy=REFINE context=${state.context} ui=${uiStrRetry}`);
        break;
      }

      state.phase = 'evaluate';
      state.serverPid = serverResult.pid;
      writeState(state);
      console.log(`EVALUATE round=${state.round} port=${state.serverPort}`);
      break;
    }

    case 'evaluate': {
      stopServer(state.serverPid);
      state.serverPid = null;

      const scoresPath = path.join(sd, `round-${state.round}`, 'scores.json');
      if (!fs.existsSync(scoresPath)) {
        writeFeedback(state, 'Evaluator failed to produce scores. App may be too broken to test.');
        writeDefaultScores(state);
      }

      const scoresData = JSON.parse(fs.readFileSync(
        path.join(sd, `round-${state.round}`, 'scores.json'), 'utf-8'));
      const history = appendScoreHistory(sd, scoresData);
      const decision = strategicDecision(scoresData.scores, history, state.config);

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
      const uiStr2 = (state.ui && state.ui.length > 0) ? state.ui.join(',') : 'none';
      console.log(`BUILD round=${state.round} strategy=${decision} context=${state.context} ui=${uiStr2}`);
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

  const lines = [
    '═══════════════════════════════════════',
    ` HARNESS REPORT: ${runId}`,
    '═══════════════════════════════════════',
    ` Prompt: "${state.prompt}"`,
    ` Mode: ${state.context}${state.worktree ? ' (worktree)' : ''}`,
    ` Rounds: ${history.length}`,
    ` Duration: ${duration}`,
    ` Result: ${result}`,
    '',
    ' Score progression:',
  ];

  for (const h of history) {
    const s = h.scores;
    const avg = avgScore(s).toFixed(2);
    lines.push(`   R${h.round}: depth=${s.product_depth} func=${s.functionality} design=${s.visual_design} code=${s.code_quality} (avg ${avg})`);
  }

  if (lastEntry && lastEntry.summary) {
    lines.push('');
    lines.push(` Summary: ${lastEntry.summary}`);
  }

  lines.push('');
  lines.push(` State: ${state.stateDir}/`);
  if (state.worktree) {
    lines.push(` Worktree: ${state.stateDir}/worktree/`);
  }
  lines.push('═══════════════════════════════════════');

  console.log(lines.join('\n'));
}

// ─── Main ───────────────────────────────────────────────────
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
