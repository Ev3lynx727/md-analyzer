# Changelog

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
