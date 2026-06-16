export { analyzeFile, scanMarkdownFiles } from './core/analyzer.js'
export { buildGraph, findOrphans, findBacklinks } from './core/graph.js'
export { searchContent, filterByMetadata, rankByRelevance } from './core/search.js'
export { getFragmentHealth } from './core/health.js'
export { loadSession, saveSession, updateSessionStats, getTokenBudgetReport } from './core/session.js'
export { countStats } from './core/counters.js'
export { extractFrontmatter, extractFragmentMeta, extractHeadings, extractLinks, extractWikilinks, extractTables } from './core/extractors.js'

export type {
  Link, Wikilink, Heading, Table, FragmentMeta, Stats, SectionInfo,
  AnalysisResult, GraphNode, Graph, SessionStats, RunLog, AnalyzerConfig
} from './types/index.js'
