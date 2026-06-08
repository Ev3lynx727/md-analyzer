---
title: "MCP Server Wrapper Proposal"
category: "proposal"
status: "draft"
---

# MCP Server Wrapper

## Overview

Expose md-analyzer as an MCP (Model Context Protocol) server for direct agent tool calls.

## Motivation

- Agents can call md-analyzer via MCP protocol
- Standardized tool interface
- Works with Claude, OpenAI, LangChain agents

## Implementation

### Server Structure

```python
from mcp.server import Server
from mcp.types import Tool, TextContent

app = Server("md-analyzer")

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="analyze_docs",
            description="Analyze markdown documents",
            inputSchema={
                "type": "object",
                "properties": {
                    "directory": {"type": "string"},
                    "keypoints": {"type": "boolean"},
                    "search": {"type": "string"},
                }
            }
        ),
        Tool(
            name="get_keypoints",
            description="Extract key points from documents",
            inputSchema={...}
        ),
        Tool(
            name="get_backlinks",
            description="Find documents referencing a doc",
            inputSchema={...}
        ),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    # Execute md-analyzer CLI
    result = subprocess.run([...])
    return [TextContent(type="text", text=result.stdout)]
```

### Agent Usage

```python
# In LangChain agent
from langchain.agents import load_tools

tools = load_tools(["mcp"], server_url="http://localhost:8080")

agent = AgentExecutor(agent=agent, tools=tools)
agent.run("Find docs about task lifecycle")
```

## Benefits

- Standard MCP protocol
- Works with any MCP-compatible agent
- Tool discovery via list_tools
- Streaming support

## Files

- `mcp_server.py` - Server implementation (future)
