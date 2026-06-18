import type { CodeBlockRegion } from './micromark-walk.js'
import type { Link, Heading } from '../types/index.js'

function isInsideBlock(pos: { line?: number; offset?: number }, regions: CodeBlockRegion[]): boolean {
  const offset = pos.offset
  if (regions.length === 0 || offset === undefined) return false
  return regions.some(r => offset >= r.start && offset < r.end)
}

export function filterLinks(links: Link[], regions: CodeBlockRegion[], content: string): Link[] {
  if (regions.length === 0) return links
  return links.filter(link => {
    const idx = content.indexOf(link.text)
    if (idx === -1) {
      const urlIdx = content.indexOf(link.url)
      return urlIdx === -1 || !isInsideBlock({ offset: urlIdx }, regions)
    }
    return !isInsideBlock({ offset: idx }, regions)
  })
}

export function filterHeadings(headings: Heading[], regions: CodeBlockRegion[], content: string): Heading[] {
  if (regions.length === 0) return headings
  return headings.filter(h => {
    const idx = content.indexOf(h.text)
    if (idx === -1) return true
    return !isInsideBlock({ offset: idx }, regions)
  })
}

export function countCodeBlocks(regions: CodeBlockRegion[] | null): number {
  return regions ? regions.length : -1
}
