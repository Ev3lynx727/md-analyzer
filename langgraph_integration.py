#!/usr/bin/env python3
"""
LangGraph Agent with md-analyzer integration
Example workflow for document analysis
"""

from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
import subprocess
import json
import os

# Configuration - loaded from hooks.toml or environment variables
import tomllib

def load_config():
    """Load configuration from hooks.toml with environment variable overrides."""
    config_path = os.path.join(os.path.dirname(__file__), "hooks.toml")

    try:
        with open(config_path, "rb") as f:
            config = tomllib.load(f)
        tool_config = config.get("tool", {}).get("md-analyzer", {}).get("config", {})
    except (FileNotFoundError, KeyError):
        tool_config = {}

    # Read max_results_default from hooks.toml
    max_results_default = tool_config.get("max_results_default", 20)

    return {
        "tool_path": os.environ.get("MD_ANALYZER_PATH",
                                      tool_config.get("tool_path", "md-analyzer.js")),
        "default_directory": os.environ.get("MD_ANALYZER_DEFAULT_DIR",
                                               tool_config.get("default_directory", ".")),
        "max_tokens": int(os.environ.get("MD_ANALYZER_MAX_TOKENS",
                                          str(tool_config.get("max_tokens", 200000)))),
        "default_budget": int(os.environ.get("MD_ANALYZER_DEFAULT_BUDGET",
                                              str(tool_config.get("default_budget", 100000)))),
        "max_results": int(os.environ.get("MD_ANALYZER_MAX_RESULTS",
                                           str(max_results_default))),
    }

CONFIG = load_config()

class DocAnalysisState(TypedDict):
    query: str
    directory: str
    docs: List[dict]
    keypoints: List[dict]
    graph: dict
    tokens: int
    session: dict
    errors: List[str]

class MDAnalyzerTool:
    """Wrapper for md-analyzer CLI tool"""

    def __init__(self, tool_path: str = None):
        self.tool_path = tool_path or CONFIG["tool_path"]

    def run(self, directory: str, **kwargs) -> dict:
        args = ["node", self.tool_path, directory, "--json"]

        for key, value in kwargs.items():
            if value is True:
                args.append(f"--{key}")
            elif value:
                args.extend([f"--{key}", str(value)])

        result = subprocess.run(args, capture_output=True, text=True)

        if result.returncode != 0:
            return {"error": result.stderr}

        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError as e:
            return {"error": f"JSON parse error: {e}"}

# LangGraph Nodes
def analyze_docs(state: DocAnalysisState) -> DocAnalysisState:
    """Node: Analyze all documents in directory"""
    tool = MDAnalyzerTool()
    result = tool.run(state["directory"], keypoints=True)

    if "error" in result:
        state["errors"].append(result["error"])
    else:
        state["docs"] = result if isinstance(result, list) else [result]
        state["tokens"] = sum(d.get("stats", {}).get("tokens", 0) for d in state["docs"])

    return state

def search_docs(state: DocAnalysisState) -> DocAnalysisState:
    """Node: Search documents by query"""
    if not state.get("query"):
        return state

    tool = MDAnalyzerTool()
    result = tool.run(
        state["directory"],
        search=state["query"],
        rank=True,
        keypoints=True
    )

    if "error" not in result:
        state["docs"] = result if isinstance(result, list) else [result]

    return state

def extract_keypoints(state: DocAnalysisState) -> DocAnalysisState:
    """Node: Extract key points from documents"""
    if not state.get("docs"):
        return state

    state["keypoints"] = [
        {
            "fileName": doc.get("fileName"),
            "title": doc.get("title"),
            "summary": doc.get("summary"),
            "readingTime": doc.get("readingTime")
        }
        for doc in state["docs"]
    ]

    return state

def build_graph(state: DocAnalysisState) -> DocAnalysisState:
    """Node: Build document relationship graph"""
    tool = MDAnalyzerTool()
    result = tool.run(state["directory"], graph=True)

    if "error" not in result:
        state["graph"] = result

    return state

def check_token_budget(state: DocAnalysisState) -> str:
    """Conditional edge: Check if within token budget"""
    MAX_TOKENS = CONFIG["max_tokens"]

    if state.get("tokens", 0) > MAX_TOKENS:
        return "reduce_scope"
    return "continue"

# Build LangGraph
def create_doc_analysis_graph() -> StateGraph:
    workflow = StateGraph(DocAnalysisState)

    workflow.add_node("analyze", analyze_docs)
    workflow.add_node("search", search_docs)
    workflow.add_node("keypoints", extract_keypoints)
    workflow.add_node("graph", build_graph)

    workflow.set_entry_point("analyze")

    workflow.add_conditional_edges(
        "analyze",
        check_token_budget,
        {
            "reduce_scope": "search",
            "continue": "keypoints"
        }
    )

    workflow.add_edge("search", "keypoints")
    workflow.add_edge("keypoints", "graph")
    workflow.add_edge("graph", END)

    return workflow.compile()

# Usage Example
if __name__ == "__main__":
    # Create graph
    graph = create_doc_analysis_graph()

    # Initial state - uses config defaults
    initial_state = {
        "query": "task lifecycle",
        "directory": CONFIG["default_directory"],
        "docs": [],
        "keypoints": [],
        "graph": {},
        "tokens": 0,
        "session": {},
        "errors": []
    }

    # Run workflow
    result = graph.invoke(initial_state)

    print(f"Documents analyzed: {len(result['docs'])}")
    print(f"Total tokens: {result['tokens']}")
    print(f"Key points extracted: {len(result['keypoints'])}")
    print(f"Graph nodes: {len(result.get('graph', {}).get('nodes', {}))}")
