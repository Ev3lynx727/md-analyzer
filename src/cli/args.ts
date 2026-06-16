export function getPositionalArg(start: number): string {
  for (let i = start; i < process.argv.length; i++) {
    if (!process.argv[i].startsWith('-')) return process.argv[i]
  }
  return ''
}

export function getFlagArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  return idx > 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null
}

export interface ParsedFlags {
  cliDir: string | null
  jsonOnly: boolean
  graphMode: boolean
  orphansMode: boolean
  rankMode: boolean
  sessionMode: boolean
  keypointsMode: boolean
  depsMode: boolean
  lintFragmentsMode: boolean
  budget: number
  maxResults: number
  backlinksTarget: string | null
  searchKeyword: string | null
  filterRaw: string | null
}

const KNOWN_FLAGS = new Set([
  '--help', '-h', '--version', '-v', '--json', '--graph', '--orphans',
  '--rank', '--session', '--keypoints', '--deps', '--lint-fragments',
  '--budget', '--max-results', '--backlinks', '--search', '--filter'
])

export function parseFlags(): ParsedFlags {
  const unknownFlags = process.argv.slice(2).filter(a => a.startsWith('--') && !KNOWN_FLAGS.has(a))
  for (const flag of unknownFlags) {
    console.warn(`warning: unknown flag "${flag}"`)
  }

  return {
    cliDir: getPositionalArg(2),
    jsonOnly: process.argv.includes('--json'),
    graphMode: process.argv.includes('--graph'),
    orphansMode: process.argv.includes('--orphans'),
    rankMode: process.argv.includes('--rank'),
    sessionMode: process.argv.includes('--session'),
    keypointsMode: process.argv.includes('--keypoints'),
    depsMode: process.argv.includes('--deps'),
    lintFragmentsMode: process.argv.includes('--lint-fragments'),
    budget: parseInt(getFlagArg('--budget') || '', 10) || 100000,
    maxResults: parseInt(getFlagArg('--max-results') || '', 10) || 0,
    backlinksTarget: getFlagArg('--backlinks'),
    searchKeyword: getFlagArg('--search'),
    filterRaw: getFlagArg('--filter'),
  }
}

export function showHelp(): void {
  console.log(`md-analyzer - Markdown document analyzer for AI agents

Usage: md-analyzer <directory> [options]

Options:
  --json              Output as JSON
  --search <kw>       Search keyword in content
  --filter <k=v>      Filter by metadata field
  --rank              Rank results by relevance
  --graph             Document relationship graph
  --deps              Dependency graph (DAG order + levels)
  --orphans           Find unreferenced docs
  --backlinks <doc>   Find docs linking to <doc>
  --keypoints         Quick overview (single-shot)
  --lint-fragments    Fragment health check
  --session           Token budget report
  --budget <n>        Set token budget limit
  --max-results <n>   Limit output
  --version, -v       Show version number
  --help, -h          Show this help message

Examples:
  md-analyzer /path/to/docs --keypoints --json
  md-analyzer . --search "task" --rank --json
  md-analyzer . --session --budget 50000 --json
  md-analyzer . --orphans --json
  md-analyzer . --lint-fragments --json
  md-analyzer . --deps --json`)
}
