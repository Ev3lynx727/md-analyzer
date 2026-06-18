---
name: md-analyzer
description: Injects md-analyzer --keypoints outline before every read tool call
metadata:
  openclaw:
    emoji: 📝
    events: ["before_tool_call"]
---

# md-analyzer Hook

Injects `md-analyzer --keypoints` outline before every `read` tool call. The LLM sees token counts, headings, links, and formatting stats before committing context to the full file.

## Behavior

On `before_tool_call` with tool=`read`:

1. Checks if the target path is `.md` or `.txt`
2. Runs `md-analyzer --keypoints --json` on the file
3. Prints the structured outline to stdout
4. Subsequent reads of the same file use the in-memory cache

## Install

```bash
cp -r plugins/openclaw-md-analyzer ~/.openclaw/hooks/md-analyzer
```

Enable in `~/.openclaw/openclaw.json`:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "md-analyzer": {
          "enabled": true
        }
      }
    }
  }
}
```

## Requirements

- `md-analyzer` CLI in PATH

## Cache

Keypoints are cached in memory per session to avoid redundant `md-analyzer` calls on repeated reads of the same file.
