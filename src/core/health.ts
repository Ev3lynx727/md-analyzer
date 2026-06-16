import type { AnalysisResult } from '../types/index.js'

export function getFragmentHealth(results: AnalysisResult[]): object {
  const total = results.length
  const withFrontmatter = results.filter(r => r.fragmentMeta).length
  const withDeps = results.filter(r => r.fragmentMeta && r.fragmentMeta.depends_on.length > 0).length
  const withWikilinks = results.filter(r => r.stats.totalWikilinks > 0).length
  const withStatus = results.filter(r => r.fragmentMeta && r.fragmentMeta.status).length
  const withDescription = results.filter(r => r.fragmentMeta && r.fragmentMeta.description).length
  const withSource = results.filter(r => r.fragmentMeta && r.fragmentMeta.source).length
  const noTitle = results.filter(r => r.fragmentMeta && !r.fragmentMeta.title).length
  const issues: { file: string; issues: string[] }[] = []
  for (const r of results) {
    const fileIssues: string[] = []
    if (!r.fragmentMeta) fileIssues.push('no_frontmatter')
    else {
      if (!r.fragmentMeta.title) fileIssues.push('empty_title')
      if (!r.fragmentMeta.source) fileIssues.push('no_source')
      if (r.fragmentMeta.depends_on.length === 0 && r.stats.totalWikilinks > 0) fileIssues.push('wikilinks_no_depends_on')
    }
    if (fileIssues.length > 0) issues.push({ file: r.fileName, issues: fileIssues })
  }
  return { total, withFrontmatter, withDeps, withWikilinks, withStatus, withDescription, withSource, noTitle, filesWithIssues: issues.length, issues }
}
