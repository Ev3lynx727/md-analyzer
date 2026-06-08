---
title: "Token Budget System"
category: "proposal"
status: "draft"
---

# Agent Token Budget System

## Overview

Track and control token usage per agent session for cost optimization.

## Motivation

- LLM pricing is per-token
- Context windows have limits
- Agents need budget awareness

## Current Implementation

### Session Tracking

```typescript
interface SessionStats {
  sessionId: string
  calls: number
  totalTokens: number
  filesProcessed: number
  startTime: string
}
```

### Usage

```bash
# Track session with budget
node md-analyzer.js <dir> --session --budget 50000

# Output:
{
  "sessionId": "session-123456",
  "totalCalls": 5,
  "totalTokens": 45000,
  "budget": 50000,
  "remaining": 5000,
  "percentUsed": "90%",
  "status": "OK"
}
```

## LangGraph Integration

```python
def check_token_budget(state) -> str:
    MAX_TOKENS = 100000

    if state["tokens"] > MAX_TOKENS:
        return "reduce_scope"  # Reduce search scope
    return "continue"          # Continue normally
```

## Budget Strategies

| Strategy | Trigger | Action |
|----------|---------|--------|
| `continue` | tokens < 50% budget | Normal operation |
| `warn` | tokens > 50% budget | Log warning |
| `reduce_scope` | tokens > 80% budget | Narrow search |
| `stop` | tokens > 100% budget | Halt operation |

## Cost Estimation

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| GPT-4 | $10/1M | $30/1M | Standard |
| GPT-4 Turbo | $10/1M | $30/1M | Faster |
| Claude-3 | $15/1M | $75/1M | Large context |

## Files

- `token_budget.py` - Budget management (future)
