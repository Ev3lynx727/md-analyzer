import * as fs from 'fs'
import * as path from 'path'
import { CACHE_FILE } from '../utils/constants.js'
import type { AnalysisResult } from '../types/index.js'

interface CacheEntry {
  mtimeMs: number
  size: number
  cachedAt: number
  result: AnalysisResult
}

interface CacheStore {
  version: number
  entries: Record<string, CacheEntry>
}

function loadCache(): CacheStore {
  try {
    if (!fs.existsSync(CACHE_FILE)) return { version: 1, entries: {} }
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
  } catch {
    return { version: 1, entries: {} }
  }
}

function saveCache(store: CacheStore): void {
  try {
    const dir = path.dirname(CACHE_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store))
  } catch (e: unknown) {
    console.error('cache_write_error:', e instanceof Error ? e.message : e)
  }
}

export function analyzeFileCached(file: string, analyze: (f: string) => AnalysisResult, fallback: (f: string) => AnalysisResult): AnalysisResult {
  const store = loadCache()
  const stat = fs.statSync(file)
  const key = fs.realpathSync(file)
  const cached = store.entries[key]
  const maxAge = 1000 * 60 * 60 * 24
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size && cached.cachedAt) {
    return cached.result
  }
  let result: AnalysisResult
  try {
    result = analyze(file)
  } catch {
    result = fallback(file)
  }
  store.entries[key] = { mtimeMs: stat.mtimeMs, size: stat.size, cachedAt: Date.now(), result }
  // prune stale entries periodically by cachedAt
  const now = Date.now()
  for (const [k, v] of Object.entries(store.entries)) {
    if (now - v.cachedAt > maxAge) delete store.entries[k]
  }
  saveCache(store)
  return result
}
