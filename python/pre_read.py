#!/usr/bin/env python3
"""
preToolUse hook: before reading a .md or .txt file, inject a structured
overview into LLM context.

Primary:  md-analyzer --keypoints (rich: tokens, links, reading time)
Fallback: PyYAML frontmatter + heading extraction (when md-analyzer misses)
.txt:     line count + first non-empty lines preview
"""
import json, sys, subprocess, re
import yaml
from pathlib import Path

event = json.load(sys.stdin)

if event.get("tool_name") not in ("read", "fs_read"):
    sys.exit(0)

WHITELIST_NAMES = {
    "AGENTS.md", "README.md", "CONTRIBUTING.md", "CHANGELOG.md",
    "ARCHITECTURE.md", "ROADMAP.md", "DESIGN.md", "OVERVIEW.md",
    "SKILL.md", "SKILLS.md", "STEERING.md",
    "SPEC.md", "TODO.md", "NOTES.md", "DECISIONS.md",
    "ADR.md", "HACKING.md", "DEVELOPMENT.md", "SETUP.md", "INSTALL.md",
}

WHITELIST_PATHS = (
    "docs/", "documentation/", ".kiro/", "steering/", "skills/",
    "dev/kiro-", "adr/", "rfcs/", "specs/", "headquarters/",
)

def is_whitelisted(path: str) -> bool:
    p = Path(path)
    if p.suffix not in {".md", ".txt"}:
        return False
    if p.name in WHITELIST_NAMES:
        return True
    return any(pat in path for pat in WHITELIST_PATHS)

def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Extract YAML frontmatter, return (meta_dict, body)."""
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    try:
        meta = yaml.safe_load(text[3:end]) or {}
        return (meta if isinstance(meta, dict) else {}), text[end + 4:]
    except yaml.YAMLError:
        return {}, text[end + 4:]

def extract_headings(text: str) -> list[tuple[int, str, int]]:
    """Returns (level, title, line_number) — 1-indexed."""
    return [
        (len(m.group(1)), m.group(2).strip(), text[:m.start()].count("\n") + 1)
        for m in re.finditer(r"^(#{1,3}) (.+)$", text, re.MULTILINE)
    ]

def estimate_tokens(text: str) -> int:
    """Fast approximation: chars / 4 (no tiktoken dependency)."""
    return max(1, len(text) // 4)

def _section_bounds(
    i: int, headings: list[tuple[int, str, int]], fm_lines: int, total_lines: int,
) -> tuple[int, int]:
    """Return (abs_start, abs_end) for section at index i.

    Both are 1-indexed absolute line numbers. The end is exclusive of the
    next heading's line, so sections don't overlap.
    """
    abs_start = fm_lines + headings[i][2]
    if i + 1 < len(headings):
        abs_end = fm_lines + headings[i + 1][2] - 1
    else:
        abs_end = total_lines
    return abs_start, abs_end

def fallback_outline(path: Path) -> None:
    """PyYAML-based outline with line ranges + token estimates per section."""
    text = path.read_text(errors="ignore")
    meta, body = parse_frontmatter(text)
    fm_offset = len(text) - len(body)
    fm_lines = text[:fm_offset].count("\n")

    headings = extract_headings(body)
    body_lines = body.splitlines()
    total_lines = len(text.splitlines())
    total_tokens = estimate_tokens(body)

    print(f"[pre-read outline] {path} ({total_lines} lines, ~{total_tokens} tokens)")
    if meta:
        for k, v in list(meta.items())[:6]:
            print(f"  {k}: {v}")
    if headings:
        print("  sections:")
        for i, (level, title, rel_line) in enumerate(headings[:15]):
            abs_start, abs_end = _section_bounds(i, headings, fm_lines, total_lines)
            section_text = "\n".join(body_lines[rel_line - 1 : abs_end - fm_lines])
            sec_tokens = estimate_tokens(section_text)
            print(f"    {'#' * level} {title}  L[{abs_start}:{abs_end}] ~{sec_tokens}t")
        if len(headings) > 15:
            print(f"    ... {len(headings) - 15} more sections")
    print()

ops = event.get("tool_input", {}).get("operations", [])
paths = [
    op["path"] for op in ops
    if op.get("mode") == "Line" and is_whitelisted(op.get("path", ""))
]

if not paths:
    sys.exit(0)

from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

valid = [Path(p) for p in paths if Path(p).exists() and Path(p).stat().st_size >= 4096]

dir_groups: dict = defaultdict(list)
txt_paths = []
for p in valid:
    if p.suffix == ".md":
        dir_groups[p.parent].append(p)
    elif p.suffix == ".txt":
        txt_paths.append(p)

def print_keypoints(match: dict, path: Path) -> None:
    print(f"[md-analyzer keypoints] {path}")
    print(f"  title:    {match.get('title', path.stem)}")
    s = match.get("summary", {})
    print(f"  tokens:   {s.get('totalTokens','?')}  words: {s.get('wordCount','?')}  reading: {match.get('readingTime','?')}")
    print(f"  headings: {s.get('totalHeadings','?')}  links: {s.get('totalLinks','?')}")
    for h in (match.get("keyHeadings") or [])[:8]:
        print(f"    {'#' * h.get('level', 1)} {h.get('text', '?')}")
    if match.get("metadata"):
        print(f"  frontmatter: {json.dumps(match['metadata'])}")
    print()

def _find_match(data: list[dict], stem: str) -> dict | None:
    for d in data:
        if d.get("fileName", "") == stem:
            return d
    for d in data:
        if stem in d.get("fileName", ""):
            return d
    return None

def analyze_dir(parent_dir: Path, files: list[Path]) -> list[tuple[Path, dict | None]]:
    stems = {p.stem: p for p in files}
    result = subprocess.run(
        ["md-analyzer", str(parent_dir), "--keypoints", "--json",
         "--max-results", str(len(files) * 3)],
        capture_output=True, text=True
    )
    out: list[tuple[Path, dict | None]] = []
    if result.returncode == 0:
        try:
            data = json.loads(result.stdout)
            for stem, p in stems.items():
                out.append((p, _find_match(data, stem)))
            return out
        except json.JSONDecodeError:
            pass
    return [(p, None) for p in files]

results: list[tuple] = []
with ThreadPoolExecutor(max_workers=min(len(dir_groups), 4)) as ex:
    futures = {ex.submit(analyze_dir, d, f): d for d, f in dir_groups.items()}
    for future in as_completed(futures):
        results.extend(future.result())

order = {p: i for i, p in enumerate(valid)}
for p, match in sorted(results, key=lambda x: order.get(x[0], 999)):
    if match:
        print_keypoints(match, p)
    else:
        fallback_outline(p)

for p in txt_paths:
    lines = p.read_text(errors="ignore").splitlines()
    print(f"[pre-read preview] {p} ({len(lines)} lines)")
    for line in lines[:3]:
        if line.strip():
            print(f"  {line.strip()[:120]}")
    print()
