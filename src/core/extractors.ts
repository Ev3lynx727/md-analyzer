import * as path from 'path'
import * as yaml from 'js-yaml'
import type { Link, Wikilink, Heading, Table, FragmentMeta } from '../types/index.js'

export function extractFrontmatter(content: string): { metadata: Record<string, unknown> | null; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
  const match = content.match(frontmatterRegex)
  if (!match) return { metadata: null, content }
  try {
    const parsed = yaml.load(match[1])
    const metadata = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
    return { metadata, content: content.substring(match[0].length) }
  } catch (e: unknown) {
    console.error('frontmatter_parse_error:', e instanceof Error ? e.message : e)
    return { metadata: null, content }
  }
}

export function extractFragmentMeta(metadata: Record<string, unknown> | null): FragmentMeta | null {
  if (!metadata) return null
  const dependsRaw = metadata.depends_on
  const depends: string[] = Array.isArray(dependsRaw) ? dependsRaw.map(String) : (typeof dependsRaw === 'string' ? [dependsRaw] : [])
  const tags: string[] = Array.isArray(metadata.tags) ? metadata.tags.map(String) : (typeof metadata.tags === 'string' ? [metadata.tags] : [])
  return {
    title: String(metadata.title || ''),
    description: metadata.description ? String(metadata.description) : null,
    tags,
    depends_on: depends,
    status: metadata.status ? String(metadata.status) : null,
    source: metadata.source ? String(metadata.source) : null,
    order: metadata.order != null ? Number(metadata.order) : null,
    date_iso: metadata.date_iso ? String(metadata.date_iso) : null,
  }
}

/** @deprecated Use walkHeadings from micromark-walk.js instead (token-accurate) */
export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length
    headings.push({ level: match[1].length, text: match[2].trim(), line })
  }
  return headings
}

/** @deprecated Use walkLinks from micromark-walk.js instead (token-accurate) */
export function extractLinks(content: string): Link[] {
  const links: Link[] = []
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2].trim()
    const isInternal = url.startsWith('#') || (!url.startsWith('http') && !url.startsWith('//'))
    let fileName: string | null = null
    if (isInternal && !url.startsWith('#')) {
      const baseName = path.basename(url, '.md')
      if (baseName && baseName !== url) fileName = baseName
    }
    links.push({ text: match[1].trim(), url, isInternal, fileName })
  }
  return links
}

export function extractWikilinks(content: string): Wikilink[] {
  const wikilinks: Wikilink[] = []
  const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  let match: RegExpExecArray | null
  while ((match = wikiRegex.exec(content)) !== null) {
    wikilinks.push({ target: match[1].trim(), display: match[2]?.trim() || null })
  }
  return wikilinks
}

/** @deprecated Use walkTables from micromark-walk.js instead (uses GFM spec) */
export function extractTables(content: string): Table[] {
  const tables: Table[] = []
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g
  let match: RegExpExecArray | null
  while ((match = tableRegex.exec(content)) !== null) {
    const headers = match[1].split('|').map(h => h.trim()).filter(h => h)
    const rows: string[][] = []
    match[2].trim().split('\n').forEach(row => {
      const cells = row.split('|').map(c => c.trim()).filter(c => c)
      if (cells.length > 0) rows.push(cells)
    })
    tables.push({ headers, rows })
  }
  return tables
}
