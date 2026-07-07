# API.md — md-analyzer Interface Reference

> Complete API documentation for CLI, Python, and integration.

---

## Table of Contents

1. [CLI Reference](#cli-reference)
2. [Python API](#python-api)
3. [Input/Output Formats](#inputoutput-formats)
4. [Configuration](#configuration)
5. [Session & Logging](#session--logging)
6. [Error Handling](#error-handling)

---

## CLI Reference

### Basic Usage

```bash
md-analyzer <file|directory> [options]
```

### Options

| Flag | Description | Example |
|------|-------------|---------|
| `--json` | Output as JSON | `--json` |
| `--search <kw>` | Search keyword in content | `--search "task"` |
| `--filter <k=v>` | Filter by metadata | `--filter "category=guides"` |
| `--rank` | Rank by search relevance | `--search "task" --rank` |
| `--graph` | Document relationship graph | `--graph` |
| `--orphans` | Find unreferenced docs | `--orphans` |
| `--backlinks <doc>` | Find docs linking to `<doc>` | `--backlinks "adr-2026-01"` |
| `--summary` | Aggregated totals + averages + extremes across all files | `--summary` |
| `--watch` | Live re-analysis via fs.watch with 300ms debounce | `--watch` |
| `--keypoints` | Single-shot overview | `--keypoints` |
| `--session` | Token budget report | `--session` |
| `--budget <n>` | Set token budget | `--budget 50000` |
| `--max-results <n>` | Limit output | `--max-results 10` |

### Examples

```bash
# Quick overview (single-shot for agents)
md-analyzer /path/to/docs --keypoints --json

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



## Input/Output Formats

### Output: Default (Full Analysis)

```json
{
  "file": "/path/to/doc.md",
  "fileName": "doc",
  "metadata": {
    "title": "My Document",
    "author": "John Doe"
  },
  "headings": [
    { "level": 1, "text": "Introduction" },
    { "level": 2, "text": "Getting Started" }
  ],
  "links": [
    { "text": "Google", "url": "https://google.com", "isInternal": false, "fileName": null }
  ],
  "tables": [
    {
      "headers": ["Col A", "Col B"],
      "rows": [["1", "2"], ["3", "4"]]
    }
  ],
  "stats": {
    "totalHeadings": 4,
    "totalLinks": 2,
    "internalLinks": 0,
    "externalLinks": 2,
    "wordCount": 150,
    "charCount": 850,
    "lineCount": 45,
    "codeBlocks": 2,
    "tables": 1,
    "tokens": 210
  }
}
```

### Output: Keypoints (Single-Shot)

```json
{
  "fileName": "doc",
  "title": "Introduction",
  "level": 1,
  "summary": {
    "totalHeadings": 4,
    "totalLinks": 2,
    "totalTokens": 210,
    "wordCount": 150
  },
  "keyHeadings": [
    { "level": 1, "text": "Introduction" },
    { "level": 2, "text": "Getting Started" }
  ],
  "importantLinks": [
    { "text": "Google", "url": "https://google.com" }
  ],
  "internalReferences": ["other-doc"],
  "metadata": { "title": "My Document" },
  "readingTime": "1 min"
}
```

### Output: Graph

```json
{
  "nodes": {
    "doc-a": { "inbound": ["doc-b"], "outbound": ["doc-c"] },
    "doc-b": { "inbound": [], "outbound": ["doc-a"] },
    "doc-c": { "inbound": ["doc-a"], "outbound": [] }
  },
  "edges": [
    { "source": "doc-a", "target": "doc-c" },
    { "source": "doc-b", "target": "doc-a" }
  ]
}
```

### Output: Session

```json
{
  "sessionId": "session-1234567890",
  "totalCalls": 5,
  "totalTokens": 1500,
  "budget": 100000,
  "remaining": 98500,
  "percentUsed": "2%",
  "status": "OK"
}
```

---

## Configuration

Priority chain: CLI flag → `MD_ANALYZER_DEFAULT_DIR` env var → `process.cwd()`.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MD_ANALYZER_DEFAULT_DIR` | Default directory | `process.cwd()` |

---

## Session & Logging

### Session File

Location: `~/.local/share/md-analyzer/tokens/md-analyzer-session.json`

Only written to disk when the `--session` flag is active. Tracking is in-memory otherwise.

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

Location: `~/.local/state/md-analyzer/log/{sessionId}.json`

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

## Error Handling

### Error Types

| Error | Description | Output |
|-------|-------------|--------|
| `permission_denied` | Can't access directory | Added to `stats.errors` |
| `file_read_error` | Can't read file | Returns partial result |
| `token_count_fallback` | tiktoken unavailable (legacy) | Uses `charCount/4` |

### Example Error Output

```json
{
  "file": "/path/to/doc.md",
  "fileName": "doc",
  "metadata": null,
  "headings": [],
  "links": [],
  "tables": [],
  "stats": {
    "totalHeadings": 0,
    "totalLinks": 0,
    "internalLinks": 0,
    "externalLinks": 0,
    "wordCount": 0,
    "charCount": 0,
    "lineCount": 0,
    "codeBlocks": 0,
    "tables": 0,
    "tokens": 0,
    "errors": [
      "permission_denied: /restricted/path"
    ]
  }
}
```

---

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |

---

**End of API.md**
