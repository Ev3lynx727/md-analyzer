# Priority TODO — Micromark Hybrid Integration

## Strategy

Shadow-parser pattern: micromark augments, doesn't replace legacy regex. Both parse the same content; micromark's structural awareness corrects regex blind spots. Merge: micromark wins for accuracy, regex fills gaps it handles better.

```
analyzeFile()
  ├── legacy-regex.ts     (frontmatter, wikilinks, code-block counting)
  ├── micromark-walk.ts   (code region mask, reference/autolinks, setext headings)
  └── hybrid-merge.ts     (micromark filters/corrects regex output)
```

Results are identical output interfaces — zero consumer breakage.

---

## Phase 1 — Code Region Mask (80% of accuracy gain, 20% effort)

| # | Task | File | Detail |
|---|------|------|--------|
| 1.1 | Wrap micromark as lazy dynamic import | `src/micromark-walk.ts` | `await import('micromark')` in try/catch, fallback to null if ESM/CJS mismatch |
| 1.2 | Build code block region set | `src/micromark-walk.ts` | Walk token stream for `codeFenced`, `codeIndented`, `codeText` tokens → emit `CodeBlockRegion[]` (start/end byte offsets) |
| 1.3 | Filter regex results through mask | `src/hybrid-merge.ts` | `links.filter(l => !mask.blocks(l.pos))` for headings, links, tables |
| 1.4 | Replace regex code-block count | `src/hybrid-merge.ts` | `stats.codeBlocks = mask.count` instead of fragile regex `` ``` `` match |
| 1.5 | Wire into `analyzeFile()` | `src/md-analyzer.ts` | Make `analyzeFile` async or add sync fallback path |

**Test:**

```
node md-analyzer.js docs/with-code-examples.md --json
# Before: links = 12 (5 from code examples)
# After:  links = 7 (real links only)
```

---

## Phase 2 — Reference Links + Autolinks (new signal wins)

| # | Task | File | Detail |
|---|------|------|--------|
| 2.1 | Walk link/image/autolink tokens | `src/micromark-walk.ts` | Extract `link`, `image`, `autolink` token info: text, url, byte range |
| 2.2 | Merge with regex link output | `src/hybrid-merge.ts` | Append autolinks regex missed; replace reference links entries |
| 2.3 | Add `isImage` field to `Link` type | `src/md-analyzer.ts` | `interface Link { ... isImage: boolean }` — optional, backward-compat |

**Hit:**

```
# Before: autolinks = 0 (invisible), images counted as links
# After:  autolinks detected, images separated from links
```

---

## Phase 3 — Setext Headings (coverage expansion)

| # | Task | File | Detail |
|---|------|------|--------|
| 3.1 | Extract setext heading tokens | `src/micromark-walk.ts` | `setextHeading` tokens → `{ level, text, pos }` |
| 3.2 | Merge with regex heading output | `src/hybrid-merge.ts` | Append setext headings regex missed |

**Hit:**

```
# Before: headings = 8 (ATX only, missing underlined headings)
# After:  headings = 11 (ATX + setext)
```

---

## Phase 4 — Full Token-Walker Extraction (deprecation path)

| # | Task | File | Detail |
|---|------|------|--------|
| 4.1 | Extract all headings from tokens | `src/micromark-walk.ts` | Both ATX + setext from single source |
| 4.2 | Extract all links + images | `src/micromark-walk.ts` | Resolved references, autolinks, inline links |
| 4.3 | Extract all GFM tables | `src/micromark-walk.ts` | Via `micromark-extension-gfm` extension |
| 4.4 | Mark legacy regex extractors as deprecated | `src/legacy-regex.ts` | JSDoc `@deprecated Use micromark-walk instead` |

**Target:** `extractFrontmatter` + `extractWikilinks` remain regex. Everything else graduated to micromark tokens.

---

## Architecture Files

```
src/
  md-analyzer.ts          # entry — orchestrates hybrid pipeline
  legacy-regex.ts          # Phase 4: move current regex fxns here
  micromark-walk.ts        # micromark token walker + region masks
  hybrid-merge.ts          # merge logic: micromark wins, regex fills
```

---

## Dependency Changes

| Change | Package | Phase |
|--------|---------|-------|
| Move micromark to real dep (currently dead weight) | `micromark` ^4.0.0 | Phase 1 |
| Add GFM extension (optional) | `micromark-extension-gfm` | Phase 4 |
| Keep js-tiktoken, js-yaml | — | — |

---

## Acceptance Criteria

- [ ] All existing tests pass with zero output-interface changes
- [ ] Phase 1: code blocks no longer leak false links/headings/tables
- [ ] Phase 2: autolinks appear in output, images distinguished from links
- [ ] Phase 3: setext headings appear in output
- [ ] ESM import failure gracefully degrades to pure-regex mode on older Node
- [ ] No perf regression >2x on doc sets under 100 files
