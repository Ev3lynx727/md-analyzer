# Backlog

## Legend

- ✅ Done
- 🟡 In Progress
- ⬜ Not Started
- 🔴 Blocked

---

## Dependency Audit — 2026-06-18

| Dependency | Type | Integration | Effect % | Files | Verdict |
|------------|------|-------------|----------|-------|---------|
| commander | dep | Module | 6% | 1/16 | Peripheral — CLI entry |
| js-tiktoken | dep | Module | 12% | 2/16 | Significant — counters + analyzer |
| js-yaml | dep | Module | 6% | 1/16 | Peripheral — frontmatter extract |
| micromark | dep | Module | 6% | 1/16 | Peripheral — token stream walker |
| micromark-extension-gfm | dep | Module | 6% | 1/16 | Peripheral — GFM table parser |
| zod | dep | Module | 12% | 2/16 | Significant — schema validation |
| @eslint/js | devDep | Config | 6% | 1/16 | Peripheral (eslint.config.mjs) |
| @types/js-yaml | devDep | Config | 0% | 0/16 | Config — tsconfig types |
| @types/node | devDep | Config | 0% | 0/16 | Config — tsconfig types |
| eslint | devDep | Config | 6% | 1/16 | Peripheral (eslint.config.mjs) |
| typescript | devDep | Config | 0% | 0/16 | Config — build tool |
| typescript-eslint | devDep | Config | 6% | 1/16 | Peripheral (eslint.config.mjs) |

### Blocked Items

| # | Item | Status | Root Cause | Why | What's the Matter | Description |
|---|------|--------|------------|-----|-------------------|-------------|
| 1 | ~~Remove micromark from deps~~ | ✅ Done | micromark integrated in 4 phases (Ph1→Ph4): code blocks, links/images, headings, tables | — | — | — |
| 2 | ~~Fix @types/node compat with TS 6.0.3~~ | ✅ Done | Pinned to `^20.0.0` (v20.19.43), skipLibCheck enabled, compiles clean | — | — | — |

## Changelog Audit Trail — 2026-06-18

| Check | Status | Detail |
|-------|--------|--------|
| CHANGELOG.md exists | ✅ Yes | 7 versions from 0.1.0 to 0.2.0 |
| Last version | ✅ 0.2.0 | 2026-06-18 |
| Git history clean | ✅ Yes | 20 commits on develop |
| Gap >30d between versions | ✅ None | Max gap: 14 days |

## Open Pull Requests — 2026-06-18

| Check | Result |
|-------|--------|
| Remote configured | ✅ `origin` → `github.com/Ev3lynx727/md-analyzer.git` |
| Open PRs | 0 — no open pull requests |
| gh CLI | ✅ Authenticated |

## Issues Audit Trail — 2026-06-18

### Source Issues

| Tag | Files | Status |
|-----|-------|--------|
| FIXME | 0 | ✅ None |
| BUG | 0 | ✅ None |
| HACK | 0 | ✅ None |
| WORKAROUND | 0 | ✅ None |
| XXX | 0 | ✅ None |
| ISSUE | 0 | ✅ None |

### Documented Issues in Docs

| Pattern | Files | Status |
|---------|-------|--------|
| known issue | 0 | ✅ None |
| known bug | 0 | ✅ None |
| workaround | 0 | ✅ None |
| not implemented | 0 | ✅ None |
| limitation | 0 | ✅ None |

## Implementation Audit Trail — 2026-06-18

### Documentation Claims

| Pattern | Files | Status |
|---------|-------|--------|
| :implemented | 0 | ✅ None |
| :implementation | 0 | ✅ None |
| **status: wip** | 0 | ✅ None |
| **status: blocked** | 0 | ✅ None |

### Source Markers

| Tag | Files | Status |
|-----|-------|--------|
| TODO | 0 | ✅ None |
| FIXME | 0 | ✅ None |
| HACK | 0 | ✅ None |
| WIP | 0 | ✅ None |
| XXX | 0 | ✅ None |

### Cross-Reference: Mismatches

No mismatches found — all documentation claims are consistent with source state.

### Future Items from DEVELOPMENT.md

| # | Item | Status | Root Cause | Why | What's the Matter | Description |
|---|------|--------|------------|-----|-------------------|-------------|
| 1 | Add `--help` flag | ✅ Done | — | — | — | Already implemented |
| 2 | Add `--summary` for aggregated stats | ⬜ | Not implemented | Reduces output tokens for large scans | Agents waste context on per-file details | New flag to show only totals |
| 3 | File watcher mode (`--watch`) | ⬜ | Not implemented | Live re-indexing for editor workflows | Manual re-run required on file changes | Chokidar-based watch mode |
| 4 | Streaming output for large results | ⬜ | Needs architectural change | Enables processing 1000+ files | Memory pressure with current all-at-once approach | Generator-based output |
| 5 | Parallel file scanning | ⬜ | Worker threads needed | Speed up large directory scans | Single-threaded I/O bottleneck | Worker pool for md file discovery |
| 6 | Caching layer | ⬜ | Needs file hash tracking | Skip unchanged files between runs | Re-analyzes same files every time | MD5-based cache |
| 7 | MCP server wrapper | ⬜ | Requires protocol implementation | Native AI agent protocol support | CLI-only restricts integration scope | stdio MCP server |
| 8 | Web UI for document graphs | ⬜ | Separate project | Visual exploration of doc topology | CLI-only, no visual tooling | Svelte/React frontend |
| 9 | Vector DB integration | ⬜ | External service needed | Semantic search across docs | Keyword search only, no embeddings | Upsert to Pinecone/Chroma |


