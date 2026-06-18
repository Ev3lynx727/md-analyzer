export interface CodeBlockRegion {
  start: number
  end: number
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

import type { Heading } from '../types/index.js'

interface MicromarkEvent {
  0: 'enter' | 'exit'
  1: { type: string; start: { offset: number }; end?: { offset: number } }
}

let micromarkModule: any = null

async function getMicromark(): Promise<any> {
  if (micromarkModule === null) {
    try {
      micromarkModule = await import('micromark')
    } catch {
      micromarkModule = false
    }
  }
  return micromarkModule
}

export async function isMicromarkAvailable(): Promise<boolean> {
  const mm = await getMicromark()
  return mm !== false
}

function parseEvents(content: string): MicromarkEvent[] {
  const mm: any = micromarkModule
  return mm.postprocess(
    mm.parse().document().write(mm.preprocess()(content, 'utf-8', true))
  )
}

export async function walkCodeBlocks(content: string): Promise<CodeBlockRegion[] | null> {
  const mm = await getMicromark()
  if (!mm) return null

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
  } catch {
    return null
  }
}

export async function walkLinks(content: string): Promise<MicromarkLink[] | null> {
  const mm = await getMicromark()
  if (!mm) return null

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
  } catch {
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

export async function walkSetextHeadings(content: string): Promise<Heading[] | null> {
  const mm = await getMicromark()
  if (!mm) return null

  try {
    const events = parseEvents(content)
    const headings: Heading[] = []

    let currentText = ''
    let currentLevel = 0
    let currentStart = 0

    for (const ev of events) {
      const token = ev[1]
      const slice = (t: typeof token): string =>
        content.slice(t.start.offset, t.end?.offset ?? t.start.offset)

      if (ev[0] === 'enter' && token.type === 'setextHeadingText') {
        currentText = slice(token)
        currentStart = token.start.offset
      }

      if (ev[0] === 'enter' && token.type === 'setextHeadingLineSequence') {
        currentLevel = slice(token).startsWith('=') ? 1 : 2
      }

      if (ev[0] === 'exit' && token.type === 'setextHeading') {
        if (currentText && currentLevel > 0) {
          headings.push({
            level: currentLevel,
            text: currentText.trim(),
            line: offsetToLine(content, currentStart)
          })
        }
        currentText = ''
        currentLevel = 0
      }
    }

    return headings
  } catch {
    return null
  }
}
