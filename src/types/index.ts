export interface Link {
  text: string
  url: string
  isInternal: boolean
  fileName: string | null
}

export interface Wikilink {
  target: string
  display: string | null
}

export interface Heading {
  level: number
  text: string
  line: number
}

export interface Table {
  headers: string[]
  rows: string[][]
}

export interface FragmentMeta {
  title: string
  description: string | null
  tags: string[]
  depends_on: string[]
  status: string | null
  source: string | null
  order: number | null
  date_iso: string | null
}

export interface Stats {
  totalHeadings: number
  totalLinks: number
  internalLinks: number
  externalLinks: number
  totalWikilinks: number
  wordCount: number
  charCount: number
  lineCount: number
  codeBlocks: number
  tables: number
  tokens: number
  errors?: string[]
}

export interface SectionInfo {
  line: number
  tokens: number
}

export interface AnalysisResult {
  file: string
  fileName: string
  metadata: Record<string, unknown> | null
  fragmentMeta: FragmentMeta | null
  headings: Heading[]
  sections: SectionInfo[]
  links: Link[]
  wikilinks: Wikilink[]
  tables: Table[]
  stats: Stats
}

export interface GraphNode {
  inbound: string[]
  outbound: string[]
}

export interface Graph {
  nodes: Record<string, GraphNode>
  edges: { source: string; target: string; type: string }[]
}

export interface SessionStats {
  sessionId: string
  calls: number
  totalTokens: number
  filesProcessed: number
  startTime: string
}

export interface RunLog {
  timestamp: string
  sessionId: string
  directory: string
  flags: string[]
  filesFound: number
  filesProcessed: number
  tokensThisCall: number
  totalSessionTokens: number
  errors: string[]
  durationMs: number
  mode: string
}

export interface AnalyzerConfig {
  default_directory: string
  default_budget: number
  max_tokens: number
  max_results_default: number
  session_file: string
}
