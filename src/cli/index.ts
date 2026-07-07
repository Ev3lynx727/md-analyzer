#!/usr/bin/env node
import { Command } from 'commander'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { CliOptions } from '../core/schema.js'
import { getTomlConfig, resolveConfigPath } from '../utils/config.js'
import { scanMarkdownFiles, analyzeFile, analyzeFileWithMicromark } from '../core/analyzer.js'
import { buildGraph, findOrphans, findBacklinks } from '../core/graph.js'
import { analyzeFileCached } from '../core/cache.js'
import { watchDirectory } from '../core/watcher.js'
import { searchContent, filterByMetadata, rankByRelevance } from '../core/search.js'
import { getFragmentHealth } from '../core/health.js'
import { loadSession, saveSession, updateSessionStats, getTokenBudgetReport } from '../core/session.js'
import { extractKeyPoints, buildSummary, writeRunLog } from './output.js'

const pkgVersion: string = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8')
).version

const program = new Command()

program
  .name('md-analyzer')
  .description('Markdown document analyzer for AI agents - extract metadata, headings, links, tables, tokens, formatting counts, and key points from .md files')
  .version(pkgVersion, '--version, -v', 'Show version number')
  .arguments('[directory]')
  .option('--json', 'Output as JSON')
  .option('--search <kw>', 'Search keyword in content')
  .option('--filter <k=v>', 'Filter by metadata field')
  .option('--rank', 'Rank results by relevance')
  .option('--graph', 'Document relationship graph')
  .option('--deps', 'Dependency graph (DAG order + levels)')
  .option('--orphans', 'Find unreferenced docs')
  .option('--backlinks <doc>', 'Find docs linking to <doc>')
  .option('--keypoints', 'Quick overview (single-shot)')
  .option('--lint-fragments', 'Fragment health check')
  .option('--summary', 'Aggregated stats across all files')
  .option('--watch', 'Watch mode — re-analyze on file changes')
  .option('--session', 'Token budget report')
  .option('--budget <n>', 'Set token budget limit', parseInt, 100000)
  .option('--max-results <n>', 'Limit output', parseInt, 0)
  .addHelpText('after', `

Examples:
  md-analyzer /path/to/docs --keypoints --json
  md-analyzer . --summary --json
  md-analyzer . --watch --summary  # live re-analysis with summary output
  md-analyzer . --search "task" --rank --json
  md-analyzer . --session --budget 50000 --json
  md-analyzer . --orphans --json
  md-analyzer . --lint-fragments --json
  md-analyzer . --deps --json`)

program.action(async (directory: string | undefined, options: Record<string, unknown>) => {
  const startTime = Date.now()

  let parsed: CliOptions
  try {
    parsed = CliOptions.parse({ directory, ...options })
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      console.error('Invalid arguments:')
      for (const issue of e.issues) {
        console.error('  ' + issue.path.join('.') + ': ' + issue.message)
      }
    } else {
      console.error('Unexpected error:', e instanceof Error ? e.message : e)
    }
    process.exit(1)
  }

  const configPath = resolveConfigPath()
  const config = getTomlConfig(configPath)
  const targetArg = parsed.directory || process.env['MD_ANALYZER_DEFAULT_DIR'] || config.default_directory || process.cwd()

  let mdFiles: string[] = []
  let scanErrors: string[] = []

  try {
    const stat = fs.statSync(targetArg)
    if (stat.isFile()) {
      if (targetArg.endsWith('.md')) mdFiles = [targetArg]
      else {
        scanErrors.push('not_a_markdown_file: ' + targetArg)
        if (!parsed.json) console.log('Not a .md file: ' + targetArg + '\n')
      }
    } else if (stat.isDirectory()) {
      if (!parsed.json) console.log('Scanning: ' + targetArg + '\n')
      const scanned = scanMarkdownFiles(targetArg)
      mdFiles = scanned.files
      scanErrors = scanned.errors
      if (!parsed.json) {
        console.log('Found ' + mdFiles.length + ' .md files\n')
        if (scanErrors.length > 0) console.log('Warnings: ' + scanErrors.length + ' directories skipped\n')
      }
    } else {
      scanErrors.push('unsupported_path_type: ' + targetArg)
    }
  } catch {
    scanErrors.push('path_not_found: ' + targetArg)
  }

  if (parsed.watch) {
    if (parsed.directory) {
      try {
        watchDirectory(targetArg, (changed) => changed.map(f => analyzeFileCached(f, analyzeFileWithMicromark, analyzeFile)))
      } catch (e: unknown) {
        console.error('watch_error:', e instanceof Error ? e.message : e)
        process.exit(1)
      }
    } else {
      console.error('--watch requires a directory path')
      process.exit(1)
    }
    return
  }

  let results = mdFiles.map(file => analyzeFileCached(file, analyzeFileWithMicromark, analyzeFile))
  if (scanErrors.length > 0 && results.length > 0) {
    if (!results[0].stats.errors) results[0].stats.errors = []
    results[0].stats.errors.push(...scanErrors)
  }

  if (parsed.filter && parsed.filter.includes('=')) {
    const [key, value] = parsed.filter.split('=')
    results = filterByMetadata(results, key, value)
    if (!parsed.json) console.log('Filtered by ' + key + '=' + value + ': ' + results.length + ' results\n')
  }

  if (parsed.search) {
    results = searchContent(results, parsed.search)
    if (!parsed.json) console.log('Search "' + parsed.search + '": ' + results.length + ' results\n')
  }

  if (parsed.rank && parsed.search) {
    results = rankByRelevance(results, parsed.search)
    if (!parsed.json) console.log('Ranked by relevance to "' + parsed.search + '"\n')
  }

  let limitedResults = results
  if (parsed.maxResults > 0 && results.length > parsed.maxResults) {
    if (!parsed.json) console.log('Warning: Limiting output to ' + parsed.maxResults + ' of ' + results.length + ' results\n')
    limitedResults = results.slice(0, parsed.maxResults)
  }

  const session = loadSession()
  const updatedSession = updateSessionStats(results, session)
  saveSession(updatedSession)
  const tokensThisCall = results.reduce((sum, r) => sum + r.stats.tokens, 0)
  if (parsed.session) console.log(JSON.stringify(getTokenBudgetReport(updatedSession, parsed.budget), null, 2))
  else if (parsed.summary) console.log(JSON.stringify(buildSummary(limitedResults, tokensThisCall, Date.now() - startTime), null, 2))
  else if (parsed.keypoints) console.log(JSON.stringify(limitedResults.map(doc => extractKeyPoints(doc)), null, 2))
  else if (parsed.lintFragments) console.log(JSON.stringify(getFragmentHealth(limitedResults), null, 2))
  else if (parsed.deps) {
    const graph = buildGraph(limitedResults)
    console.log(JSON.stringify({ nodes: Object.keys(graph.nodes), edges: graph.edges, tokensThisCall }, null, 2))
  } else if (parsed.orphans) {
    const orphans = findOrphans(buildGraph(limitedResults))
    console.log(JSON.stringify({ orphans, count: orphans.length, tokensThisCall }, null, 2))
  } else if (parsed.backlinks) {
    const backlinks = findBacklinks(limitedResults, parsed.backlinks)
    console.log(JSON.stringify({ target: parsed.backlinks, backlinks, count: backlinks.length, tokensThisCall }, null, 2))
  } else if (parsed.graph) console.log(JSON.stringify(buildGraph(limitedResults), null, 2))
  else {
    if (!parsed.json) {
      console.log('\nTokens this call: ' + tokensThisCall)
      console.log('Total session tokens: ' + updatedSession.totalTokens + '\n')
    }
    console.log(JSON.stringify(limitedResults, null, 2))
  }

  const usedFlags = process.argv.slice(2).filter(a => a.startsWith('--')).map(a => a.replace(/=.*/, ''))
  const mode = parsed.deps ? 'deps' : parsed.lintFragments ? 'lint-fragments' : parsed.session ? 'session' : parsed.summary ? 'summary' : parsed.keypoints ? 'keypoints' : parsed.orphans ? 'orphans' : parsed.backlinks ? 'backlinks' : parsed.graph ? 'graph' : parsed.search ? 'search' : 'default'
  writeRunLog({
    timestamp: new Date().toISOString(),
    sessionId: updatedSession.sessionId,
    directory: targetArg,
    flags: usedFlags,
    filesFound: mdFiles.length,
    filesProcessed: results.length,
    tokensThisCall,
    totalSessionTokens: updatedSession.totalTokens,
    errors: scanErrors,
    durationMs: Date.now() - startTime,
    mode
  })
})

program.parse()
