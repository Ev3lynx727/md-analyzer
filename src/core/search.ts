import * as fs from 'fs'
import type { AnalysisResult } from '../types/index.js'

export function searchContent(results: AnalysisResult[], keyword: string): AnalysisResult[] {
  const kw = keyword.toLowerCase()
  return results.filter(doc => {
    const content = fs.readFileSync(doc.file, 'utf-8').toLowerCase()
    return content.includes(kw)
  })
}

export function filterByMetadata(results: AnalysisResult[], key: string, value: string): AnalysisResult[] {
  return results.filter(doc => doc.metadata && String(doc.metadata[key] || '') === value)
}

export function rankByRelevance(results: AnalysisResult[], keyword: string): AnalysisResult[] {
  const kw = keyword.toLowerCase()
  return [...results].sort((a, b) => {
    const countA = (fs.readFileSync(a.file, 'utf-8').toLowerCase().match(new RegExp(kw, 'g')) || []).length
    const countB = (fs.readFileSync(b.file, 'utf-8').toLowerCase().match(new RegExp(kw, 'g')) || []).length
    return countB - countA
  })
}
