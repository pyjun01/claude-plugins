---
description: Export the current Claude Code session as a shareable zip file, including the full conversation, subagent logs, skill invocations, and tool results. Trigger this skill when the user says any of: 'export session', 'share this conversation', 'zip this session', 'save session logs', 'share conversation with teammate', 'export chat', 'package this session', 'export logs', or wants to share/archive the current Claude Code session for debugging or collaboration.
---

# Export Session

Export the current Claude Code session (conversation + subagent logs + tool results) as a shareable zip file and open its location in Finder or Explorer.

## How it works

Claude Code stores each session as:
```
~/.claude/projects/<encoded-cwd>/
├── <session-id>.jsonl              # main conversation
└── <session-id>/                   # session data (may not exist)
    ├── subagents/*.jsonl           # subagent conversation logs
    └── tool-results/*.txt          # large tool outputs
```

The `<encoded-cwd>` is the absolute working directory path with all path separators replaced by `-` and drive colons removed.
- macOS/Linux: `/Users/foo/my-project` becomes `-Users-foo-my-project`
- Windows: `C:\Users\foo\my-project` becomes `C-Users-foo-my-project`

## Steps

### 1. Detect the platform

Determine the OS to use the correct commands throughout:

```bash
case "$(uname -s)" in
  Darwin*)            PLATFORM="macos" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="windows-bash" ;;
  Linux*)
    if grep -qEi "(Microsoft|WSL)" /proc/version 2>/dev/null; then
      PLATFORM="wsl"
    else
      PLATFORM="linux"
    fi
    ;;
esac
```

If running in PowerShell natively (not Git Bash/WSL), use the PowerShell commands in each step instead.

### 2. Find the current session

**macOS / Linux:**
```bash
ENCODED_CWD=$(pwd | sed 's|/|-|g')
PROJECT_DIR="$HOME/.claude/projects/${ENCODED_CWD}"

SESSION_FILE=$(ls -t "${PROJECT_DIR}"/*.jsonl 2>/dev/null | head -1)
if [ -z "$SESSION_FILE" ]; then
  echo "Could not find session data. Make sure you're running this from a project directory."
  exit 1
fi
SESSION_ID=$(basename "$SESSION_FILE" .jsonl)
SESSION_DATA_DIR="${PROJECT_DIR}/${SESSION_ID}"
```

**Windows (Git Bash / MSYS / Cygwin):**
```bash
# pwd -W returns the native Windows path (e.g., C:\Users\foo\my-project)
NATIVE_CWD=$(pwd -W 2>/dev/null || pwd)
ENCODED_CWD=$(echo "$NATIVE_CWD" | sed 's|[\\\/]|-|g; s|:||g')
PROJECT_DIR="$HOME/.claude/projects/${ENCODED_CWD}"

SESSION_FILE=$(ls -t "${PROJECT_DIR}"/*.jsonl 2>/dev/null | head -1)
if [ -z "$SESSION_FILE" ]; then
  echo "Could not find session data. Make sure you're running this from a project directory."
  exit 1
fi
SESSION_ID=$(basename "$SESSION_FILE" .jsonl)
SESSION_DATA_DIR="${PROJECT_DIR}/${SESSION_ID}"
```

**WSL:**
```bash
# Get the Windows-side path for encoding, since Claude Code runs on Windows
WIN_CWD=$(wslpath -w "$(pwd)" 2>/dev/null)
if [ -n "$WIN_CWD" ]; then
  ENCODED_CWD=$(echo "$WIN_CWD" | sed 's|[\\\/]|-|g; s|:||g')
else
  ENCODED_CWD=$(pwd | sed 's|/|-|g')
fi
WIN_USERPROFILE=$(wslpath "$(cmd.exe /C 'echo %USERPROFILE%' 2>/dev/null | tr -d '\r')" 2>/dev/null)
PROJECT_DIR="${WIN_USERPROFILE:-$HOME}/.claude/projects/${ENCODED_CWD}"

SESSION_FILE=$(ls -t "${PROJECT_DIR}"/*.jsonl 2>/dev/null | head -1)
if [ -z "$SESSION_FILE" ]; then
  echo "Could not find session data. Make sure you're running this from a project directory."
  exit 1
fi
SESSION_ID=$(basename "$SESSION_FILE" .jsonl)
SESSION_DATA_DIR="${PROJECT_DIR}/${SESSION_ID}"
```

**PowerShell (Windows native):**
```powershell
$EncodedCwd = (Get-Location).Path -replace '[\\\/]', '-' -replace ':', ''
$ProjectDir = "$env:USERPROFILE\.claude\projects\$EncodedCwd"

$SessionFile = Get-ChildItem -LiteralPath $ProjectDir -Filter "*.jsonl" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $SessionFile) {
    Write-Error "Could not find session data. Make sure you're running this from a project directory."
    return
}

$SessionId = $SessionFile.BaseName
$SessionDataDir = Join-Path $ProjectDir $SessionId
```

### 3. Create the zip

**macOS / Linux:**
```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_NAME="claude-session-${TIMESTAMP}.zip"
ZIP_PATH="$HOME/Desktop/${ZIP_NAME}"

cd "$PROJECT_DIR"
zip -r "$ZIP_PATH" "$(basename "$SESSION_FILE")"
if [ -d "$SESSION_DATA_DIR" ]; then
  zip -r "$ZIP_PATH" "${SESSION_ID}/"
fi
```

**Windows (Git Bash / MSYS / Cygwin):**
```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_NAME="claude-session-${TIMESTAMP}.zip"

# Query the real Desktop path (handles OneDrive redirection)
DESKTOP_PATH=$(powershell.exe -NoProfile -Command "[Environment]::GetFolderPath('Desktop')" 2>/dev/null | tr -d '\r')
if [ -z "$DESKTOP_PATH" ]; then
  DESKTOP_PATH="$HOME/Desktop"
fi
# Convert Windows path to POSIX for Git Bash
DESKTOP_POSIX=$(cd "$DESKTOP_PATH" 2>/dev/null && pwd || echo "$HOME/Desktop")
ZIP_PATH="${DESKTOP_POSIX}/${ZIP_NAME}"

cd "$PROJECT_DIR"
# Use PowerShell's Compress-Archive since zip is not available in Git Bash
WIN_PROJECT_DIR=$(pwd -W 2>/dev/null || pwd)
ITEMS="'$(basename "$SESSION_FILE")'"
if [ -d "$SESSION_DATA_DIR" ]; then
  ITEMS="${ITEMS},'${SESSION_ID}'"
fi
powershell.exe -NoProfile -Command "
  Push-Location '$WIN_PROJECT_DIR'
  Compress-Archive -Path ${ITEMS} -DestinationPath '${DESKTOP_PATH}\\${ZIP_NAME}' -Force
  Pop-Location
"
```

**WSL:**
```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_NAME="claude-session-${TIMESTAMP}.zip"
ZIP_PATH="$HOME/Desktop/${ZIP_NAME}"

cd "$PROJECT_DIR"
zip -r "$ZIP_PATH" "$(basename "$SESSION_FILE")"
if [ -d "$SESSION_DATA_DIR" ]; then
  zip -r "$ZIP_PATH" "${SESSION_ID}/"
fi
```

**PowerShell (Windows native):**
```powershell
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ZipName = "claude-session-$Timestamp.zip"
$DesktopPath = [Environment]::GetFolderPath("Desktop")

if (-not (Test-Path $DesktopPath)) {
    # Fallback if Desktop folder does not exist (e.g., OneDrive not synced)
    $DesktopPath = Join-Path $env:USERPROFILE "Desktop"
    if (-not (Test-Path $DesktopPath)) {
        New-Item -ItemType Directory -Path $DesktopPath -Force | Out-Null
    }
}

$ZipPath = Join-Path $DesktopPath $ZipName

# Use Push-Location so zip contains relative paths matching the bash version
Push-Location -LiteralPath $ProjectDir
try {
    $ItemsToZip = @($SessionFile.Name)
    if (Test-Path -LiteralPath $SessionDataDir) {
        $ItemsToZip += $SessionId
    }
    Compress-Archive -Path $ItemsToZip -DestinationPath $ZipPath -Force
} finally {
    Pop-Location
}
```

### 4. Open the file location

**macOS:**
```bash
open -R "$ZIP_PATH"
```

**Linux:**
```bash
xdg-open "$(dirname "$ZIP_PATH")"
```

**Windows (Git Bash / MSYS / Cygwin):**
```bash
explorer.exe /select,"$(powershell.exe -NoProfile -Command "[System.IO.Path]::GetFullPath('$ZIP_PATH')" 2>/dev/null | tr -d '\r')"
```

**WSL:**
```bash
WIN_ZIP_PATH=$(wslpath -w "$ZIP_PATH" 2>/dev/null)
explorer.exe /select,"${WIN_ZIP_PATH}"
```

**PowerShell (Windows native):**
```powershell
Start-Process explorer.exe -ArgumentList "/select,`"$ZipPath`""
```

### 5. Report to the user

Print the zip path and its size. Example:

```
Exported to: ~/Desktop/claude-session-20260327-162235.zip (3.2MB)
Contains: main conversation + 6 subagent logs + 4 tool results
```

Count the contents by checking how many `.jsonl` files are in `subagents/` and how many files are in `tool-results/`.
