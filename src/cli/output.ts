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
