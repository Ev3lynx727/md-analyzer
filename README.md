# md-analyzer

> Markdown document analyzer for AI agents - extract metadata, headings, links, tables, tokens, and key points from `.md` files.

**md-analyzer** is a lightweight, agent-ready document analysis tool designed for AI workflows. It provides single-shot document overviews, token budget tracking, and document relationship graphs — perfect for OpenCode, kiro-cli, or any AI agent framework.

---

## Quick Overview

| Feature | Description |
|---------|-------------|
| **Keypoints** | Single-shot document overview (ideal for agents) |
| **Token Tracking** | Session-based token budget with `/tmp/md-analyzer-session.json` |
| **Graph** | Document relationship topology (backlinks, orphans) |
| **Search** | Keyword search with relevance ranking |
| **Logs** | Structured JSON logs in `log/{sessionId}.json` |

### Why md-analyzer?

- **Agent-native** — Designed for AI agent workflows with single-shot outputs
- **Token-safe** — Built-in limits prevent context blowout (default: 20 results)
- **Extensible** — Simple TypeScript source, easy to extend for plugins
- **Zero config** — Runtime TOML parser, no config file required

---

## Prerequisites

### System Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | ≥ 18.0.0 | LTS recommended |
| **npm** | ≥ 8.0.0 | Comes with Node.js |

### Verify Installation

```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 8.0.0
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `micromark` | ^4.0.0 | Token-stream Markdown parsing |
| `micromark-extension-gfm` | ^3.0.0 | GFM tables via micromark |
| `js-tiktoken` | ^1.0.0 | GPT token counting |
| `js-yaml` | ^4.1.0 | Frontmatter YAML parsing |

---

## Installation

### From npm (recommended)

```bash
npm install -g @ev3lynx/md-analyzer
md-analyzer --help
```

### From source

```bash
git clone https://github.com/Ev3lynx727/md-analyzer.git
cd md-analyzer
npm install
npm run build
```

### Quick test

```bash
node dist/cli/index.js . --keypoints --json
```

---

## Usage

### Basic CLI

Accepts a `.md` file or a directory of `.md` files.

```bash
# With npx (no install required)
npx @ev3lynx/md-analyzer <file|directory> [options]

# After global install
npm install -g @ev3lynx/md-analyzer
md-analyzer <file|directory> [options]

# From source (development)
node dist/cli/index.js <file|directory> [options]
```

### Options

| Flag | Description | Example |
|------|-------------|---------|
| `--json` | Output as JSON | `--json` |
| `--search <kw>` | Search keyword in content | `--search "task"` |
| `--filter <k=v>` | Filter by metadata field | `--filter "category=guides"` |
| `--rank` | Rank results by relevance | `--search "task" --rank` |
| `--graph` | Document relationship graph | `--graph` |
| `--deps` | Dependency graph (DAG order) | `--deps` |
| `--orphans` | Find unreferenced docs | `--orphans` |
| `--backlinks <doc>` | Find docs linking to `<doc>` | `--backlinks "adr-2026-01"` |
| `--keypoints` | Quick overview (single-shot) | `--keypoints` |
| `--lint-fragments` | Frontmatter health check | `--lint-fragments` |
| `--session` | Token budget report | `--session` |
| `--budget <n>` | Set token budget limit | `--budget 50000` |
| `--max-results <n>` | Limit output | `--max-results 10` |

### Examples

```bash
# Quick overview — single file
md-analyzer path/to/doc.md --keypoints --json

# Quick overview — entire directory
md-analyzer /path/to/docs --keypoints --json

# Search with ranking
md-analyzer . --search "task lifecycle" --rank --json

# Find backlinks
md-analyzer . --backlinks adr-2026-04-01 --json

# Token budget tracking
md-analyzer . --session --budget 100000 --json

# Find orphans
md-analyzer . --orphans --json

# Lint frontmatter
md-analyzer . --lint-fragments --json
```

### --keypoints JSON output

```json
[
  {
    "fileName": "adr-2026-04",
    "title": "ADR-2026-04: Configuration Management",
    "summary": {
      "totalHeadings": 5,
      "totalLinks": 3,
      "totalWikilinks": 1,
      "totalTokens": 1200,
      "wordCount": 850
    },
    "keyHeadings": [
      { "level": 1, "text": "ADR-2026-04: Configuration Management", "line": 1, "tokens": 320 },
      { "level": 2, "text": "Status", "line": 4, "tokens": 85 },
      { "level": 2, "text": "Context", "line": 8, "tokens": 410 },
      { "level": 2, "text": "Decision", "line": 22, "tokens": 290 },
      { "level": 2, "text": "Consequences", "line": 35, "tokens": 95 }
    ],
    "importantLinks": [
      { "text": "Memory FAQ", "url": "https://help.openai.com/..." }
    ],
    "internalReferences": ["adr-2026-01", "adr-2026-02"],
    "readingTime": "4 min"
  }
]
```

### Agent hook integration (pre-read)

The `--keypoints` output powers a pre-read hook for AI agent frameworks (opencode, kiro-cli). Before reading a file, the hook injects a structured overview so the LLM can decide what to read.

See [`docs/INTEGRATION.md`](./docs/INTEGRATION.md) for setup guides, `md-analyzer install --hook`, and MCP integration.

---

## Calling from code

md-analyzer is a CLI tool — integrate via subprocess:

```javascript
// Node.js
const { execSync } = require('child_process');
const result = execSync('md-analyzer ./docs --keypoints --json', { encoding: 'utf-8' });
const docs = JSON.parse(result);
```

```python
# Python
import subprocess, json
result = subprocess.run(["md-analyzer", "./docs", "--keypoints", "--json"],
    capture_output=True, text=True)
docs = json.loads(result.stdout)
```

For agent hooks, see the [pre-read integration](#agent-hook-integration-pre-read) section above.

---

## Configuration

### hooks.toml

```toml
[tool.md-analyzer.config]
# Path configuration
default_directory = "/path/to/docs"

# Token budget configuration
default_budget = 100000
max_tokens = 200000

# Output safety (prevent token blowout)
max_results_default = 0
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MD_ANALYZER_PATH` | Path to compiled CLI entry | `dist/cli/index.js` |
| `MD_ANALYZER_DEFAULT_DIR` | Default directory | `.` |
| `MD_ANALYZER_MAX_TOKENS` | Max token limit | `200000` |
| `MD_ANALYZER_DEFAULT_BUDGET` | Default budget | `100000` |
| `MD_ANALYZER_MAX_RESULTS` | Max results | `20` |

### Priority Chain

```
CLI --max-results 3
  ↓
MD_ANALYZER_MAX_RESULTS=5
  ↓
max_results_default=0 (hooks.toml, default: no limit)
  ↓
0 (no limit — raw results)
```

---

## Session & Logging

### Session File

Location: `/tmp/md-analyzer-session.json`

```json
{
  "sessionId": "session-1234567890",
  "calls": 5,
  "totalTokens": 1500,
  "filesProcessed": 25,
  "startTime": "2026-05-03T12:00:00.000Z"
}
```

### Run Logs

Location: `{project}/log/{sessionId}.json`

```json
[
  {
    "timestamp": "2026-05-03T12:00:00.000Z",
    "sessionId": "session-1234567890",
    "directory": "/path/to/docs",
    "flags": ["--keypoints", "--json"],
    "filesFound": 10,
    "filesProcessed": 10,
    "tokensThisCall": 300,
    "totalSessionTokens": 1500,
    "errors": [],
    "durationMs": 450,
    "mode": "keypoints"
  }
]
```

---

## Architecture

```
md-analyzer/
├── src/
│   ├── cli/index.ts         # CLI entry (file or directory)
│   ├── core/
│   │   ├── analyzer.ts       # Orchestrator — sync+async paths
│   │   ├── micromark-walk.ts # Token-stream walkers (primary)
│   │   ├── hybrid-merge.ts   # Code-block region filtering
│   │   ├── extractors.ts     # Regex fallbacks (frontmatter, wikilinks)
│   │   ├── counters.ts       # Token/word/char counting
│   │   ├── graph.ts          # Document relationship graph
│   │   ├── search.ts         # Keyword search + relevance
│   │   ├── health.ts         # Fragment health checks
│   │   └── session.ts        # Token budget tracking
│   ├── types/index.ts        # Shared TypeScript types
│   ├── utils/constants.ts    # SKIP_DIRS, etc.
│   └── utils/config.ts       # TOML config parser
├── dist/                     # Compiled output
├── hooks.toml                # Configuration
├── log/                      # Run logs
├── python/                   # Agent hook integration
│   ├── pre_read.py
│   └── README.md
└── embedded-docs/            # Sample documents for testing
```

### Key Functions

| Function | Micromark (primary) | Regex (fallback) |
|----------|-------------------|-------------------|
| `extractFrontmatter()` | — | ✅ stays on regex |
| `walkHeadings()` | ✅ ATX + setext in one pass | `extractHeadings()` *(deprecated)* |
| `walkLinks()` | ✅ inline, autolink, reference, image | `extractLinks()` *(deprecated)* |
| `walkTables()` | ✅ via GFM spec | `extractTables()` *(deprecated)* |
| `walkCodeBlocks()` | ✅ codeFenced + codeIndented regions | — |
| `extractWikilinks()` | — | ✅ stays on regex |
| `analyzeFileWithMicromark()` | ✅ Hybrid orchestrator | `analyzeFile()` sync fallback |
| `scanMarkdownFiles()` | — | ✅ Recursive directory scanner |
| `buildGraph()` | — | ✅ Document relationship topology |
| `extractKeyPoints()` | — | ✅ Single-shot overview |
| `loadSession()` / `saveSession()` | — | ✅ Token budget tracking |

---

## Error Handling

| Error | Description | Recovery |
|-------|-------------|----------|
| `permission_denied` | Cannot read directory | Skip, continue scan |
| `file_read_error` | Cannot read file | Empty result with error |
| `path_not_found` | CLI argument file/dir doesn't exist | Empty results `[]` |
| `micromark_unavailable` | ESM import failure | Automatic regex fallback |
| `micromark_pipeline_failed` | Micromark parse crash | Automatic regex fallback |
| `walkLinks_failed` | Link token walker error | Empty link list (regex fallback for that field) |
| `walkHeadings_failed` | Heading token walker error | Empty heading list (regex fallback) |
| `walkTables_failed` | Table parse error | Empty table list (regex fallback) |
| `token_count_fallback` | tiktoken unavailable | Estimate via `charCount / 4` |

---

## License

MIT - See [LICENSE](LICENSE) file.

---

## Links

- **npm:** https://npmjs.com/package/@ev3lynx/md-analyzer
- **GitHub:** https://github.com/Ev3lynx727/md-analyzer
- **Issues:** https://github.com/Ev3lynx727/md-analyzer/issues
