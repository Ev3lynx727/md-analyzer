# md-analyzer

> Markdown document analyzer for AI agents - extract metadata, headings, links, tables, tokens, and key points from `.md` files.

**md-analyzer** is a lightweight, agent-ready document analysis tool designed for AI workflows. It provides single-shot document overviews, token budget tracking, and document relationship graphs — perfect for OpenCode, Hermes, OpenClaw, or any AI agent framework.

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
- **Zero deps** — Runtime TOML parser, no external config dependencies

---

## Pre-Requirements

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
| `micromark` | ^4.0.0 | Markdown parsing |
| `js-tiktoken` | ^1.0.0 | GPT token counting |

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
node md-analyzer.js . --keypoints --json
```

---

## Usage

### Basic CLI

```bash
# With npx (no install required)
npx @ev3lynx/md-analyzer <directory> [options]

# After global install
npm install -g @ev3lynx/md-analyzer
md-analyzer <directory> [options]

# From source (development)
node md-analyzer.js <directory> [options]
```

### Options

| Flag | Description | Example |
|------|-------------|---------|
| `--json` | Output as JSON | `--json` |
| `--search <kw>` | Search keyword in content | `--search "task"` |
| `--filter <k=v>` | Filter by metadata field | `--filter "category=guides"` |
| `--rank` | Rank results by relevance | `--search "task" --rank` |
| `--graph` | Document relationship graph | `--graph` |
| `--orphans` | Find unreferenced docs | `--orphans` |
| `--backlinks <doc>` | Find docs linking to `<doc>` | `--backlinks "adr-2026-01"` |
| `--keypoints` | Quick overview (single-shot) | `--keypoints` |
| `--session` | Token budget report | `--session` |
| `--budget <n>` | Set token budget limit | `--budget 50000` |
| `--max-results <n>` | Limit output | `--max-results 10` |

### Examples

```bash
# Quick overview (single-shot for agents)
npx @ev3lynx/md-analyzer /path/to/docs --keypoints --json

# Search with ranking
md-analyzer . --search "task lifecycle" --rank --json

# Find backlinks
md-analyzer . --backlinks adr-2026-04-01 --json

# Token budget tracking
md-analyzer . --session --budget 100000 --json

# Find orphans
md-analyzer . --orphans --json
```

---

## Building Extensions & Plugins

md-analyzer is designed to be extended. Here's how to build plugins for different frameworks.

### 1. As CLI Tool (OpenCode, Hermes, etc.)

```bash
# In your agent config
tools:
  - name: md-analyzer
    command: md-analyzer
    args: ["{{directory}}", "--keypoints", "--json"]
```

### 2. As Node.js Module

```javascript
const { execSync } = require('child_process');

function analyzeDocs(directory, options = {}) {
  const args = ['md-analyzer.js', directory, '--json'];
  if (options.keypoints) args.push('--keypoints');
  if (options.search) args.push('--search', options.search);

  const result = execSync(`node ${args.join(' ')}`, { encoding: 'utf-8' });
  return JSON.parse(result);
}

// Usage
const docs = analyzeDocs('./docs', { keypoints: true });
```

### 3. As Python Module (LangGraph)

```python
import subprocess
import json

def run_md_analyzer(directory, **kwargs):
    args = ["node", "md-analyzer.js", directory, "--json"]
    for key, value in kwargs.items():
        if value is True:
            args.append(f"--{key}")
        elif value:
            args.extend([f"--{key}", str(value)])

    result = subprocess.run(args, capture_output=True, text=True)
    return json.loads(result.stdout)

# Usage
docs = run_md_analyzer("./docs", keypoints=True)
```

### 4. Create Custom Wrapper

```typescript
// src/plugins/my-plugin.ts
import { analyzeFile, extractKeyPoints } from '../md-analyzer';

interface MyPluginOptions {
  directory: string
  customField?: string
}

export function myPlugin(options: MyPluginOptions) {
  const results = scanMarkdownFiles(options.directory);
  const analyzed = results.map(analyzeFile);

  // Custom processing
  return analyzed.map(doc => ({
    ...extractKeyPoints(doc),
    customField: options.customField
  }));
}
```

### 5. Hook into Session Events

```typescript
// Track token usage across plugin calls
const session = loadSession();
console.log(`Total tokens: ${session.totalTokens}`);
console.log(`Calls: ${session.calls}`);
```

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
max_results_default = 20
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MD_ANALYZER_PATH` | Path to md-analyzer.js | `md-analyzer.js` |
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
max_results_default=20 (hooks.toml)
  ↓
0 (no limit)
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
│   └── md-analyzer.ts      # Main source (TypeScript)
├── md-analyzer.js          # Compiled output
├── hooks.toml              # Configuration
└── log/                    # Run logs
```

### Key Functions

| Function | Description |
|----------|-------------|
| `extractFrontmatter()` | YAML metadata extraction |
| `extractHeadings()` | Parse H1-H6 structure |
| `extractLinks()` | Internal/external link analysis |
| `extractTables()` | Markdown table parsing |
| `scanMarkdownFiles()` | Recursive directory scanner |
| `buildGraph()` | Document relationship topology |
| `extractKeyPoints()` | Single-shot overview |
| `loadSession()` / `saveSession()` | Token budget tracking |

---

## Error Handling

| Error | Description |
|-------|-------------|
| `permission_denied` | Skip inaccessible directories |
| `file_read_error` | Return partial results |
| `token_count_fallback` | Use `charCount/4` estimation |

---

## License

MIT - See [LICENSE](LICENSE) file.

---

## Links

- **npm:** https://npmjs.com/package/@ev3lynx/md-analyzer
- **GitHub:** https://github.com/Ev3lynx727/md-analyzer
- **Issues:** https://github.com/Ev3lynx727/md-analyzer/issues
