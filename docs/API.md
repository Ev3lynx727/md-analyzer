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
node md-analyzer.js <directory> [options]
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
| `--keypoints` | Single-shot overview | `--keypoints` |
| `--session` | Token budget report | `--session` |
| `--budget <n>` | Set token budget | `--budget 50000` |
| `--max-results <n>` | Limit output | `--max-results 10` |

### Examples

```bash
# Quick overview (single-shot for agents)
node md-analyzer.js /path/to/docs --keypoints --json

# Search with ranking
node md-analyzer.js . --search "task lifecycle" --rank --json

# Find backlinks
node md-analyzer.js . --backlinks adr-2026-04-01 --json

# Token budget tracking
node md-analyzer.js . --session --budget 100000 --json

# Find orphans
node md-analyzer.js . --orphans --json
```

---

## Python API

### MDAnalyzerTool Class

```python
from langgraph_integration import MDAnalyzerTool

tool = MDAnalyzerTool()
result = tool.run("/path/to/docs", keypoints=True)
```

#### Methods

| Method | Description |
|--------|-------------|
| `run(directory, **kwargs)` | Run analysis with options |

#### Options (kwargs)

```python
tool.run(directory,
    json=True,           # Return JSON
    keypoints=True,      # Quick overview
    search="keyword",    # Search content
    filter="key=value",  # Filter metadata
    rank=True,           # Rank by relevance
    graph=True,          # Get graph
    orphans=True,        # Find orphans
    backlinks="doc",    # Find backlinks
    max_results=20       # Limit results
)
```

### LangGraph Integration

```python
from langgraph_integration import create_doc_analysis_graph

graph = create_doc_analysis_graph()
result = graph.invoke({
    "query": "task lifecycle",
    "directory": "/path/to/docs"
})
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

### hooks.toml

```toml
[tool.md-analyzer.config]
default_directory = "/path/to/docs"
tool_path = "md-analyzer.js"
default_budget = 100000
max_tokens = 200000
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
  ↓ (if not set)
MD_ANALYZER_MAX_RESULTS=5
  ↓ (if not set)
max_results_default=20 (hooks.toml)
  ↓ (if not set)
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

Location: `/home/ev3lynx/dev/micromark/log/{sessionId}.json`

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
| `token_count_fallback` | tiktoken unavailable | Uses `charCount/4` |

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
