import type { AnalysisResult, Graph, GraphNode } from '../types/index.js'

function addEdge(graph: Record<string, GraphNode>, edges: { source: string; target: string; type: string }[], source: string, target: string, type: string): void {
  if (!graph[source]) graph[source] = { inbound: [], outbound: [] }
  if (!graph[target]) graph[target] = { inbound: [], outbound: [] }
  if (!graph[source].outbound.includes(target)) graph[source].outbound.push(target)
  if (!graph[target].inbound.includes(source)) graph[target].inbound.push(source)
  edges.push({ source, target, type })
}

export function buildGraph(results: AnalysisResult[]): Graph {
  const graph: Record<string, GraphNode> = {}, edges: { source: string; target: string; type: string }[] = []
  results.forEach(doc => {
    const source = doc.fileName
    if (!graph[source]) graph[source] = { inbound: [], outbound: [] }
    doc.links.forEach(link => {
      if (link.isInternal && link.fileName) addEdge(graph, edges, source, link.fileName, 'link')
    })
    doc.wikilinks.forEach(w => {
      const slug = w.target.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (slug !== source && results.some(r => r.fileName === slug)) addEdge(graph, edges, source, slug, 'wikilink')
    })
    if (doc.fragmentMeta) {
      doc.fragmentMeta.depends_on.forEach(dep => {
        const depName = dep.replace(/\.md$/, '')
        if (depName !== source && results.some(r => r.fileName === depName)) addEdge(graph, edges, source, depName, 'depends_on')
      })
    }
  })
  return { nodes: graph, edges }
}

export function findOrphans(graph: Graph, excludeOrphansWithDeps?: Set<string>): string[] {
  return Object.keys(graph.nodes).filter(node => {
    if (excludeOrphansWithDeps?.has(node)) return false
    return graph.nodes[node].inbound.length === 0 && graph.nodes[node].outbound.length === 0
  })
}

export function findBacklinks(results: AnalysisResult[], targetFileName: string): string[] {
  const backlinks: string[] = []
  results.forEach(doc => {
    doc.links.forEach(link => {
      if (link.isInternal && link.fileName === targetFileName && !backlinks.includes(doc.fileName)) {
        backlinks.push(doc.fileName)
      }
    })
    doc.wikilinks.forEach(w => {
      const slug = w.target.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (slug === targetFileName && !backlinks.includes(doc.fileName)) backlinks.push(doc.fileName)
    })
  })
  return backlinks
}
