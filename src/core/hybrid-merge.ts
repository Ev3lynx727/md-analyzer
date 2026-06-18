import type { CodeBlockRegion, MicromarkLink } from './micromark-walk.js'
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

function isInternalUrl(url: string): boolean {
  return url.startsWith('#') || (!url.startsWith('http') && !url.startsWith('//'))
}

export function mergeLinks(regexLinks: Link[], micromarkLinks: MicromarkLink[], content: string): Link[] {
  if (!micromarkLinks || micromarkLinks.length === 0) return regexLinks

  const imageOffsets = new Set<number>()
  const extras: Link[] = []

  for (const ml of micromarkLinks) {
    if (ml.isImage) {
      const idx = content.indexOf(ml.text)
      if (idx !== -1) imageOffsets.add(idx)
    }
    if (ml.isAutolink || ml.isReference) {
      extras.push({
        text: ml.text,
        url: ml.url,
        isInternal: isInternalUrl(ml.url),
        fileName: null
      })
    }
  }

  const result = regexLinks.map(link => {
    const idx = content.indexOf(link.text)
    if (idx !== -1 && imageOffsets.has(idx)) {
      return { ...link, isImage: true }
    }
    return link
  })

  result.push(...extras)
  return result
}
