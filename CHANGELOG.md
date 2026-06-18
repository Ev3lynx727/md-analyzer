# Changelog

## [0.2.0] - 2026-06-18

### Added

- **Micromark hybrid integration (Phases 1–4)** — token-stream analysis replaces regex as primary extraction path for headings, links, tables, and code blocks
  - Phase 1: Code region mask via `walkCodeBlocks()` — filters false positive links/headings/tables inside fenced/indented code blocks
  - Phase 2: Reference links + autolinks + image detection — `walkLinks()` extracts resolved references, autolinks, inline links; `isImage` field on `Link` type
  - Phase 3: Setext headings — `walkHeadings()` captures ATX + setext (`===` / `---` underlined) in one pass
  - Phase 4: Full GFM table parsing via `micromark-extension-gfm` `walkTables()`; regex extractors marked `@deprecated`
- **Inline formatting counts** — `boldCount?`, `italicCount?`, `bulletCount?` on `Stats` type, via `walkFormatting()` regex detection filtered through code region mask
- **Plugin ecosystem**
  - Opencode plugin (`plugins/opencode-md-analyzer/plugin.ts`) — `tool.execute.before` + `tool.execute.after` lifecycle hooks with tiered read behavior (keypoints-only vs full read vs skip)
  - External config (`plugins/opencode-md-analyzer/config.json`) — whitelist_names / whitelist_paths / exclude_paths loaded at init with built-in defaults fallback
  - Openclaw hook (`plugins/openclaw-md-analyzer/handler.ts`) — `before_tool_call` handler that injects `md-analyzer --keypoints` outline
  - Python pre-read hook (`python/pre_read.py`) — whitelist, frontmatter/heading extraction, section bounds
- **Documentation**
  - `docs/INTEGRATION.md` — framework integration reference (opencode, openclaw, kiro-cli, hermes)
  - `CE.md` — context engineer handoff for LLM agents
  - `plugins/openclaw-md-analyzer/HOOK.md` — hook installation guide

### Changed

- **Full ESM conversion** — `"type": "module"` in package.json, `"module": "NodeNext"` in tsconfig, all `__dirname` replaced with `import.meta.url` + `fileURLToPath`, lazy dynamic `import('micromark')` replaced with static top-level imports throughout
- **Hybrid merge pattern** — micromark filters/corrects regex output rather than replacing it; `filterMicromarkLinks()`, `filterMicromarkHeadings()`, `filterMicromarkTables()` filter out code-block false positives
- **CLI now accepts `.md` files** — `fs.statSync` detection for file vs directory vs nonexistent; `path_not_found` error for missing paths
- **Error handling** — every code path returns a valid `AnalysisResult`, never throws; `buildBaseResult()` extracted to eliminate double file read; `try/catch` around `Promise.all` pipeline with automatic regex fallback + error propagation
- **`buildBaseResult()`** — single source for base result construction, used by both `analyzeFile()` sync fallback and `analyzeFileWithMicromark()` async primary path
- **Plugin config externalized** — moved from hardcoded constants to `config.json` loaded via `Bun.file()` with DEFAULTS fallback

### Fixed

- Code blocks no longer leak false links, headings, or tables into analysis output
- Autolinks now appear in output (regex missed them entirely)
- Images separated from links via `isImage` flag
- Setext headings now captured (regex only saw ATX headings)
- Plugin caching — in-memory cache avoids redundant `md-analyzer` calls on repeated reads
- `Bun.TOML` → `Bun.file()` for config loading compatibility

## [0.1.6] - 2026-06-16

### Changed

- **Monolith decomposed** — single `src/md-analyzer.ts` (505 lines) refactored into 12 modular files under `src/{cli,core,types,utils}/` with clean barrel export at `src/index.ts`
- **Build output moved to `dist/`** — compiled JS/DTS/MAP no longer pollute the repo root
- **`package.json`** — `main` → `dist/index.js`, `types` → `dist/index.d.ts`, `bin` → `dist/cli/index.js`
- **CLI rewritten with Commander.js** — replaced 509 lines of manual `process.argv` parsing with declarative Commander program; `--help`/`--version` auto-generated; `.action()` handler dispatches to core modules
- **Zod runtime validation** — shared schema (`src/core/schema.ts`) validates CLI args and config shape; `CliOptions` barrel-exported for both runtime and type inference in downstream consumers

### Fixed

- **0 `any` types** — all `Record<string, any>` → `Record<string, unknown>`, all `catch (e: any)` → `catch (e: unknown)`
- **0 empty catch blocks** — every `catch {}` logs with `console.error`
- **Config drift** — `getTomlConfig` now reads `default_budget`, `max_tokens`, `max_results_default`, `session_file` from hooks.toml (previously ignored `max_tokens` and `max_results_default`)
- **Input validation** — unknown CLI flags produce warnings
- **`.gitignore`** — excludes root-level `md-analyzer.js`, `md-analyzer.d.ts`, `md-analyzer.js.map`

## [0.1.5] - 2026-06-15

### Added

- `--version` / `-v` flag prints version number and exits immediately

### Fixed

- `--version` no longer falls through to scan all files in CWD

## [0.1.4] - 2026-06-15

### Added

- `keyHeadings` now includes `line` (1-indexed body position) and `tokens` (per-section token count) — matches Python pre_read.py fallback format
- `sections` field on `AnalysisResult` — pre-computed section-level token estimates during scan
- Output expanded from 5 to 10 headings in keypoints

### Changed

- Version bump from 0.1.3 to 0.1.4
- `Heading` interface now carries `line: number`
- README: added `--keypoints` JSON output example, `--deps` and `--lint-fragments` flags, pre_read.py hook integration, condensed plugins section, fixed priority chain default

## [0.1.3] - 2026-06-08

### Added

- `config.yaml` -- standalone YAML config for the tool (paths, budget, session, output defaults)
- `config.yaml` included in npm package via `files` in `package.json`

### Changed

- Version bump from 0.1.2 to 0.1.3 (minor addition)

## [0.1.2] - 2026-05-22

### Added

- Session tracking: token budget tracking with `--session` and `--budget` flags
- Run logging: per-execution JSON logs written to `log/<sessionId>.json`
- `--max-results` flag to cap output file count
- `--help` flag with usage and examples

### Changed

- Directory argument is optional; falls back to env var `MD_ANALYZER_DEFAULT_DIR` then config then CWD
- Token reporting now shows per-call and session totals in default output

### Fixed

- Skip logical directories without permission errors
- Graceful handling of missing or unreadable files

## [0.1.1] - 2026-05-20

### Added

- CI/CD pipeline (`.github/workflows/ci-cd.yml`)
- `package-lock.json` in published package for reproducible installs
- `.npmignore` to exclude `tsconfig.json`, `src/`, `test/` from published package

### Fixed

- Build step now includes `package-lock.json` in published artifact
- Repository metadata in `package.json` corrected

## [0.1.0] - 2026-05-18

### Added

- Initial release
- Markdown file scanning and analysis
- Frontmatter extraction
- Heading extraction (h1-h6)
- Link extraction (internal/external)
- Table parsing
- Token counting (js-tiktoken with GPT-4 encoding)
- Document relationship graph
- Orphan detection
- Backlink analysis
- Keyword search with relevance ranking
- Metadata filtering
- Key points extraction (single-shot)
- JSON output (`--json`)
- hooks.toml configuration
