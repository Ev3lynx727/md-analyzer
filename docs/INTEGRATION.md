# Integration Guide — md-analyzer for AI Agents

Integrate md-analyzer into any AI agent framework (opencode, kiro-cli, Cline, etc.) for token-aware document preview, structured outlines, and MCP-based document analysis.

---

## Table of Contents

1. [Pre-Read Hook](#1-pre-read-hook)
2. [CLI Installation Command](#2-cli-installation-command)
3. [MCP Server (Placeholder)](#3-mcp-server-placeholder)
4. [Framework Reference](#4-framework-reference)

---

## 1. Pre-Read Hook

Before an agent reads a `.md` or `.txt` file, the hook injects a structured overview so the LLM can preview structure without consuming context on the full content.

### How it works

```
agent reads file
  -> tool.execute.before fires
  -> md-analyzer --keypoints runs, caches outline
  -> tool executes (file read proceeds)
  -> tool.execute.after fires
  -> cached outline prepended to file content
  -> LLM sees outline + full content
```

### Output example

```
── md-analyzer: ./docs/api.md ──
  2910 tokens  ·  1388 words  ·  7 min
  28 headings  ·  3 links  ·  15 bold  ·  3 italic
  # API Reference  L<1:5> ~420t
  ## Getting Started  L<6:15> ~890t
  ## Configuration  L<16:22> ~610t
── file content ──────────────────
```

For opencode, see [Framework details → opencode](#opencode) below for the plugin-based setup.

---

## 2. CLI Installation Command

A dedicated install command wires the hook into your agent framework automatically.

### `md-analyzer install --hook`

```bash
# Detect agent framework and install pre-read hook
md-analyzer install --hook

# Target specific framework
md-analyzer install --hook --framework opencode
md-analyzer install --hook --framework kiro-cli
md-analyzer install --hook --framework cline
```

**What it does:**

1. Detects the active agent framework (or use `--framework`)
2. Locates the agent's config file (`opencode.json`, `.kiro/config.json`, etc.)
3. Copies `pre_read.py` to the agent's hooks directory
4. Adds a `preToolUse` entry to the agent config
5. Installs PyYAML dependency if needed

**Status:** Not yet implemented. Planned for `md-analyzer` core.

---

## 3. MCP Server (Placeholder)

### `md-analyzer install --mcp`

```bash
# Register an MCP server for document analysis
md-analyzer install --mcp

# With custom name and config
md-analyzer install --mcp --name md-analyzer --transport stdio
```

Registers md-analyzer as an MCP tool server so agents can call it on demand rather than via pre-read hooks.

**Tool surface (planned):**

| Tool | Description |
|------|-------------|
| `analyze` | Full analysis of a markdown file |
| `keypoints` | Single-shot overview (same as `--keypoints`) |
| `search` | Search documents by keyword |
| `graph` | Document relationship graph |
| `backlinks` | Find documents linking to a target |

**Status:** Placeholder. Implementation depends on MCP protocol maturity and agent framework support.

---

## 4. Framework Reference

| Framework | Hook mechanism | Config file | Status |
|-----------|---------------|-------------|--------|
| opencode | Plugin (`tool.execute.before` + `tool.execute.after`) | `~/.config/opencode/plugins/<name>.ts` | ✅ Plugin (working) |
| openclaw | — | — | 🔲 No active plugin (opencode plugin covers same use case) |
| kiro-cli | `preToolUse` | `~/.kiro/agents/agent_config.json` → `hooks.preToolUse` | ✅ Manual |
| hermes | Python plugin (`plugin.yaml` + `__init__.py`) | `~/.hermes/plugins/<name>/plugin.yaml` | 🔲 Template available |
| Cline | `preToolUse` | `cline.json` | 🔲 Manual (untested) |
| Claude Code | Hooks | `~/.claude/settings.json` | 🔲 Planned |
| Continue | `preToolUse` | `config.json` | 🔲 Planned |

### Framework details

#### opencode

Plugins live in `~/.config/opencode/plugins/` and use `@opencode-ai/plugin` for lifecycle hooks. The md-analyzer plugin uses two hooks:

| Hook | Role |
|------|------|
| `tool.execute.before` | Runs `md-analyzer --keypoints` on whitelisted `.md`/`.txt` files before read, caches the parsed outline |
| `tool.execute.after` | Injects outline into read output — **keypoints-only** for named files, **keypoints + full content** for everything else |

The plugin loads its configuration from `config.json` (same directory as `plugin.ts`):

```json
{
  "whitelist_names": ["AGENTS.md", "CLAUDE.md", "SKILL.md", "README.md", ...],
  "whitelist_paths": ["docs/", "steering/", ".cursor/", ...],
  "exclude_paths": ["headquarters/"]
}
```

| Config key | Match rule | Behavior |
|------------|-----------|----------|
| `whitelist_names` | Exact filename match | **Keypoints-only** — replaces content with just the outline (saves tokens) |
| `whitelist_paths` | Path contains prefix | **Full read** — keypoints prepended to full content |
| `exclude_paths` | Path contains prefix | **Skipped** — no md-analyzer processing, normal read |

Any other `.md`/`.txt` file also gets full read + keypoints (fallback). If `config.json` is missing or invalid, built-in defaults are used.

Copy the shipped plugin file into your opencode plugins directory:

```bash
cp plugins/opencode-md-analyzer/plugin.ts ~/.config/opencode/plugins/
```

Opencode loads it automatically from `~/.config/opencode/plugins/`. See [`plugins/opencode-md-analyzer/plugin.ts`](../plugins/opencode-md-analyzer/plugin.ts) for the full implementation.

#### kiro-cli

Hooks are configured in `~/.kiro/agents/agent_config.json` under `hooks.preToolUse`:

```json
{
  "hooks": {
    "preToolUse": [
      {
        "matcher": "read",
        "command": "uv run --project ~/.kiro/hooks python ~/.kiro/hooks/pre_read_md.py",
        "timeout_ms": 3000
      },
      {
        "matcher": "*",
        "command": "uv run --project ~/.kiro/hooks python ~/.kiro/hooks/pre_tool_reason.py",
        "timeout_ms": 5000
      }
    ]
  }
}
```

The `matcher` field can be a tool name (`"read"`) or wildcard (`"*"`). The `command` runs on every matched tool call before execution.

#### openclaw

The opencode plugin covers the same pre-read keypoints use case. No separate openclaw hook is maintained.

#### hermes

Hermes uses a Python plugin system. Plugins live in `~/.hermes/plugins/<name>/` with a `plugin.yaml` manifest and an `__init__.py` implementation.

**`plugin.yaml`:**
```yaml
name: md-analyzer
version: 0.1.0
description: "Token-aware Markdown pre-read hook"
pip_dependencies:
  - pyyaml>=6.0
hooks:
  - before_tool_call
```

**`__init__.py`** intercepts `read` tool calls, runs `md-analyzer --keypoints --json` via subprocess, and injects the outline into the file content:

```python
import subprocess, json, os
from pathlib import Path

def before_tool_call(tool: str, input_data: dict) -> dict:
    if tool != "read":
        return input_data
    file_path = input_data.get("path", "")
    if not file_path.endswith((".md", ".txt")):
        return input_data
    try:
        result = subprocess.run(
            ["md-analyzer", file_path, "--keypoints", "--json"],
            capture_output=True, text=True, timeout=5,
        )
        docs = json.loads(result.stdout)
        if docs:
            outline = format_outline(docs[0])
            input_data["content"] = outline + "\n\n── file content ──\n\n" + input_data.get("content", "")
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
        pass
    return input_data
```

Enable the plugin in `~/.hermes/config.yaml`:
```yaml
plugins:
  enabled:
    - md-analyzer
```

A working template is at `~/.hermes/plugins/md-analyzer/` with full `plugin.yaml` + `__init__.py` and env-var configuration for binary path, token limits, whitelist, and exclude paths.

---

## See Also

- [`plugins/opencode-md-analyzer/plugin.ts`](../plugins/opencode-md-analyzer/plugin.ts) — Opencode plugin implementation
- [`docs/API.md`](./API.md) — CLI and API reference
- [`README.md`](../README.md) — Project overview
