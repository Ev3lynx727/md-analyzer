#!/usr/bin/env node
import * as path from 'path'
import * as fs from 'fs'
import { getTomlConfig, resolveConfigPath } from '../utils/config.js'
import { scanMarkdownFiles, analyzeFile } from '../core/analyzer.js'
import { buildGraph, findOrphans, findBacklinks } from '../core/graph.js'
import { searchContent, filterByMetadata, rankByRelevance } from '../core/search.js'
import { getFragmentHealth } from '../core/health.js'
import { loadSession, saveSession, updateSessionStats, getTokenBudgetReport } from '../core/session.js'
import { parseFlags, showHelp } from './args.js'
import { extractKeyPoints, writeRunLog } from './output.js'

function main(): void {
  const startTime = Date.now()
  const configPath = resolveConfigPath()
  const config = getTomlConfig(configPath)

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))
    console.log(pkg.version)
    process.exit(0)
  }

  const flags = parseFlags()
  const targetDir = flags.cliDir || process.env['MD_ANALYZER_DEFAULT_DIR'] || config.default_directory || process.cwd()

  if (!flags.jsonOnly) console.log('Scanning: ' + targetDir + '\n')

  const { files: mdFiles, errors: scanErrors } = scanMarkdownFiles(targetDir)
  if (!flags.jsonOnly) {
    console.log('Found ' + mdFiles.length + ' .md files\n')
    if (scanErrors.length > 0) console.log('Warnings: ' + scanErrors.length + ' directories skipped\n')
  }

  let results = mdFiles.map(file => analyzeFile(file))
  if (scanErrors.length > 0 && results.length > 0) {
    if (!results[0].stats.errors) results[0].stats.errors = []
    results[0].stats.errors.push(...scanErrors)
  }

  if (flags.filterRaw && flags.filterRaw.includes('=')) {
    const [key, value] = flags.filterRaw.split('=')
    results = filterByMetadata(results, key, value)
    if (!flags.jsonOnly) console.log('Filtered by ' + key + '=' + value + ': ' + results.length + ' results\n')
  }

  if (flags.searchKeyword) {
    results = searchContent(results, flags.searchKeyword)
    if (!flags.jsonOnly) console.log('Search "' + flags.searchKeyword + '": ' + results.length + ' results\n')
  }

  if (flags.rankMode && flags.searchKeyword) {
    results = rankByRelevance(results, flags.searchKeyword)
    if (!flags.jsonOnly) console.log('Ranked by relevance to "' + flags.searchKeyword + '"\n')
  }

  let limitedResults = results
  if (flags.maxResults > 0 && results.length > flags.maxResults) {
    if (!flags.jsonOnly) console.log('Warning: Limiting output to ' + flags.maxResults + ' of ' + results.length + ' results\n')
    limitedResults = results.slice(0, flags.maxResults)
  }

  const session = loadSession()
  const updatedSession = updateSessionStats(results, session)
  saveSession(updatedSession)
  const tokensThisCall = results.reduce((sum, r) => sum + r.stats.tokens, 0)

  if (flags.sessionMode) console.log(JSON.stringify(getTokenBudgetReport(updatedSession, flags.budget), null, 2))
  else if (flags.keypointsMode) console.log(JSON.stringify(limitedResults.map(doc => extractKeyPoints(doc)), null, 2))
  else if (flags.lintFragmentsMode) console.log(JSON.stringify(getFragmentHealth(limitedResults), null, 2))
  else if (flags.depsMode) {
    const graph = buildGraph(limitedResults)
    console.log(JSON.stringify({ nodes: Object.keys(graph.nodes), edges: graph.edges, tokensThisCall }, null, 2))
  } else if (flags.orphansMode) {
    const orphans = findOrphans(buildGraph(limitedResults))
    console.log(JSON.stringify({ orphans, count: orphans.length, tokensThisCall }, null, 2))
  } else if (flags.backlinksTarget) {
    const backlinks = findBacklinks(limitedResults, flags.backlinksTarget)
    console.log(JSON.stringify({ target: flags.backlinksTarget, backlinks, count: backlinks.length, tokensThisCall }, null, 2))
  } else if (flags.graphMode) console.log(JSON.stringify(buildGraph(limitedResults), null, 2))
  else {
    if (!flags.jsonOnly) {
      console.log('\nTokens this call: ' + tokensThisCall)
      console.log('Total session tokens: ' + updatedSession.totalTokens + '\n')
    }
    console.log(JSON.stringify(limitedResults, null, 2))
  }

  const usedFlags = process.argv.slice(2).filter(a => a.startsWith('--')).map(a => a.replace(/=.*/, ''))
  const mode = flags.depsMode ? 'deps' : flags.lintFragmentsMode ? 'lint-fragments' : flags.sessionMode ? 'session' : flags.keypointsMode ? 'keypoints' : flags.orphansMode ? 'orphans' : flags.backlinksTarget ? 'backlinks' : flags.graphMode ? 'graph' : flags.searchKeyword ? 'search' : 'default'
  writeRunLog({
    timestamp: new Date().toISOString(),
    sessionId: updatedSession.sessionId,
    directory: targetDir,
    flags: usedFlags,
    filesFound: mdFiles.length,
    filesProcessed: results.length,
    tokensThisCall,
    totalSessionTokens: updatedSession.totalTokens,
    errors: scanErrors,
    durationMs: Date.now() - startTime,
    mode
  })
}

main()
