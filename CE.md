# CE: md-analyzer — Context Engineer Handoff

## Identity

CLI tool + agent-plugin ecosystem for Markdown document analysis. Extracts headings, links, tables, wikilinks, frontmatter, inline formatting, code blocks, token counts. Outputs `AnalysisResult` JSON for AI agents to make informed read decisions without consuming full file context.

`@ev3lynx/md-analyzer` v0.2.0 — MIT, TypeScript (ESM), Node >=18.

## Architecture

```
src/
  cli/index.ts              Commander CLI, flags, orchestration
  cli/output.ts             extractKeyPoints(), writeRunLog(), buildSummary()
  core/
    analyzer.ts             analyzeFile() sync, analyzeFileWithMicromark() sync
    cache.ts                analyzeFileCached() — mtime+size cache with 24h TTL
    extractors.ts           @deprecated regex fallbacks: extractHeadings/Links/Tables
    counters.ts             word/char/line/token counting via js-tiktoken
    watcher.ts              watchDirectory() — fs.watch recursive with 300ms debounce
    micromark-walk.ts       token walkers: code blocks, links, headings, tables, formatting
    hybrid-merge.ts         micromark filters/corrects regex output
    search.ts               ripgrep-first searchContent() + rankByRelevance()
    graph.ts                buildGraph(), findOrphans(), findBacklinks()
    health.ts               getFragmentHealth() — frontmatter quality check
    session.ts              load/save/update session token budget tracking
    schema.ts               Zod schemas: CliOptions, AnalyzerConfig
  types/index.ts            Link, Heading, Table, Stats, AnalysisResult, Graph, etc.
  utils/
    constants.ts            SKIP_DIRS, SESSION_FILE, CACHE_FILE, LOG_DIR
    config.ts               resolveConfigPath(), getTomlConfig()
```

## Hybrid Pipeline

```
analyzeFileWithMicromark(path)
  -> fs.readFileSync
  -> extractFrontmatter (regex)
  -> walkCodeBlocks, walkLinks, walkHeadings, walkTables, walkFormatting (sync)
  -> buildBaseResult (regex fallbacks)
  -> filterMicromarkLinks/Headings/Tables (micromark wins, filters code-block false positives)
  -> countCodeBlocks + countFormatting (merged)
  -> return AnalysisResult

Walk failure -> null for that walker -> buildBaseResult fills from regex
Catastrophic failure -> buildBaseResult with error propagation
```

## Key Types

```
AnalysisResult {
  file, fileName, metadata, fragmentMeta,
  headings: Heading[]       { level, text, line }
  sections: SectionInfo[]   { line, tokens }
  links: Link[]             { text, url, isInternal, fileName, isImage? }
  wikilinks: Wikilink[]     { target, display }
  tables: Table[]           { headers: string[], rows: string[][] }
  stats: Stats {
    totalHeadings, totalLinks, internalLinks, externalLinks,
    totalWikilinks, wordCount, charCount, lineCount,
    codeBlocks, tables, tokens,
    boldCount?, italicCount?, bulletCount?,
    errors?: string[]
  }
}
```

## Critical Constraints

- **micromark v4.0.2**: Static top-level import via ESM build (module NodeNext)
- **micromark-extension-gfm v3.0.0**: Required for table tokenization in walkTables()
- **@types/node**: Pinned ^20.0.0, skipLibCheck: true, compiles clean on TS 5.x
- **Inline formatting**: NOT tokenized by micromark.parse(). Regex walkFormatting() is the only path
- **Formatting regex**: bold `(?<!\*)\*\*(?!\*)(.+?)\*\*`, italic `(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)`, bold+italic `\*\*\*(.+?)\*\*\*`, bullets `^[ \t]*[-*+][ \t]`
- **ripgrep 13.0.0**: execFileSync for --search and --rank. Falls back to fs.readFileSync
- **Build**: tsc -> ESM output (module NodeNext), micromark consumed via static import
- **md-analyzer binary**: in PATH at /run/user/1000/fnm_multishells/2350_1781758185408/bin/md-analyzer

## CLI Flags

| Flag | Behavior |
|------|----------|
| --json | JSON output (default if no flag) |
| --summary | Aggregated totals + averages + extremes across all files |
| --watch | Live re-analysis via fs.watch recursive with 300ms debounce |
| --search <kw> | ripgrep -ilF match, fallback includes |
| --filter k=v | Metadata filter |
| --rank | ripgrep -icF count sort, paired with --search |
| --graph | Internal link + wikilink graph |
| --deps | DAG dependency graph via depends_on frontmatter |
| --orphans | Unreferenced docs (no inbound edges) |
| --backlinks <doc> | Docs linking to target |
| --keypoints | Single-shot outline via extractKeyPoints() |
| --lint-fragments | Fragment health report |
| --session | Token budget report |
| --budget <n> | Budget limit (default 100k) |
| --max-results <n> | Limit output count |

Accepts both .md files and directories. fs.statSync detection.

## Plugin Ecosystem

| Framework | Mechanism | Config | Status |
|-----------|-----------|--------|--------|
| opencode | Plugin: tool.execute.before + after | ~/.config/opencode/plugins/md-analyzer.ts + config.json | Working |
| openclaw | before_tool_call TS handler | ~/.openclaw/hooks/md-analyzer/ + openclaw.json | Working |
| kiro-cli | preToolUse Python hook | ~/.kiro/hooks/pre_read_md.py | Manual |
| hermes | hooks: {} map | ~/.hermes/config.yaml | Untested |

### Plugin Tiered Read Behavior

| Tier | Match | Behavior |
|------|-------|----------|
| whitelist_names | Exact filename | Keypoints-only (replace content) |
| whitelist_paths | Path prefix | Full read (keypoints + content) |
| exclude_paths | Path prefix | Skipped |

Config lives in config.json alongside plugin.ts. Built-in defaults if config missing.

## Current State

- v0.2.3: --summary, caching (4000x speedup on re-run), --watch (live re-analysis via fs.watch recursive)
- Phases 1-4 (code mask, ref links/autolinks/images, setext headings, full token extraction) — complete
- Inline formatting — regex-based, Stats-only (bold/italic/bullet counts)
- ripgrep — execFileSync with -ilF/-icF, cached check, fallback to readFileSync
- CLI — file + directory support, path_not_found errors; --summary and --watch flags
- Cache — mtime+size at `~/.local/cache/md-analyzer/analysis-cache.json`, 24h TTL, periodic prune
- Plugin — config.json externalized, opencode + openclaw hooks shipping
- md-analyzer install --hook — not implemented yet
- md-analyzer install --mcp — not implemented yet

## Files to Edit

| File | Purpose |
|------|---------|
| src/core/analyzer.ts | Main pipeline, buildBaseResult(), analyzeFile(), analyzeFileWithMicromark() |
| src/core/micromark-walk.ts | All 5 token walkers, event parsing, GFM table extension |
| src/core/hybrid-merge.ts | Filter functions, countCodeBlocks(), countFormatting() |
| src/core/extractors.ts | Regex fallbacks, frontmatter, wikilinks — @deprecated |
| src/core/search.ts | ripgrep-first search + rank |
| src/types/index.ts | All interfaces |
| src/cli/index.ts | Commander CLI |
| src/cli/output.ts | Keypoints extract + run log |
| plugins/opencode-md-analyzer/plugin.ts | Opencode plugin lifecycle |
| plugins/opencode-md-analyzer/config.json | External tier config |
| plugins/openclaw-md-analyzer/handler.ts | Openclaw before_tool_call handler |
| python/pre_read.py | Python pre-read hook |

## Recent Changes

- v0.2.0: Full ESM conversion — `"type": "module"`, `"module": "NodeNext"`, `__dirname` → `import.meta.url`, lazy dynamic import → static micromark imports
- Config moved to config.json — no hardcoded lists in plugin code
- Plugin confirmed working: [md-analyzer] diagnostics visible in terminal, keypoints injected into read output
- CONTRIBUTING.md (WHITELIST_NAMES) shows keypoints-only; fallback files show keypoints + full content

## Important Files

- plugins/opencode-md-analyzer/config.json
- ~/.config/opencode/plugins/md-analyzer.ts
- ~/.config/opencode/plugins/opencode-md-analyzer/config.json
