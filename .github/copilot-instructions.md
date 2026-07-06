# Copilot Instructions for md-analyzer

## Build, Test & Lint

```bash
# Build TypeScript to dist/
npm run build

# Typecheck without emitting
npm run typecheck

# Lint src/ with ESLint (TypeScript + recommended rules)
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Run CLI against repo root (quick integration test)
npm test
# Longer test: node dist/cli/index.js . --json
```

**Key points:**
- Node.js ≥ 18.0.0 required (ES2020 target)
- TypeScript strict mode enforced
- ESLint ignores: `md-analyzer.js`, `md-analyzer.d.ts`, `node_modules/`, `log/`
- Unused vars are warnings unless they start with `_`
- Source committed to dist/ only during `npm publish`

## High-Level Architecture

**md-analyzer** is a Markdown document analyzer CLI that extracts metadata, headings, links, tables, tokens, and document relationships — designed for AI agent workflows.

### Core Structure

```
src/
├── cli/index.ts          # CLI entry (Commander.js), orchestrates analysis modes
├── core/
│   ├── analyzer.ts       # Main orchestrator: sync analyzer + Micromark walker
│   ├── micromark-walk.ts # Token-stream AST walkers (primary)
│   ├── hybrid-merge.ts   # Filters code blocks, merges Micromark results
│   ├── extractors.ts     # Regex-based extraction (frontmatter, wikilinks, fallback)
│   ├── counters.ts       # Token/word/char counting via js-tiktoken
│   ├── graph.ts          # Document relationship topology, backlinks, orphans
│   ├── search.ts         # Keyword search + relevance ranking
│   ├── health.ts         # Frontmatter/fragment validation
│   ├── session.ts        # Token budget tracking to /tmp/md-analyzer-session.json
│   └── schema.ts         # Zod CLI validation
├── types/index.ts        # AnalysisResult, DocNode, FragmentMeta, etc.
└── utils/
    ├── constants.ts      # SKIP_DIRS (node_modules, .git, etc.)
    └── config.ts         # TOML parser for hooks.toml
```

### Analysis Flow

1. **CLI parsing** → Commander.js parses flags (--keypoints, --search, --graph, etc.)
2. **File discovery** → `scanMarkdownFiles()` recursively finds `.md` files (respects SKIP_DIRS)
3. **Core analysis** → `analyzeFileWithMicromark()` performs hybrid analysis:
   - Micromark (primary): Token-stream parsing for headings, links, tables, code blocks
   - Regex (fallback): Frontmatter, wikilinks, edge cases
   - js-tiktoken: GPT token counting (fallback to char/4)
4. **Post-processing** → Apply search filters, ranking, graph building, session tracking
5. **Output** → JSON or formatted text

### Key Parser Strategy

**Regex-first mentality**: Extractors are pure regex (fast, predictable). **Micromark is a shadow parser** that corrects blind spots without replacing regex. This dual approach ensures:
- Fast baseline via regex
- AST precision for complex markdown (nested lists, code spans, etc.)
- Graceful degradation if Micromark fails (auto-fallback to regex)

## Key Conventions

### TypeScript Patterns

- **Strict mode enforced** — all nullability explicit
- **Naming**: `camelCase` functions/vars, `PascalCase` types/interfaces
- **Error handling**: Try-catch with console.error + descriptive error messages pushed to `errors[]` array (see `AnalysisResult.errors`)
- **Type guards**: Use `instanceof` for Error checks; prefer `e instanceof Error ? e.message : e` pattern
- **No `any` unless unavoidable** — use `unknown` and guard it

### CLI Conventions

- **Options are additive**: `--keypoints`, `--graph`, `--search`, etc. can combine
- **Default limit**: `max-results` defaults to 0 (no limit) to prevent silent truncation
- **Session tracking**: Every run logs to `/tmp/md-analyzer-session.json` and `log/{sessionId}.json`
- **Output JSON**: Always pretty-print at indent 2 when `--json` is passed

### File Processing

- **SKIP_DIRS** includes: `node_modules`, `.git`, `.github`, `dist`, `log`, `python`, etc.
- **Recursive scan** starts from CLI argument (file or directory)
- **Permission errors** are logged but don't stop the scan; results continue for readable files
- **Frontmatter required**: Metadata extracted via regex (YAML block at start of file)

### Configuration

- **hooks.toml** is the source of truth for runtime config (default_directory, default_budget, max_results_default)
- **Priority chain**: CLI flag → env var → hooks.toml → hardcoded default
- **Config parser** (`config.ts`) reads TOML at startup if found; silently skips if missing

### Micromark Integration

- **Imports are async**: Use `import()` and fallback to regex on failure
- **Token walking**: Each walker (headings, links, tables) validates node types before processing
- **Code block filtering**: `hybrid-merge.ts` removes content inside code fences before further analysis
- **GFM support**: Micromark extension enables table parsing (GFM spec)

### Git & CI

- **Branch strategy**: `develop` for PRs, `main` for releases
- **Pre-commit hooks**: Run `pre-commit install` once per clone
- **Commit style**: Conventional commits (feat:, fix:, docs:, chore:)
- **Never mix**: Keep source changes (src/) separate from docs/config commits

## Quick Reference

| Task | Command |
|------|---------|
| Setup | `npm install && pre-commit install` |
| Dev rebuild | `npm run build` |
| Check types | `npm run typecheck` |
| Lint before commit | `npm run lint --fix` |
| Test CLI | `npm test` or `node dist/cli/index.js . --keypoints --json` |
| Publish (auto-builds) | `npm publish` (runs prepublish hook) |

## Useful Debugging

```bash
# Full analysis output as JSON
node dist/cli/index.js . --json

# See keypoints + session tokens
node dist/cli/index.js . --keypoints --session --json

# Search + ranking
node dist/cli/index.js . --search "pattern" --rank --json

# Check document graph
node dist/cli/index.js . --graph --json

# See run logs
cat log/*.json | jq
```
