import * as path from 'path'
import type { CodeBlockRegion, FormattingCounts, MicromarkLink } from './micromark-walk.js'
import type { Link, Heading, Table } from '../types/index.js'

function isInsideBlock(offset: number, regions: CodeBlockRegion[]): boolean {
  if (regions.length === 0) return false
  return regions.some(r => offset >= r.start && offset < r.end)
}

export function filterMicromarkLinks(links: MicromarkLink[], regions: CodeBlockRegion[]): Link[] {
  if (!links || links.length === 0) return []
  return links
    .filter(ml => {
      if (regions.length === 0) return true
      return !isInsideBlock(ml.start, regions)
    })
    .map(ml => ({
      text: ml.text,
      url: ml.url,
      isInternal: ml.url.startsWith('#') || (!ml.url.startsWith('http') && !ml.url.startsWith('//')),
      fileName: (() => {
        if (!ml.url.startsWith('#') && !ml.url.startsWith('http') && !ml.url.startsWith('//')) {
          const baseName = path.basename(ml.url, '.md')
          if (baseName && baseName !== ml.url) return baseName
        }
        return null
      })(),
      isImage: ml.isImage || undefined
    }))
}

export function filterMicromarkHeadings(headings: Heading[], regions: CodeBlockRegion[], content: string): Heading[] {
  if (!headings || headings.length === 0) return []
  if (regions.length === 0) return headings
  return headings.filter(h => {
    const idx = content.indexOf(h.text)
    return idx === -1 || !isInsideBlock(idx, regions)
  })
}

export function filterMicromarkTables(tables: Table[], regions: CodeBlockRegion[], content: string): Table[] {
  if (!tables || tables.length === 0) return []
  if (regions.length === 0) return tables
  return tables.filter(t => {
    const idx = content.indexOf(t.headers.join('|'))
    return idx === -1 || !isInsideBlock(idx, regions)
  })
}

export function countCodeBlocks(regions: CodeBlockRegion[] | null): number {
  return regions ? regions.length : -1
}

function isInsideAnyBlock(offset: number, regions: CodeBlockRegion[]): boolean {
  return regions.some(r => offset >= r.start && offset < r.end)
}

export function countFormatting(
  counts: FormattingCounts | null,
  content: string,
  regions: CodeBlockRegion[]
): { boldCount: number; italicCount: number; bulletCount: number } {
  if (!counts) return { boldCount: 0, italicCount: 0, bulletCount: 0 }

  if (regions.length === 0) {
    return {
      boldCount: counts.bold + counts.boldItalic,
      italicCount: counts.italic,
      bulletCount: counts.bullet
    }
  }

  const boldItalicRe = /\*\*\*(.+?)\*\*\*/g
  const boldRe = /(?<!\*)\*\*(?!\*)(.+?)\*\*/g
  const italicRe = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g
  const bulletRe = /^[ \t]*[-*+][ \t]/gm

  const isInCode = (offset: number) => isInsideAnyBlock(offset, regions)

  const boldItalicCount = [...content.matchAll(boldItalicRe)].filter(m => !isInCode(m.index)).length
  const boldCount = [...content.matchAll(boldRe)].filter(m => !isInCode(m.index)).length
  const italicCount = [...content.matchAll(italicRe)].filter(m => !isInCode(m.index)).length
  const bulletCount = [...content.matchAll(bulletRe)].filter(m => !isInCode(m.index)).length

  return {
    boldCount: boldCount + boldItalicCount,
    italicCount,
    bulletCount
  }
}
