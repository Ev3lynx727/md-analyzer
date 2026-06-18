import type { Plugin } from "@opencode-ai/plugin"

interface Heading {
  level: number
  text: string
  line: number
  tokens: number
}

interface CachedResult {
  title: string
  tokens: number
  words: number
  readingTime: string
  headings: number
  links: number
  boldCount: number
  italicCount: number
  bulletCount: number
  keyHeadings: Heading[]
}

interface PluginConfig {
  whitelist_names: string[]
  whitelist_paths: string[]
  exclude_paths: string[]
}

const DEFAULTS: PluginConfig = {
  whitelist_names: [
    "AGENTS.md", "CLAUDE.md", "GEMINI.md", "SKILL.md", "SKILLS.md",
    "README.md", "CONTRIBUTING.md", "CHANGELOG.md",
    "ARCHITECTURE.md", "ROADMAP.md", "DESIGN.md", "OVERVIEW.md",
    "STEERING.md", "SPEC.md", "TODO.md", "NOTES.md", "DECISIONS.md",
    "ADR.md", "HACKING.md", "DEVELOPMENT.md", "SETUP.md", "INSTALL.md",
    "CURSOR.md", "WINDSURF.md", "COPILOT.md",
  ],
  whitelist_paths: [
    "docs/", "documentation/", "steering/", "skills/",
    "adr/", "rfcs/", "specs/", ".kiro/", ".cursor/", ".windsurf/",
  ],
  exclude_paths: [
    "headquarters/",
  ],
}

async function loadConfig(): Promise<PluginConfig> {
  try {
    const url = new URL("config.json", import.meta.url)
    const file = Bun.file(url.pathname)
    if (file.size === 0) return DEFAULTS
    const raw = await file.text()
    const parsed = JSON.parse(raw)
    return {
      whitelist_names: Array.isArray(parsed.whitelist_names) ? parsed.whitelist_names : DEFAULTS.whitelist_names,
      whitelist_paths: Array.isArray(parsed.whitelist_paths) ? parsed.whitelist_paths : DEFAULTS.whitelist_paths,
      exclude_paths: Array.isArray(parsed.exclude_paths) ? parsed.exclude_paths : DEFAULTS.exclude_paths,
    }
  } catch {
    return DEFAULTS
  }
}

const RESULT_CACHE = new Map<string, CachedResult>()

function getPath(args: Record<string, unknown>): string | undefined {
  return (args?.filePath ?? args?.path) as string | undefined
}

function isNamedFile(path: string, names: Set<string>): boolean {
  return names.has(path.split("/").pop() ?? path)
}

function isWhitelisted(path: string, cfg: PluginConfig): boolean {
  const excludeSet = new Set(cfg.exclude_paths)
  for (const ex of excludeSet) {
    if (path.includes(ex)) return false
  }
  const nameSet = new Set(cfg.whitelist_names)
  if (nameSet.has(path.split("/").pop() ?? path)) return true
  for (const prefix of cfg.whitelist_paths) {
    if (path.includes(prefix)) return true
  }
  return path.endsWith(".md") || path.endsWith(".txt")
}

function formatKeypoints(path: string, r: CachedResult, full: boolean): string {
  const out: string[] = []
  out.push(`── md-analyzer: ${path} ──`)
  const parts: string[] = []
  parts.push(`${r.tokens} tokens`)
  parts.push(`${r.words} words`)
  parts.push(`${r.readingTime}`)
  out.push(`  ${parts.join("  ·  ")}`)
  const fmt = []
  if (r.headings) fmt.push(`${r.headings} headings`)
  if (r.links) fmt.push(`${r.links} links`)
  if (r.boldCount) fmt.push(`${r.boldCount} bold`)
  if (r.italicCount) fmt.push(`${r.italicCount} italic`)
  if (r.bulletCount) fmt.push(`${r.bulletCount} bullets`)
  if (fmt.length) out.push(`  ${fmt.join("  ·  ")}`)
  for (let i = 0; i < Math.min(r.keyHeadings.length, 8); i++) {
    const h = r.keyHeadings[i]
    const next = r.keyHeadings[i + 1]
    const lineStart = h.line
    const lineEnd = next ? next.line - 1 : ""
    const suffix = lineEnd !== "" ? `L<${lineStart}:${lineEnd}> ~${h.tokens}t` : `L<${lineStart}> ~${h.tokens}t`
    out.push(`  ${"#".repeat(h.level)} ${h.text}  ${suffix}`)
  }
  if (full) {
    out.push("── file content ──────────────────")
  }
  return out.join("\n")
}

function parseKeypoints(raw: string): CachedResult | null {
  try {
    const data = JSON.parse(raw)
    const entry = Array.isArray(data) ? data[0] : data
    if (!entry || !entry.summary) return null
    const s = entry.summary
    return {
      title: entry.title ?? entry.fileName ?? "untitled",
      tokens: s.totalTokens ?? s.tokens ?? 0,
      words: s.wordCount ?? 0,
      readingTime: entry.readingTime ?? "?",
      headings: s.totalHeadings ?? 0,
      links: s.totalLinks ?? 0,
      boldCount: s.boldCount ?? 0,
      italicCount: s.italicCount ?? 0,
      bulletCount: s.bulletCount ?? 0,
      keyHeadings: (entry.keyHeadings ?? []).map((h: { level?: number; text?: string; line?: number; tokens?: number }) => ({
        level: h.level ?? 1,
        text: h.text ?? "?",
        line: h.line ?? 0,
        tokens: h.tokens ?? 0,
      })),
    }
  } catch {
    return null
  }
}

export const MdAnalyzerPlugin: Plugin = async ({ $ }) => {
  const cfg = await loadConfig()
  const nameSet = new Set(cfg.whitelist_names)

  return {
    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase()
      if (tool !== "read" && tool !== "filesystem_read_text_file") return

      const args = output?.args as Record<string, unknown> | undefined
      if (!args) return
      const path = getPath(args)
      if (!path || !isWhitelisted(path, cfg)) return

      if (RESULT_CACHE.has(path)) return

      try {
        const result = await $`md-analyzer ${path} --keypoints --json`.quiet().nothrow()
        const raw = String(result.stdout).trim()
        if (raw) {
          const parsed = parseKeypoints(raw)
          if (parsed) RESULT_CACHE.set(path, parsed)
        }
      } catch {
        // md-analyzer unavailable — read proceeds normally
      }
    },

    "tool.execute.after": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase()
      if (tool !== "read" && tool !== "filesystem_read_text_file") return
      if (!output?.output) return

      const path = getPath((input?.args ?? {}) as Record<string, unknown>)
      if (!path) return
      const cached = RESULT_CACHE.get(path)
      if (!cached) return

      const named = isNamedFile(path, nameSet)
      const banner = formatKeypoints(path, cached, !named)
      output.output = named ? banner : banner + "\n" + output.output
    },
  }
}

export default MdAnalyzerPlugin
