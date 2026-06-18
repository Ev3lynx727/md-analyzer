import * as fs from 'fs'
import * as path from 'path'
import { encodingForModel } from 'js-tiktoken'
import { SKIP_DIRS } from '../utils/constants.js'
import { extractFrontmatter, extractFragmentMeta, extractHeadings, extractLinks, extractTables, extractWikilinks } from './extractors.js'
import { countStats } from './counters.js'
import { walkCodeBlocks, walkLinks, walkHeadings, walkTables, walkFormatting } from './micromark-walk.js'
import { filterMicromarkLinks, filterMicromarkHeadings, filterMicromarkTables, countCodeBlocks, countFormatting } from './hybrid-merge.js'
import type { AnalysisResult, SectionInfo } from '../types/index.js'

export function scanMarkdownFiles(dir: string): { files: string[]; errors: string[] } {
  const files: string[] = [], errors: string[] = []
  function walk(dir: string): void {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
    catch (e: unknown) { errors.push(`permission_denied: ${dir}`); console.error('scan_error:', e instanceof Error ? e.message : e); return }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
      const fullPath = path.join(dir, entry.name)
      try {
        if (entry.isDirectory()) walk(fullPath)
        else if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath)
      } catch (e: unknown) { errors.push(`access_error: ${fullPath}`); console.error('access_error:', e instanceof Error ? e.message : e) }
    }
  }
  try { walk(dir) } catch (e: unknown) { errors.push(`scan_error: ${e instanceof Error ? e.message : 'unknown'}`); console.error('walk_error:', e instanceof Error ? e.message : e) }
  return { files, errors }
}

function computeSections(content: string, headings: { line: number }[]): SectionInfo[] {
  const bodyLines = content.split('\n')
  return headings.map((h, i) => {
    const startIdx = h.line - 1
    const endIdx = i + 1 < headings.length ? headings[i + 1].line - 1 : bodyLines.length
    const sectionText = bodyLines.slice(startIdx, endIdx).join('\n')
    let tokens = 0
    try { tokens = encodingForModel('gpt-4').encode(sectionText).length }
    catch (e: unknown) {
      console.error('section_token_fallback:', e instanceof Error ? e.message : e)
      tokens = Math.ceil(sectionText.length / 4)
    }
    return { line: h.line, tokens }
  })
}

function buildBaseResult(filePath: string, content: string, errors: string[]): AnalysisResult {
  const { metadata, content: markdownContent } = extractFrontmatter(content)
  const fragmentMeta = extractFragmentMeta(metadata)
  const headings = extractHeadings(markdownContent)
  const links = extractLinks(markdownContent)
  const wikilinks = extractWikilinks(markdownContent)
  const tables = extractTables(markdownContent)
  const counts = countStats(markdownContent)
  if (counts.tokens === 0 && !errors.includes('token_count_fallback')) {
    errors.push('token_count_fallback: tiktoken unavailable')
  }
  const sections = computeSections(markdownContent, headings)
  const fileName = path.basename(filePath, '.md')
  return {
    file: filePath, fileName, metadata, fragmentMeta, headings, sections, links, wikilinks, tables,
    stats: {
      totalHeadings: headings.length, totalLinks: links.length,
      internalLinks: links.filter(l => l.isInternal).length,
      externalLinks: links.filter(l => !l.isInternal).length,
      totalWikilinks: wikilinks.length, wordCount: counts.wordCount,
      charCount: counts.charCount, lineCount: counts.lineCount,
      codeBlocks: counts.codeBlocks, tables: tables.length,
      tokens: counts.tokens, errors: errors.length > 0 ? errors : undefined
    }
  }
}

export function analyzeFile(filePath: string): AnalysisResult {
  const errors: string[] = []
  let content = ''
  try { content = fs.readFileSync(filePath, 'utf-8') }
  catch (e: unknown) {
    errors.push(`file_read_error: ${e instanceof Error ? e.message : 'unknown'}`)
    return {
      file: filePath, fileName: path.basename(filePath, '.md'), metadata: null, fragmentMeta: null,
      headings: [], sections: [], links: [], wikilinks: [], tables: [],
      stats: { totalHeadings: 0, totalLinks: 0, internalLinks: 0, externalLinks: 0, totalWikilinks: 0, wordCount: 0, charCount: 0, lineCount: 0, codeBlocks: 0, tables: 0, tokens: 0, errors }
    }
  }
  return buildBaseResult(filePath, content, errors)
}

export function analyzeFileWithMicromark(filePath: string): AnalysisResult {
  const errors: string[] = []

  let content = ''
  try { content = fs.readFileSync(filePath, 'utf-8') }
  catch (e: unknown) {
    errors.push(`file_read_error: ${e instanceof Error ? e.message : 'unknown'}`)
    return {
      file: filePath, fileName: path.basename(filePath, '.md'), metadata: null, fragmentMeta: null,
      headings: [], sections: [], links: [], wikilinks: [], tables: [],
      stats: { totalHeadings: 0, totalLinks: 0, internalLinks: 0, externalLinks: 0, totalWikilinks: 0, wordCount: 0, charCount: 0, lineCount: 0, codeBlocks: 0, tables: 0, tokens: 0, errors }
    }
  }

  const { content: markdownContent } = extractFrontmatter(content)

  try {
    const regions = walkCodeBlocks(markdownContent)
    const mmLinks = walkLinks(markdownContent)
    const mmHeadings = walkHeadings(markdownContent)
    const mmTables = walkTables(markdownContent)
    const mmFormatting = walkFormatting(markdownContent)

    if (mmLinks === null) errors.push('walkLinks_failed')
    if (mmHeadings === null) errors.push('walkHeadings_failed')
    if (mmTables === null) errors.push('walkTables_failed')
    if (mmFormatting === null) errors.push('walkFormatting_failed')

    const safeRegions = regions ?? []
    const result = buildBaseResult(filePath, content, errors)

    result.links = filterMicromarkLinks(mmLinks ?? [], safeRegions)
    result.stats.totalLinks = result.links.length
    result.stats.internalLinks = result.links.filter(l => l.isInternal).length
    result.stats.externalLinks = result.links.filter(l => !l.isInternal).length

    result.headings = filterMicromarkHeadings(mmHeadings ?? [], safeRegions, markdownContent)
    result.sections = computeSections(markdownContent, result.headings)
    result.stats.totalHeadings = result.headings.length

    result.tables = filterMicromarkTables(mmTables ?? [], safeRegions, markdownContent)
    result.stats.tables = result.tables.length

    result.stats.codeBlocks = countCodeBlocks(regions)

    const fmt = countFormatting(mmFormatting, markdownContent, safeRegions)
    result.stats.boldCount = fmt.boldCount
    result.stats.italicCount = fmt.italicCount
    result.stats.bulletCount = fmt.bulletCount

    result.stats.errors = errors.length > 0 ? errors : undefined

    return result
  } catch (e) {
    errors.push(`micromark_pipeline_failed: ${e instanceof Error ? e.message : 'unknown'}`)
    return buildBaseResult(filePath, content, errors)
  }
}
