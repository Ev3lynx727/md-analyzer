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

### Manual install

Copy the hook script and configure your agent:

```bash
# Copy the hook
cp python/pre_read.py ~/.kiro/hooks/pre_read_md.py

# Or reference it directly from the repo
# (ensure repo path is stable)
```

#### kiro-cli config

```json
{
  "preToolUse": [
    {
      "matcher": {"tool_name": "read"},
      "command": "uv run python /path/to/pre_read_md.py"
    }
  ]
}
```

The hook script is at [`python/pre_read.py`](../python/README.md).

For opencode, see [Framework details → opencode](#opencode) below for the plugin-based setup.

> **Note:** `pre_read.py` requires PyYAML (`uv add pyyaml` or `pip install pyyaml`). Falls back gracefully if unavailable.

See [`python/pre_read.py`](../python/README.md) for full implementation details.

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
| openclaw | `before_tool_call` TS handler | `~/.openclaw/openclaw.json` → `hooks.internal.entries` | 🔲 Planned |
| kiro-cli | `preToolUse` | `~/.kiro/agents/agent_config.json` → `hooks.preToolUse` | ✅ Manual |
| hermes | `hooks: {}` (map) | `~/.hermes/config.yaml` | 🔲 Manual (untested) |
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

Hooks are TypeScript modules living in `~/.openclaw/hooks/<name>/` with a `handler.ts` exporting a default function `(tool: string, input: any) => any`. Register in `openclaw.json` under `hooks.internal.entries`:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "md-analyzer": {
          "enabled": true
        }
      }
    }
  }
}
```

Copy the shipped hook:

```bash
cp -r plugins/openclaw-md-analyzer ~/.openclaw/hooks/md-analyzer
```

The handler receives tool calls before execution (`before_tool_call`) and can modify the input or inject context inline. See [`plugins/openclaw-md-analyzer/handler.ts`](../plugins/openclaw-md-analyzer/handler.ts).

#### hermes

Hermes supports hooks via a `hooks: {}` map in `~/.hermes/config.yaml`. The hook format expects key-value entries. Currently has `hooks_auto_accept: false` (requires manual approval). No hooks are configured by default.

The `redact_pii: false` setting in `config.yaml` controls PII redaction independently — it is not a separate agent framework.

---

## See Also

- [`python/pre_read.py`](../python/README.md) — Hook implementation
- [`docs/API.md`](./API.md) — CLI and API reference
- [`README.md`](../README.md) — Project overview
