export interface CodeBlockRegion {
  start: number
  end: number
}

export interface FormattingCounts {
  bold: number
  italic: number
  boldItalic: number
  bullet: number
}

export interface MicromarkLink {
  text: string
  url: string
  start: number
  end: number
  isImage: boolean
  isAutolink: boolean
  isReference: boolean
}

import { parse, postprocess, preprocess } from 'micromark'
import { gfm } from 'micromark-extension-gfm'
import type { Heading, Table } from '../types/index.js'

interface MicromarkEvent {
  0: 'enter' | 'exit'
  1: { type: string; start: { offset: number }; end?: { offset: number } }
}

function parseEvents(content: string, extensions?: any[]): MicromarkEvent[] {
  if (!content) return []
  const opts = extensions && extensions.length > 0 ? { extensions } : {}
  return postprocess(
    parse(opts).document().write(preprocess()(content, 'utf-8', true))
  )
}

export function walkCodeBlocks(content: string): CodeBlockRegion[] | null {
  try {
    const events = parseEvents(content)
    const regions: CodeBlockRegion[] = []
    let depth = 0
    let currentStart = 0

    for (const ev of events) {
      const token = ev[1]
      if (token.type === 'codeFenced' || token.type === 'codeIndented') {
        if (ev[0] === 'enter') {
          if (depth === 0) currentStart = token.start.offset
          depth++
        } else {
          depth--
          if (depth === 0 && token.end) {
            regions.push({ start: currentStart, end: token.end.offset })
          }
        }
      }
    }

    return regions
  } catch (e) {
    console.error('walkCodeBlocks_error:', e instanceof Error ? e.message : e)
    return null
  }
}

export function walkLinks(content: string): MicromarkLink[] | null {
  try {
    const events = parseEvents(content)
    const definitions = new Map<string, string>()

    for (const ev of events) {
      if (ev[0] === 'enter' && ev[1].type === 'definitionLabelString') {
        const name = content.slice(ev[1].start.offset, ev[1].end?.offset ?? ev[1].start.offset).toLowerCase()
        definitions.set(name, '')
      } else if (ev[0] === 'enter' && ev[1].type === 'definitionDestinationString') {
        const url = content.slice(ev[1].start.offset, ev[1].end?.offset ?? ev[1].start.offset)
        let lastName = ''
        for (const [k, v] of definitions) {
          if (!v) { lastName = k; break }
        }
        if (lastName) definitions.set(lastName, url)
      }
    }

    const links: MicromarkLink[] = []
    let current: { type: string; start: number; text: string; url: string; hasRef: boolean } | null = null

    for (const ev of events) {
      const token = ev[1]
      const slice = (t: typeof token): string =>
        content.slice(t.start.offset, t.end?.offset ?? t.start.offset)

      if (ev[0] === 'enter' && (token.type === 'link' || token.type === 'image' || token.type === 'autolink')) {
        current = { type: token.type, start: token.start.offset, text: '', url: '', hasRef: false }
      }

      if (current && ev[0] === 'enter') {
        if (token.type === 'labelText') {
          current.text = slice(token)
        } else if (token.type === 'resourceDestinationString') {
          current.url = slice(token)
        } else if (token.type === 'referenceString') {
          current.hasRef = true
          current.url = definitions.get(slice(token).toLowerCase()) ?? slice(token)
        } else if (token.type === 'autolinkEmail' || token.type === 'autolinkProtocol') {
          current.url = slice(token)
          if (!current.text) current.text = current.url
        }
      }

      if (ev[0] === 'exit' && current && token.type === current.type) {
        if (token.end && (current.text || current.url)) {
          links.push({
            text: current.text || current.url,
            url: current.url || current.text,
            start: current.start,
            end: token.end.offset,
            isImage: current.type === 'image',
            isAutolink: current.type === 'autolink',
            isReference: current.hasRef
          })
        }
        current = null
      }
    }

    return links
  } catch (e) {
    console.error('walkLinks_error:', e instanceof Error ? e.message : e)
    return null
  }
}

function offsetToLine(content: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === '\n') line++
  }
  return line
}

export function walkHeadings(content: string): Heading[] | null {
  try {
    const events = parseEvents(content)
    const headings: Heading[] = []
    let current: { level: number; text: string; start: number } | null = null

    for (const ev of events) {
      const token = ev[1]
      const slice = (t: typeof token): string =>
        content.slice(t.start.offset, t.end?.offset ?? t.start.offset)

      if (ev[0] === 'enter') {
        if (token.type === 'setextHeadingText') {
          current = { level: 0, text: slice(token), start: token.start.offset }
        } else if (token.type === 'setextHeadingLineSequence') {
          if (current) current.level = slice(token).startsWith('=') ? 1 : 2
        } else if (token.type === 'atxHeadingSequence') {
          current = { level: slice(token).length, text: '', start: token.start.offset }
        } else if (token.type === 'atxHeadingText') {
          if (current) current.text = slice(token)
        }
      }

      if (ev[0] === 'exit' && current && (token.type === 'atxHeading' || token.type === 'setextHeading')) {
        headings.push({
          level: current.level,
          text: current.text.trim(),
          line: offsetToLine(content, current.start)
        })
        current = null
      }
    }

    return headings.length > 0 ? headings : null
  } catch (e) {
    console.error('walkHeadings_error:', e instanceof Error ? e.message : e)
    return null
  }
}

export function walkFormatting(content: string): FormattingCounts | null {
  try {
    const boldItalicRe = /\*\*\*(.+?)\*\*\*/g
    const boldRe = /(?<!\*)\*\*(?!\*)(.+?)\*\*/g
    const italicRe = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g
    const bulletRe = /^[ \t]*[-*+][ \t]/gm

    const boldItalicMatches = [...content.matchAll(boldItalicRe)]
    const boldMatches = [...content.matchAll(boldRe)]
    const italicMatches = [...content.matchAll(italicRe)]
    const bulletMatches = [...content.matchAll(bulletRe)]

    return {
      bold: boldMatches.length,
      italic: italicMatches.length,
      boldItalic: boldItalicMatches.length,
      bullet: bulletMatches.length
    }
  } catch (e) {
    console.error('walkFormatting_error:', e instanceof Error ? e.message : e)
    return null
  }
}

export function walkTables(content: string): Table[] | null {
  try {
    const events = parseEvents(content, [gfm()])
    const tables: Table[] = []

    let currentTable: { headers: string[]; rows: string[][] } | null = null
    let inHead = false
    let inBody = false
    let currentRow: string[] | null = null
    let currentCell: string | null = null

    for (const ev of events) {
      const token = ev[1]
      const slice = (t: typeof token): string =>
        content.slice(t.start.offset, t.end?.offset ?? t.start.offset)

      if (ev[0] === 'enter') {
        if (token.type === 'table') {
          currentTable = { headers: [], rows: [] }
        } else if (token.type === 'tableHead') {
          inHead = true
        } else if (token.type === 'tableBody') {
          inBody = true
        } else if (token.type === 'tableRow' && (inHead || inBody)) {
          currentRow = []
        } else if (token.type === 'tableHeader' && inHead) {
          currentCell = ''
        } else if (token.type === 'tableData' && inBody) {
          currentCell = ''
        } else if (token.type === 'tableContent' && currentCell !== null) {
          currentCell = slice(token)
        }
      }

      if (ev[0] === 'exit') {
        if (token.type === 'tableHeader' && inHead && currentCell !== null) {
          if (currentRow) currentRow.push(currentCell)
          currentCell = null
        } else if (token.type === 'tableData' && inBody && currentCell !== null) {
          if (currentRow) currentRow.push(currentCell)
          currentCell = null
        } else if (token.type === 'tableRow' && currentRow !== null) {
          if (inHead) currentTable!.headers = currentRow
          else if (inBody) currentTable!.rows.push(currentRow)
          currentRow = null
        } else if (token.type === 'tableHead') {
          inHead = false
        } else if (token.type === 'tableBody') {
          inBody = false
        } else if (token.type === 'table' && currentTable) {
          tables.push(currentTable)
          currentTable = null
        }
      }
    }

    return tables.length > 0 ? tables : null
  } catch (e) {
    console.error('walkTables_error:', e instanceof Error ? e.message : e)
    return null
  }
}
