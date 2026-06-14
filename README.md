     1|# md-analyzer
     2|
     3|> Markdown document analyzer for AI agents - extract metadata, headings, links, tables, tokens, and key points from `.md` files.
     4|
     5|**md-analyzer** is a lightweight, agent-ready document analysis tool designed for AI workflows. It provides single-shot document overviews, token budget tracking, and document relationship graphs — perfect for OpenCode, Hermes, OpenClaw, or any AI agent framework.
     6|
     7|---
     8|
     9|## Quick Overview
    10|
    11|| Feature | Description |
    12||---------|-------------|
    13|| **Keypoints** | Single-shot document overview (ideal for agents) |
    14|| **Token Tracking** | Session-based token budget with `/tmp/md-analyzer-session.json` |
    15|| **Graph** | Document relationship topology (backlinks, orphans) |
    16|| **Search** | Keyword search with relevance ranking |
    17|| **Logs** | Structured JSON logs in `log/{sessionId}.json` |
    18|
    19|### Why md-analyzer?
    20|
    21|- **Agent-native** — Designed for AI agent workflows with single-shot outputs
    22|- **Token-safe** — Built-in limits prevent context blowout (default: 20 results)
    23|- **Extensible** — Simple TypeScript source, easy to extend for plugins
    24|- **Zero deps** — Runtime TOML parser, no external config dependencies
    25|
    26|---
    27|
    28|## Pre-Requirements
    29|
    30|### System Requirements
    31|
    32|| Requirement | Version | Notes |
    33||-------------|---------|-------|
    34|| **Node.js** | ≥ 18.0.0 | LTS recommended |
    35|| **npm** | ≥ 8.0.0 | Comes with Node.js |
    36|
    37|### Verify Installation
    38|
    39|```bash
    40|node --version  # Should be >= 18.0.0
    41|npm --version   # Should be >= 8.0.0
    42|```
    43|
    44|### Dependencies
    45|
    46|| Package | Version | Purpose |
    47||---------|---------|---------|
    48|| `micromark` | ^4.0.0 | Markdown parsing |
    49|| `js-tiktoken` | ^1.0.0 | GPT token counting |
    50|
    51|---
    52|
    53|## Installation
    54|
    55|### From npm (recommended)
    56|
    57|```bash
    58|npm install -g @ev3lynx/md-analyzer
    59|md-analyzer --help
    60|```
    61|
    62|### From source
    63|
    64|```bash
    65|git clone https://github.com/ev3lynx727/md-analyzer.git
    66|cd md-analyzer
    67|npm install
    68|npm run build
    69|```
    70|
    71|### Quick test
    72|
    73|```bash
    74|node md-analyzer.js . --keypoints --json
    75|```
    76|
    77|---
    78|
    79|## Usage
    80|
    81|### Basic CLI
    82|
    83|```bash
    84|# With npx (no install required)
    85|npx @ev3lynx/md-analyzer <directory> [options]
    86|
    87|# After global install
    88|npm install -g @ev3lynx/md-analyzer
    89|md-analyzer <directory> [options]
    90|
    91|# From source (development)
    92|node md-analyzer.js <directory> [options]
    93|```
    94|
    87|### Options
    88|
    89|| Flag | Description | Example |
    90||------|-------------|---------|
    91|| `--json` | Output as JSON | `--json` |
    92|| `--search <kw>` | Search keyword in content | `--search "task"` |
    93|| `--filter <k=v>` | Filter by metadata field | `--filter "category=guides"` |
    94|| `--rank` | Rank results by relevance | `--search "task" --rank` |
    95|| `--graph` | Document relationship graph | `--graph` |
    96|| `--orphans` | Find unreferenced docs | `--orphans` |
    97|| `--backlinks <doc>` | Find docs linking to `<doc>` | `--backlinks "adr-2026-01"` |
    98|| `--keypoints` | Quick overview (single-shot) | `--keypoints` |
    99|| `--session` | Token budget report | `--session` |
   100|| `--budget <n>` | Set token budget limit | `--budget 50000` |
   101|| `--max-results <n>` | Limit output | `--max-results 10` |
   102|
   103|### Examples
   104|
    105|```bash
    106|# Quick overview (single-shot for agents)
    107|npx @ev3lynx/md-analyzer /path/to/docs --keypoints --json
    108|
    109|# Search with ranking
    110|md-analyzer . --search "task lifecycle" --rank --json
    111|
    112|# Find backlinks
    113|md-analyzer . --backlinks adr-2026-04-01 --json
    114|
    115|# Token budget tracking
    116|md-analyzer . --session --budget 100000 --json
   117|
   118|# Find orphans
   119|md-analyzer . --orphans --json
   120|```
   121|
   122|---
   123|
   124|## Building Extensions & Plugins
   125|
   126|md-analyzer is designed to be extended. Here's how to build plugins for different frameworks.
   127|
   128|### 1. As CLI Tool (OpenCode, Hermes, etc.)
   129|
   130|```bash
   131|# In your agent config
   132|tools:
   133|  - name: md-analyzer
   134|    command: md-analyzer
   135|    args: ["{{directory}}", "--keypoints", "--json"]
   136|```
   137|
   138|### 2. As Node.js Module
   139|
   140|```javascript
   141|const { execSync } = require('child_process');
   142|
   143|function analyzeDocs(directory, options = {}) {
   144|  const args = ['md-analyzer.js', directory, '--json'];
   145|  if (options.keypoints) args.push('--keypoints');
   146|  if (options.search) args.push('--search', options.search);
   147|  
   148|  const result = execSync(`node ${args.join(' ')}`, { encoding: 'utf-8' });
   149|  return JSON.parse(result);
   150|}
   151|
   152|// Usage
   153|const docs = analyzeDocs('./docs', { keypoints: true });
   154|```
   155|
   156|### 3. As Python Module (LangGraph)
   157|
   158|```python
   159|import subprocess
   160|import json
   161|
   162|def run_md_analyzer(directory, **kwargs):
   163|    args = ["node", "md-analyzer.js", directory, "--json"]
   164|    for key, value in kwargs.items():
   165|        if value is True:
   166|            args.append(f"--{key}")
   167|        elif value:
   168|            args.extend([f"--{key}", str(value)])
   169|    
   170|    result = subprocess.run(args, capture_output=True, text=True)
   171|    return json.loads(result.stdout)
   172|
   173|# Usage
   174|docs = run_md_analyzer("./docs", keypoints=True)
   175|```
   176|
   177|### 4. Create Custom Wrapper
   178|
   179|```typescript
   180|// src/plugins/my-plugin.ts
   181|import { analyzeFile, extractKeyPoints } from '../md-analyzer';
   182|
   183|interface MyPluginOptions {
   184|  directory: string
   185|  customField?: string
   186|}
   187|
   188|export function myPlugin(options: MyPluginOptions) {
   189|  const results = scanMarkdownFiles(options.directory);
   190|  const analyzed = results.map(analyzeFile);
   191|  
   192|  // Custom processing
   193|  return analyzed.map(doc => ({
   194|    ...extractKeyPoints(doc),
   195|    customField: options.customField
   196|  }));
   197|}
   198|```
   199|
   200|### 5. Hook into Session Events
   201|
   202|```typescript
   203|// Track token usage across plugin calls
   204|const session = loadSession();
   205|console.log(`Total tokens: ${session.totalTokens}`);
   206|console.log(`Calls: ${session.calls}`);
   207|```
   208|
   209|---
   210|
   211|## Configuration
   212|
   213|### hooks.toml
   214|
   215|```toml
   216|[tool.md-analyzer.config]
   217|# Path configuration
   218|default_directory = "/path/to/docs"
   219|
   220|# Token budget configuration
   221|default_budget = 100000
   222|max_tokens = 200000
   223|
   224|# Output safety (prevent token blowout)
   225|max_results_default = 20
   226|```
   227|
   228|### Environment Variables
   229|
   230|| Variable | Description | Default |
   231||----------|-------------|---------|
   232|| `MD_ANALYZER_PATH` | Path to md-analyzer.js | `md-analyzer.js` |
   233|| `MD_ANALYZER_DEFAULT_DIR` | Default directory | `.` |
   234|| `MD_ANALYZER_MAX_TOKENS` | Max token limit | `200000` |
   235|| `MD_ANALYZER_DEFAULT_BUDGET` | Default budget | `100000` |
   236|| `MD_ANALYZER_MAX_RESULTS` | Max results | `20` |
   237|
   238|### Priority Chain
   239|
   240|```
   241|CLI --max-results 3
   242|  ↓
   243|MD_ANALYZER_MAX_RESULTS=5
   244|  ↓
   245|max_results_default=20 (hooks.toml)
   246|  ↓
   247|0 (no limit)
   248|```
   249|
   250|---
   251|
   252|## Session & Logging
   253|
   254|### Session File
   255|
   256|Location: `/tmp/md-analyzer-session.json`
   257|
   258|```json
   259|{
   260|  "sessionId": "session-1234567890",
   261|  "calls": 5,
   262|  "totalTokens": 1500,
   263|  "filesProcessed": 25,
   264|  "startTime": "2026-05-03T12:00:00.000Z"
   265|}
   266|```
   267|
   268|### Run Logs
   269|
   270|Location: `{project}/log/{sessionId}.json`
   271|
   272|```json
   273|[
   274|  {
   275|    "timestamp": "2026-05-03T12:00:00.000Z",
   276|    "sessionId": "session-1234567890",
   277|    "directory": "/path/to/docs",
   278|    "flags": ["--keypoints", "--json"],
   279|    "filesFound": 10,
   280|    "filesProcessed": 10,
   281|    "tokensThisCall": 300,
   282|    "totalSessionTokens": 1500,
   283|    "errors": [],
   284|    "durationMs": 450,
   285|    "mode": "keypoints"
   286|  }
   287|]
   288|```
   289|
   290|---
   291|
   292|## Architecture
   293|
   294|```
   295|md-analyzer/
   296|├── src/
   297|│   └── md-analyzer.ts      # Main source (TypeScript)
   298|├── md-analyzer.js          # Compiled output
   299|├── hooks.toml              # Configuration
   300|└── log/                    # Run logs
   301|```
   302|
   303|### Key Functions
   304|
   305|| Function | Description |
   306||----------|-------------|
   307|| `extractFrontmatter()` | YAML metadata extraction |
   308|| `extractHeadings()` | Parse H1-H6 structure |
   309|| `extractLinks()` | Internal/external link analysis |
   310|| `extractTables()` | Markdown table parsing |
   311|| `scanMarkdownFiles()` | Recursive directory scanner |
   312|| `buildGraph()` | Document relationship topology |
   313|| `extractKeyPoints()` | Single-shot overview |
   314|| `loadSession()` / `saveSession()` | Token budget tracking |
   315|
   316|---
   317|
   318|## Error Handling
   319|
   320|| Error | Description |
   321||-------|-------------|
   322|| `permission_denied` | Skip inaccessible directories |
   323|| `file_read_error` | Return partial results |
   324|| `token_count_fallback` | Use `charCount/4` estimation |
   325|
   326|---
   327|
   328|## License
   329|
   330|MIT - See [LICENSE](LICENSE) file.
   331|
   332|---
   333|
   334|## Links
   335|
   336|- **npm:** https://npmjs.com/package/@ev3lynx/md-analyzer
   337|- **GitHub:** https://github.com/ev3lynx727/md-analyzer
   338|- **Issues:** https://github.com/ev3lynx727/md-analyzer/issues