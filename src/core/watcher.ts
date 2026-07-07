import * as fs from 'fs'
import * as path from 'path'
import type { AnalysisResult } from '../types/index.js'
import { buildSummary } from '../cli/output.js'

type Reanalyse = (files: string[]) => AnalysisResult[]

export function watchDirectory(dir: string, reanalyse: Reanalyse): void {
  const mdFiles = new Set<string>()
  function isMd(f: string) { return f.endsWith('.md') || f.endsWith('.mdx') }
  function addFile(f: string) { if (isMd(f)) mdFiles.add(f) }
  function removeFile(f: string) { mdFiles.delete(f) }

  process.stdout.write('Scanning for .md files...\n')
  // initial scan
  function scan(d: string) {
    let entries: string[]
    try { entries = fs.readdirSync(d) } catch { return }
    for (const e of entries) {
      const p = path.join(d, e)
      let stat: fs.Stats
      try { stat = fs.statSync(p) } catch { continue }
      if (stat.isDirectory() && !e.startsWith('.') && e !== 'node_modules' && e !== 'dist' && e !== '.git') scan(p)
      else if (stat.isFile()) addFile(p)
    }
  }
  scan(dir)

  process.stdout.write(`Watching ${dir} (${mdFiles.size} .md files)\n`)
  const reanalyseAndPrint = (changed: string[]) => {
    const results = reanalyse(changed)
    const totalTok = results.reduce((s, r) => s + r.stats.tokens, 0)
    process.stdout.write(JSON.stringify(buildSummary(results, totalTok, 0), null, 2) + '\n')
    process.stdout.write(`--- ${new Date().toLocaleTimeString()} ---\n`)
  }

  // debounce map
  const pending = new Map<string, ReturnType<typeof setTimeout>>()
  const DEBOUNCE_MS = 300

  fs.watch(dir, { recursive: true }, (event, filename) => {
    if (!filename) return
    const fullPath = path.resolve(dir, filename)
    if (!isMd(fullPath)) return
    if (event === 'rename') {
      try {
        fs.accessSync(fullPath)
        addFile(fullPath)
      } catch {
        removeFile(fullPath)
        return
      }
    }
    if (pending.has(fullPath)) clearTimeout(pending.get(fullPath)!)
    pending.set(fullPath, setTimeout(() => {
      pending.delete(fullPath)
      reanalyseAndPrint([fullPath])
    }, DEBOUNCE_MS))
  })

  // initial run
  if (mdFiles.size > 0) {
    process.stdout.write(`Starting initial analysis of ${mdFiles.size} files...\n`)
    reanalyseAndPrint([...mdFiles])
  }
}
