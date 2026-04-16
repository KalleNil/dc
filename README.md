# DC - Directory Changer

A terminal-based directory navigator inspired by classic 80s file managers. Built with [Ink](https://github.com/vadimdemedes/ink).

## Setup

```bash
npm install
npm run build
```

## Build Executable (Optional)

To create a standalone `.exe` that doesn't require Node.js:

```bash
npm run package
```

This creates `bin/dc.exe`. Copy it along with `actions.json` to a folder in your PATH.

## Shell Integration

Since a child process can't change the parent shell's directory, you need a shell wrapper function.

### PowerShell Setup

1. Open your PowerShell profile:
   ```powershell
   notepad $PROFILE
   ```
   (If the file doesn't exist, create it)

2. Add one of the following functions:

**Using Node.js (development):**
```powershell
# DC - Directory Changer
# Navigate directories with a visual tree interface
function dc {
    $resultFile = Join-Path $env:TEMP "dc-$PID.txt"
    node C:\src\dc\dist\index.js $PID
    if (Test-Path $resultFile) {
        Set-Location (Get-Content $resultFile -Raw).Trim()
        Remove-Item $resultFile -ErrorAction SilentlyContinue
    }
}
```

**Using the standalone exe:**

Copy `bin/dc.exe` and `actions.json` to a folder (e.g., `C:\Tools\dc\`).

```powershell
# DC - Directory Changer
# Navigate directories with a visual tree interface
$DC_PATH = "C:\Tools\dc\dc.exe"  # Update this to your dc.exe location

function dc {
    $resultFile = Join-Path $env:TEMP "dc-$PID.txt"
    & $DC_PATH $PID
    if (Test-Path $resultFile) {
        Set-Location (Get-Content $resultFile -Raw).Trim()
        Remove-Item $resultFile -ErrorAction SilentlyContinue
    }
}
```

3. Reload your profile:
   ```powershell
   . $PROFILE
   ```

4. Run `dc` to start navigating!

### Bash/Zsh Setup

Add to `.bashrc` or `.zshrc`:

```bash
# DC - Directory Changer
dc() {
    local result_file="/tmp/dc-$$.txt"
    node /path/to/dc/dist/index.js $$
    if [ -f "$result_file" ]; then
        cd "$(cat "$result_file")"
        rm -f "$result_file"
    fi
}
```

## Controls

| Key | Action |
|-----|--------|
| ↑/↓ | Navigate up/down |
| ← | Collapse node / select parent |
| → | Expand node / select first child |
| PgUp/PgDn | Scroll by page |
| Tab | Switch between tree and file list |
| Enter | Select directory (tree) / Open file or enter folder (file list) |
| a-z, 0-9 | Jump to next item starting with that character |
| Ctrl+F | Filter current panel (live search) |
| Ctrl+B | Bookmark current directory |
| Ctrl+J | Open / close bookmarks panel |
| Ctrl+P | Toggle info panel |
| Ctrl+C | Exit without changing directory |
| Esc | Clear filter (if active) / Exit without changing directory |

## Bookmarks

Bookmarks are stored in `~/.dc/bookmarks.json` and persist across sessions.

| Key | Action |
|-----|--------|
| ↑/↓ | Navigate bookmarks |
| Enter | Jump to bookmarked directory |
| d / Delete | Remove bookmark |
| Esc / Ctrl+J | Close bookmarks panel |

## Actions

Actions are quick commands you can run on the selected item. They're defined in `actions.json`:

```json
[
  {
    "key": "o",
    "label": "VS Code",
    "command": "code",
    "args": ["{path}"],
    "target": "both"
  }
]
```

- **key**: The key to press with Ctrl (e.g., `o` → `Ctrl+O`)
- **label**: Display name in the action bar
- **command**: The executable to run
- **args**: Arguments, with `{path}` replaced by the selected path
- **target**: When to show the action: `"directory"`, `"file"`, or `"both"`

Default actions:
| Shortcut | Action | Target |
|----------|--------|--------|
| Ctrl+O | Open in VS Code | Both |
| Ctrl+T | Open Windows Terminal | Directory |
| Ctrl+E | Open in Explorer | Directory |

The action bar updates dynamically based on what's selected.

## Configuration

The app looks for `actions.json` in these locations (first found wins):
1. Next to the executable (for packaged exe)
2. `~/.dc/actions.json` (user config)
3. Project directory (development)
