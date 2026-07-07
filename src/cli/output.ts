import * as fs from 'fs'
import * as path from 'path'
import { LOG_DIR } from '../utils/constants.js'
import type { AnalysisResult, RunLog } from '../types/index.js'

export function extractKeyPoints(doc: AnalysisResult): object {
  return {
    fileName: doc.fileName, title: doc.headings[0]?.text || doc.fileName, level: doc.headings[0]?.level || 1,
    summary: {
      totalHeadings: doc.stats.totalHeadings, totalLinks: doc.stats.totalLinks, totalWikilinks: doc.stats.totalWikilinks,
      totalTokens: doc.stats.tokens, wordCount: doc.stats.wordCount,
      boldCount: doc.stats.boldCount ?? 0, italicCount: doc.stats.italicCount ?? 0, bulletCount: doc.stats.bulletCount ?? 0
    },
    keyHeadings: doc.headings.slice(0, 10).map((h, i) => ({
      level: h.level, text: h.text, line: h.line,
      tokens: doc.sections?.[i]?.tokens ?? 0
    })),
    importantLinks: doc.links.filter(l => !l.isInternal).slice(0, 3).map(l => ({ text: l.text, url: l.url })),
    internalReferences: doc.links.filter(l => l.isInternal && l.fileName).slice(0, 5).map(l => l.fileName),
    metadata: doc.metadata, readingTime: Math.ceil(doc.stats.wordCount / 200) + ' min'
  }
}

export function buildSummary(results: AnalysisResult[], totalTokens: number, durationMs: number): object {
  const count = results.length
  if (count === 0) return { files: 0, durationMs }

  const sum = (fn: (r: AnalysisResult) => number) => results.reduce((a, r) => a + fn(r), 0)
  const avg = (fn: (r: AnalysisResult) => number) => sum(fn) / count

  let largestFile = results[0], smallestFile = results[0]
  let mostHeadings = results[0], mostLinks = results[0], mostTokens = results[0]

  for (const r of results) {
    if (r.stats.tokens > mostTokens.stats.tokens) mostTokens = r
    if (r.stats.totalHeadings > mostHeadings.stats.totalHeadings) mostHeadings = r
    if (r.stats.totalLinks > mostLinks.stats.totalLinks) mostLinks = r
    if (r.stats.tokens < smallestFile.stats.tokens) smallestFile = r
    if (r.stats.tokens > largestFile.stats.tokens) largestFile = r
  }

  return {
    files: count,
    durationMs,
    totalTokensThisCall: totalTokens,
    totals: {
      headings: sum(r => r.stats.totalHeadings),
      links: sum(r => r.stats.totalLinks),
      internalLinks: sum(r => r.stats.internalLinks),
      externalLinks: sum(r => r.stats.externalLinks),
      wikilinks: sum(r => r.stats.totalWikilinks),
      tokens: sum(r => r.stats.tokens),
      words: sum(r => r.stats.wordCount),
      chars: sum(r => r.stats.charCount),
      codeBlocks: sum(r => r.stats.codeBlocks),
      tables: sum(r => r.stats.tables),
      bold: sum(r => r.stats.boldCount ?? 0),
      italic: sum(r => r.stats.italicCount ?? 0),
      bullets: sum(r => r.stats.bulletCount ?? 0)
    },
    averages: {
      headings: +avg(r => r.stats.totalHeadings).toFixed(1),
      links: +avg(r => r.stats.totalLinks).toFixed(1),
      tokens: Math.round(avg(r => r.stats.tokens)),
      words: Math.round(avg(r => r.stats.wordCount)),
      readingTimeMin: Math.round(sum(r => r.stats.wordCount) / 200)
    },
    extremes: {
      largestFile: { file: largestFile.fileName, tokens: largestFile.stats.tokens },
      smallestFile: { file: smallestFile.fileName, tokens: smallestFile.stats.tokens },
      mostHeadings: { file: mostHeadings.fileName, count: mostHeadings.stats.totalHeadings },
      mostLinks: { file: mostLinks.fileName, count: mostLinks.stats.totalLinks },
      mostTokens: { file: mostTokens.fileName, tokens: mostTokens.stats.tokens }
    }
  }
}

export function writeRunLog(log: RunLog): void {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    const logFile = path.join(LOG_DIR, `${log.sessionId}.json`)
    const existing: RunLog[] = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf-8')) : []
    existing.push(log)
    fs.writeFileSync(logFile, JSON.stringify(existing, null, 2))
  } catch (e: unknown) {
    console.error('run_log_write_error:', e instanceof Error ? e.message : e)
  }
}
