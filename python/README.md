# pre_read.py

LLM context-injection hook for preToolUse events. Before an agent reads a .md or .txt file, this script prints a structured outline so the LLM can preview structure without consuming context on the full content.

## Design

Two-tier analysis:

- **Primary**: `md-analyzer --keypoints` — rich output with tokens, links, reading time, key headings
- **Fallback**: PyYAML frontmatter + heading extraction — lightweight when md-analyzer is unavailable or misses
- **.txt**: line count + first non-empty lines preview

## Architecture

```
event JSON (stdin)
  -> filter: tool_name in (read, fs_read), whitelisted path
  -> group .md files by parent directory
  -> ThreadPoolExecutor: one md-analyzer call per dir
  -> output in original path order
  -> unmatched .md -> fallback_outline()
  -> .txt -> preview
```

Key design decisions:

- **Early exit** on non-matching tools avoids unnecessary imports
- **Parallel analysis** via ThreadPoolExecutor (max 4 workers) — one md-analyzer subprocess per directory
- **Order-preserving output** via an index map; results sorted back to match the original read order
- **Size gate** (4KB minimum) skips trivial files where the overhead outweighs benefit
- **Whitelist** (name-based + path-pattern) prevents processing unrelated content

## Dependencies

- `PyYAML` — frontmatter parsing (fallback path)
- `md-analyzer` CLI — primary analysis (optional; script degrades gracefully)

## Usage

```json
// opnecode.json hook config
{
  "preToolUse": [
    {
      "matcher": {"tool_name": "read"},
      "command": "uv run --project ~/.kiro/hooks python ~/.kiro/hooks/pre_read_md.py"
    }
  ]
}
```

## Token-aware selective reading

The outline enables the LLM to make informed skip/read decisions before committing context.

### Real-world test

Tested across two agentic frameworks (opencode, kiro-cli) reading the same 810-line document about ChatGPT Dreaming V3:

```
[pre-read outline] openai-chatgpt-memory-dreaming.md (810 lines, ~7500 tokens)
  sections:
    # Dreaming V3 ...  L[22:133] ~1517t
    ## Before/After ... L[134:462] ~2100t
    ## Demo ...         L[463:810] ~2400t
```

The LLM's response:

> *"Already have the outline — 3 sections. The intro (~1517t) has the substance, the rest is demos. Reading selectively: Read L22-133"*

**Result**: ~6000 tokens saved by skipping two demo sections that added no new concepts.

### When it helps most

| Document type | Typical savings |
|---|---|
| Long-form demos / tutorials | 60-80% |
| RFCs / design docs | 40-60% |
| Configuration references | 20-40% |
| Small notes (< 4KB) | skipped by size gate |

## Related

- `./pre_read.py` — the hook script
- `md-analyzer` — Node.js CLI that powers the primary path (keypoints includes tokens, links, formatting counts)
