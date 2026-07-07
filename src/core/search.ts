import * as fs from 'fs'
import * as cp from 'child_process'
import type { AnalysisResult } from '../types/index.js'

let _rgAvailable: boolean | null = null

function isRgAvailable(): boolean {
  if (_rgAvailable === null) {
    try { cp.execSync('rg --version', { stdio: 'ignore' }); _rgAvailable = true }
    catch { _rgAvailable = false }
  }
  return _rgAvailable
}

export function searchContent(results: AnalysisResult[], keyword: string): AnalysisResult[] {
  const kw = keyword.toLowerCase()
  const files = results.map(r => r.file)
  if (files.length === 0) return []

  if (!isRgAvailable()) {
    return results.filter(doc => {
      const content = fs.readFileSync(doc.file, 'utf-8').toLowerCase()
      return content.includes(kw)
    })
  }

  try {
    const out = cp.execFileSync('rg', ['-ilF', kw, ...files], { encoding: 'utf-8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 })
    const matched = new Set(out.trim().split('\n').filter(Boolean))
    return results.filter(r => matched.has(r.file))
  } catch {
    return []
  }
}

export function filterByMetadata(results: AnalysisResult[], key: string, value: string): AnalysisResult[] {
  return results.filter(doc => doc.metadata && String(doc.metadata[key] || '') === value)
}

export function rankByRelevance(results: AnalysisResult[], keyword: string): AnalysisResult[] {
  const kw = keyword.toLowerCase()
  const files = results.map(r => r.file)
  if (files.length === 0) return []

  if (!isRgAvailable()) {
    return [...results].sort((a, b) => {
      const countA = (fs.readFileSync(a.file, 'utf-8').toLowerCase().match(new RegExp(kw, 'g')) || []).length
      const countB = (fs.readFileSync(b.file, 'utf-8').toLowerCase().match(new RegExp(kw, 'g')) || []).length
      return countB - countA
    })
  }

  const counts = new Map<string, number>()
  try {
    const out = cp.execFileSync('rg', ['-icF', kw, ...files], { encoding: 'utf-8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 })
    for (const line of out.trim().split('\n').filter(Boolean)) {
      const idx = line.lastIndexOf(':')
      if (idx > 0) {
        const f = line.slice(0, idx)
        const c = parseInt(line.slice(idx + 1), 10)
        if (!isNaN(c)) counts.set(f, c)
      }
    }
  } catch {}

  return [...results].sort((a, b) => (counts.get(b.file) ?? 0) - (counts.get(a.file) ?? 0))
}
