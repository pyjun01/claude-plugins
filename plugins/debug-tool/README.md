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

## Author

- **Name:** pyjun01
- **Email:** pyjun02@gmail.com
