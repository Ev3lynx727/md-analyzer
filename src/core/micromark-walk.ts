export interface CodeBlockRegion {
  start: number
  end: number
}

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

export async function walkCodeBlocks(content: string): Promise<CodeBlockRegion[] | null> {
  const mm = await getMicromark()
  if (!mm) return null

  try {
    const events: MicromarkEvent[] = mm.postprocess(
      mm.parse().document().write(mm.preprocess()(content, 'utf-8', true))
    )

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
