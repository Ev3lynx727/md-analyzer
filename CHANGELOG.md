# [0.3.0](https://github.com/Ev3lynx727/md-analyzer/compare/v0.2.2...v0.3.0) (2026-07-07)


### Bug Fixes

* --watch crashes on EACCES in recursive directories ([b30fbe3](https://github.com/Ev3lynx727/md-analyzer/commit/b30fbe3d97225be1f57da51be1de8e81c311ecd3))
* cache prune uses cachedAt instead of mtimeMs ([711f883](https://github.com/Ev3lynx727/md-analyzer/commit/711f883bddbc34056b869fab6127985c89688a69))
* disable npmPublish in semantic-release — manual publish only ([3359c15](https://github.com/Ev3lynx727/md-analyzer/commit/3359c15c083c784bbffe3c3878452b296973f2eb))
* pre-push no longer runs npm test (too slow) + clean up stale monorepo pre-commit config ([9e87025](https://github.com/Ev3lynx727/md-analyzer/commit/9e870257fff67d39dac29e3403cb9096524b631d))
* show help on bare `md-analyzer` invocation instead of scanning ([fea942f](https://github.com/Ev3lynx727/md-analyzer/commit/fea942fb2fb14316cd5d0f6e456d38b2838de504))
* update CI to use ESM CLI and remove stale CommonJS artifacts ([c0b153d](https://github.com/Ev3lynx727/md-analyzer/commit/c0b153d9d4f5ae36cad19226885e877597ddf396))


### Features

* add --summary flag for aggregated stats across all files ([de9cac6](https://github.com/Ev3lynx727/md-analyzer/commit/de9cac6632bbebc37752ae4faaac714fc4be7a48))
* add --watch mode (fs.watch recursive, 300ms debounce, live summary) ([9dc46bd](https://github.com/Ev3lynx727/md-analyzer/commit/9dc46bdfa1a0ddcdb3848f8c534c05bd2c6e35ae))
* add file analysis cache (mtime+size) — second run is ~4000x faster ([34ddc01](https://github.com/Ev3lynx727/md-analyzer/commit/34ddc012abdcadfcde6829a4f2f8b83380fbd45a))
* add line count to --summary extremes ([b64c692](https://github.com/Ev3lynx727/md-analyzer/commit/b64c6925932f2ebb79d2e79f8695427ef9d6aeab))
* capture HTML embed src/href from raw HTML in markdown ([991e7ff](https://github.com/Ev3lynx727/md-analyzer/commit/991e7ff72b6678a95ada34d60a311bd1fe27e862))
* expose library entry with subpath exports for ark-markdownkit ([f4e5d5a](https://github.com/Ev3lynx727/md-analyzer/commit/f4e5d5aefa55cab1360225b0687ebb375cc604f1))
* merge v0.2.3 feature branch → develop ([c925803](https://github.com/Ev3lynx727/md-analyzer/commit/c9258037157275ea0c443d5f01eb8e3075a84f5c))

# Changelog

## [0.2.3] - 2026-07-07

### Added

- **`--summary` flag** — aggregated totals across all files (headings, links, tokens, words, code blocks, tables), averages per file, and extremes (largest/smallest file, most headings/links/tokens). JSON output includes `files`, `totals`, `averages`, and `extremes` keys (`de9cac6`)
- **File analysis cache** — mtime+size-based cache at `~/.local/cache/md-analyzer/analysis-cache.json`. Second run is ~4000x faster (8ms vs 30s for 14 files). 24h TTL with periodic stale-entry pruning (`34ddc01`)
- **`--watch` mode** — native `fs.watch({ recursive: true })` with 300ms debounce per file. Live re-analysis on file changes with summary output. EACCES errors on permission-restricted dirs silently ignored (`9dc46bd`, `b30fbe3`)

### Fixed

- **Cache prune used `mtimeMs` instead of `cachedAt`** — files modified >24h ago were always re-analyzed. Added `cachedAt` field to `CacheEntry`; prune loop now compares against storage timestamp (`711f883`)
- **`--watch` crashed on Linux systemd-private dirs** — `fs.watch({ recursive: true })` on `/tmp/` encountered protected directories. Wrapped in try/catch with error event listener for EACCES/EPERM (`b30fbe3`)

## [0.2.2] - 2026-06-30

### Changed

- **Storage paths migrated to XDG-compliant persistent directories** (`89a8ba0`)
  - Token tracking moved from `/tmp/md-analyzer-session.json` to `~/.local/share/md-analyzer/tokens/md-analyzer-session.json`
  - Run logs moved from `./log/` to `~/.local/state/md-analyzer/log/`
  - Data now persists across system reboots (previously volatile in `/tmp`)
  - Follows Linux FHS/XDG Base Directory Specification
  - `saveSession()` now automatically creates parent directories with recursive `mkdir`
  - Environment variable overrides: `STATE_DIR` and `LOG_DIR` for custom paths
  - Updated `.gitignore` to remove legacy `log/` entry

### Fixed

- Session data no longer lost on system reboot (XDG persistent storage)
- File permission handling intact; automatic directory creation prevents `FileNotFoundError`
- Error handling in `saveSession()` with try-catch prevents crashes

### Documentation

- Updated README.md with new XDG storage paths and environment variables
- Added persistence notes to Session File and Run Logs sections
- Updated Architecture diagram to reflect persistent storage locations
- Added storage path documentation to Environment Variables section

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
