# debug-tool

A Claude Code plugin for debugging and session management.

## Skills

### export-session

Export the current Claude Code session as a shareable zip file.

**Included in the zip:**
- Main conversation (`.jsonl`)
- Subagent logs (`subagents/*.jsonl`)
- Tool result outputs (`tool-results/*.txt`)

**Trigger phrases:**
- `export session`
- `share this conversation`
- `zip this session`
- `save session logs`
- `export logs`

**Output:** A timestamped zip file on your Desktop (e.g., `claude-session-20260328-141500.zip`), with Finder/Explorer opened to the file location.

**Supported platforms:** macOS, Linux, Windows (Git Bash / PowerShell), WSL

## Installation

```bash
claude plugin add --source ./plugins/debug-tool
```

## Quick Start: User-Level Skill Only

If you just want the `export-session` skill without installing the full plugin, you can add it directly to your user-level skills:

**macOS / Linux:**

```bash
mkdir -p ~/.claude/skills/export-session && curl -fsSL "https://raw.githubusercontent.com/pyjun01/claude-plugins/refs/heads/master/plugins/debug-tool/skills/export-session/SKILL.md" -o ~/.claude/skills/export-session/SKILL.md
```

**Windows (PowerShell):**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\export-session" | Out-Null; Invoke-WebRequest -Uri "https://raw.githubusercontent.com/pyjun01/claude-plugins/refs/heads/master/plugins/debug-tool/skills/export-session/SKILL.md" -OutFile "$env:USERPROFILE\.claude\skills\export-session\SKILL.md"
```

## Author

- **Name:** pyjun01
- **Email:** pyjun02@gmail.com
