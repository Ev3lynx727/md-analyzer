#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const js_tiktoken_1 = require("js-tiktoken");
const yaml = __importStar(require("js-yaml"));
const SKIP_DIRS = new Set([
    'node_modules', '.git', '.svn', '.hg',
    'services', 'data', 'appendonlydir',
    'dist', 'build', '__pycache__', '.next', 'coverage'
]);
function getTomlConfig(tomlPath) {
    try {
        const content = fs.readFileSync(tomlPath, 'utf-8');
        const config = {};
        let inConfigSection = false;
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed === '[tool.md-analyzer.config]') {
                inConfigSection = true;
                return;
            }
            if (inConfigSection) {
                if (trimmed.startsWith('[')) {
                    inConfigSection = false;
                    return;
                }
                if (trimmed.includes('=')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                    config[key.trim()] = value;
                }
            }
        });
        return config;
    }
    catch {
        return {};
    }
}
function extractFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);
    if (!match)
        return { metadata: null, content };
    try {
        const parsed = yaml.load(match[1]);
        const metadata = parsed && typeof parsed === 'object' ? parsed : null;
        return { metadata, content: content.substring(match[0].length) };
    }
    catch {
        return { metadata: null, content };
    }
}
function extractHeadings(content) {
    const headings = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        headings.push({ level: match[1].length, text: match[2].trim(), line });
    }
    return headings;
}
function extractLinks(content) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        const url = match[2].trim();
        const isInternal = url.startsWith('#') || (!url.startsWith('http') && !url.startsWith('//'));
        let fileName = null;
        if (isInternal && !url.startsWith('#')) {
            const baseName = path.basename(url, '.md');
            if (baseName && baseName !== url)
                fileName = baseName;
        }
        links.push({ text: match[1].trim(), url, isInternal, fileName });
    }
    return links;
}
function extractWikilinks(content) {
    const wikilinks = [];
    const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match;
    while ((match = wikiRegex.exec(content)) !== null) {
        wikilinks.push({ target: match[1].trim(), display: match[2]?.trim() || null });
    }
    return wikilinks;
}
function extractFragmentMeta(metadata) {
    if (!metadata)
        return null;
    const dependsRaw = metadata.depends_on;
    const depends = Array.isArray(dependsRaw) ? dependsRaw.map(String) : (typeof dependsRaw === 'string' ? [dependsRaw] : []);
    const tags = Array.isArray(metadata.tags) ? metadata.tags.map(String) : (typeof metadata.tags === 'string' ? [metadata.tags] : []);
    return {
        title: String(metadata.title || ''),
        description: metadata.description ? String(metadata.description) : null,
        tags,
        depends_on: depends,
        status: metadata.status ? String(metadata.status) : null,
        source: metadata.source ? String(metadata.source) : null,
        order: metadata.order != null ? Number(metadata.order) : null,
        date_iso: metadata.date_iso ? String(metadata.date_iso) : null,
    };
}
function extractTables(content) {
    const tables = [];
    const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
        const headers = match[1].split('|').map(h => h.trim()).filter(h => h);
        const rows = [];
        match[2].trim().split('\n').forEach(row => {
            const cells = row.split('|').map(c => c.trim()).filter(c => c);
            if (cells.length > 0)
                rows.push(cells);
        });
        tables.push({ headers, rows });
    }
    return tables;
}
function countStats(content) {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = content.length;
    const lineCount = content.split('\n').length;
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
    let tokens = 0;
    try {
        tokens = (0, js_tiktoken_1.encodingForModel)('gpt-4').encode(content).length;
    }
    catch {
        tokens = Math.ceil(charCount / 4);
    }
    return { wordCount, charCount, lineCount, codeBlocks, tokens };
}
function scanMarkdownFiles(dir) {
    const files = [], errors = [];
    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch (e) {
            errors.push(`permission_denied: ${dir}`);
            return;
        }
        for (const entry of entries) {
            if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name))
                continue;
            const fullPath = path.join(dir, entry.name);
            try {
                if (entry.isDirectory())
                    walk(fullPath);
                else if (entry.isFile() && entry.name.endsWith('.md'))
                    files.push(fullPath);
            }
            catch (e) {
                errors.push(`access_error: ${fullPath}`);
            }
        }
    }
    try {
        walk(dir);
    }
    catch (e) {
        errors.push(`scan_error: ${e instanceof Error ? e.message : 'unknown'}`);
    }
    return { files, errors };
}
function analyzeFile(filePath) {
    const errors = [];
    let content = '';
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    }
    catch (e) {
        errors.push(`file_read_error: ${e instanceof Error ? e.message : 'unknown'}`);
        return { file: filePath, fileName: path.basename(filePath, '.md'), metadata: null, fragmentMeta: null, headings: [], sections: [], links: [], wikilinks: [], tables: [],
            stats: { totalHeadings: 0, totalLinks: 0, internalLinks: 0, externalLinks: 0, totalWikilinks: 0, wordCount: 0, charCount: 0, lineCount: 0, codeBlocks: 0, tables: 0, tokens: 0, errors } };
    }
    const { metadata, content: markdownContent } = extractFrontmatter(content);
    const fragmentMeta = extractFragmentMeta(metadata);
    const headings = extractHeadings(markdownContent);
    const links = extractLinks(markdownContent);
    const wikilinks = extractWikilinks(markdownContent);
    const tables = extractTables(markdownContent);
    const counts = countStats(markdownContent);
    if (counts.tokens === 0)
        errors.push('token_count_fallback: tiktoken unavailable');
    const bodyLines = markdownContent.split('\n');
    const sections = headings.map((h, i) => {
        const startIdx = h.line - 1;
        const endIdx = i + 1 < headings.length ? headings[i + 1].line - 1 : bodyLines.length;
        const sectionText = bodyLines.slice(startIdx, endIdx).join('\n');
        let tokens = 0;
        try {
            tokens = (0, js_tiktoken_1.encodingForModel)('gpt-4').encode(sectionText).length;
        }
        catch {
            tokens = Math.ceil(sectionText.length / 4);
        }
        return { line: h.line, tokens };
    });
    return { file: filePath, fileName: path.basename(filePath, '.md'), metadata, fragmentMeta, headings, sections, links, wikilinks, tables,
        stats: { totalHeadings: headings.length, totalLinks: links.length, internalLinks: links.filter(l => l.isInternal).length,
            externalLinks: links.filter(l => !l.isInternal).length, totalWikilinks: wikilinks.length, wordCount: counts.wordCount,
            charCount: counts.charCount, lineCount: counts.lineCount, codeBlocks: counts.codeBlocks, tables: tables.length,
            tokens: counts.tokens, errors: errors.length > 0 ? errors : undefined } };
}
function addEdge(graph, edges, source, target, type) {
    if (!graph[source])
        graph[source] = { inbound: [], outbound: [] };
    if (!graph[target])
        graph[target] = { inbound: [], outbound: [] };
    if (!graph[source].outbound.includes(target))
        graph[source].outbound.push(target);
    if (!graph[target].inbound.includes(source))
        graph[target].inbound.push(source);
    edges.push({ source, target, type });
}
function buildGraph(results) {
    const graph = {}, edges = [];
    results.forEach(doc => {
        const source = doc.fileName;
        if (!graph[source])
            graph[source] = { inbound: [], outbound: [] };
        doc.links.forEach(link => {
            if (link.isInternal && link.fileName)
                addEdge(graph, edges, source, link.fileName, 'link');
        });
        doc.wikilinks.forEach(w => {
            const slug = w.target.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            if (slug !== source && results.some(r => r.fileName === slug))
                addEdge(graph, edges, source, slug, 'wikilink');
        });
        if (doc.fragmentMeta) {
            doc.fragmentMeta.depends_on.forEach(dep => {
                const depName = dep.replace(/\.md$/, '');
                if (depName !== source && results.some(r => r.fileName === depName))
                    addEdge(graph, edges, source, depName, 'depends_on');
            });
        }
    });
    return { nodes: graph, edges };
}
function findOrphans(graph, excludeOrphansWithDeps) {
    return Object.keys(graph.nodes).filter(node => {
        if (excludeOrphansWithDeps?.has(node))
            return false;
        return graph.nodes[node].inbound.length === 0 && graph.nodes[node].outbound.length === 0;
    });
}
function findBacklinks(results, targetFileName) {
    const backlinks = [];
    results.forEach(doc => {
        doc.links.forEach(link => {
            if (link.isInternal && link.fileName === targetFileName && !backlinks.includes(doc.fileName)) {
                backlinks.push(doc.fileName);
            }
        });
        doc.wikilinks.forEach(w => {
            const slug = w.target.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            if (slug === targetFileName && !backlinks.includes(doc.fileName))
                backlinks.push(doc.fileName);
        });
    });
    return backlinks;
}
function searchContent(results, keyword) {
    const kw = keyword.toLowerCase();
    return results.filter(doc => {
        const content = fs.readFileSync(doc.file, 'utf-8').toLowerCase();
        return content.includes(kw);
    });
}
function filterByMetadata(results, key, value) {
    return results.filter(doc => doc.metadata && String(doc.metadata[key] || '') === value);
}
function rankByRelevance(results, keyword) {
    const kw = keyword.toLowerCase();
    return [...results].sort((a, b) => {
        const countA = (fs.readFileSync(a.file, 'utf-8').toLowerCase().match(new RegExp(kw, 'g')) || []).length;
        const countB = (fs.readFileSync(b.file, 'utf-8').toLowerCase().match(new RegExp(kw, 'g')) || []).length;
        return countB - countA;
    });
}
function extractKeyPoints(doc) {
    return { fileName: doc.fileName, title: doc.headings[0]?.text || doc.fileName, level: doc.headings[0]?.level || 1,
        summary: { totalHeadings: doc.stats.totalHeadings, totalLinks: doc.stats.totalLinks, totalWikilinks: doc.stats.totalWikilinks, totalTokens: doc.stats.tokens, wordCount: doc.stats.wordCount },
        keyHeadings: doc.headings.slice(0, 10).map((h, i) => ({
            level: h.level, text: h.text, line: h.line,
            tokens: doc.sections?.[i]?.tokens ?? 0
        })),
        importantLinks: doc.links.filter(l => !l.isInternal).slice(0, 3).map(l => ({ text: l.text, url: l.url })),
        internalReferences: doc.links.filter(l => l.isInternal && l.fileName).slice(0, 5).map(l => l.fileName),
        metadata: doc.metadata, readingTime: Math.ceil(doc.stats.wordCount / 200) + ' min' };
}
const SESSION_FILE = '/tmp/md-analyzer-session.json';
function loadSession() {
    try {
        return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    }
    catch {
        return { sessionId: `session-${Date.now()}`, calls: 0, totalTokens: 0, filesProcessed: 0, startTime: new Date().toISOString() };
    }
}
function saveSession(session) { fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2)); }
function updateSessionStats(results, session) {
    const tokensThisCall = results.reduce((sum, r) => sum + r.stats.tokens, 0);
    return { ...session, calls: session.calls + 1, totalTokens: session.totalTokens + tokensThisCall, filesProcessed: session.filesProcessed + results.length };
}
function getTokenBudgetReport(session, budget) {
    const remaining = budget - session.totalTokens;
    const percentUsed = Math.round((session.totalTokens / budget) * 100);
    return { sessionId: session.sessionId, totalCalls: session.calls, totalTokens: session.totalTokens, budget, remaining,
        percentUsed: percentUsed + '%', status: percentUsed >= 100 ? 'EXCEEDED' : percentUsed >= 80 ? 'WARNING' : 'OK' };
}
const LOG_DIR = path.join(__dirname, 'log');
function writeRunLog(log) {
    try {
        if (!fs.existsSync(LOG_DIR))
            fs.mkdirSync(LOG_DIR, { recursive: true });
        const logFile = path.join(LOG_DIR, `${log.sessionId}.json`);
        const existing = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf-8')) : [];
        existing.push(log);
        fs.writeFileSync(logFile, JSON.stringify(existing, null, 2));
    }
    catch { }
}
function getPositionalArg(start) {
    for (let i = start; i < process.argv.length; i++) {
        if (!process.argv[i].startsWith('-'))
            return process.argv[i];
    }
    return '';
}
function getFlagArg(flag) {
    const idx = process.argv.indexOf(flag);
    return idx > 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}
function getFragmentHealth(results) {
    const total = results.length;
    const withFrontmatter = results.filter(r => r.fragmentMeta).length;
    const withDeps = results.filter(r => r.fragmentMeta && r.fragmentMeta.depends_on.length > 0).length;
    const withWikilinks = results.filter(r => r.stats.totalWikilinks > 0).length;
    const withStatus = results.filter(r => r.fragmentMeta && r.fragmentMeta.status).length;
    const withDescription = results.filter(r => r.fragmentMeta && r.fragmentMeta.description).length;
    const withSource = results.filter(r => r.fragmentMeta && r.fragmentMeta.source).length;
    const noTitle = results.filter(r => r.fragmentMeta && !r.fragmentMeta.title).length;
    const issues = [];
    for (const r of results) {
        const fileIssues = [];
        if (!r.fragmentMeta)
            fileIssues.push('no_frontmatter');
        else {
            if (!r.fragmentMeta.title)
                fileIssues.push('empty_title');
            if (!r.fragmentMeta.source)
                fileIssues.push('no_source');
            if (r.fragmentMeta.depends_on.length === 0 && r.stats.totalWikilinks > 0)
                fileIssues.push('wikilinks_no_depends_on');
        }
        if (fileIssues.length > 0)
            issues.push({ file: r.fileName, issues: fileIssues });
    }
    return { total, withFrontmatter, withDeps, withWikilinks, withStatus, withDescription, withSource, noTitle, filesWithIssues: issues.length, issues };
}
function main() {
    const startTime = Date.now();
    const configPath = path.join(__dirname, 'hooks.toml');
    const config = getTomlConfig(configPath);
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
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
  md-analyzer . --deps --json`);
        process.exit(0);
    }
    if (process.argv.includes('--version') || process.argv.includes('-v')) {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
        console.log(pkg.version);
        process.exit(0);
    }
    const cliDir = getPositionalArg(2);
    const targetDir = cliDir || process.env['MD_ANALYZER_DEFAULT_DIR'] || config['default_directory'] || process.cwd();
    const jsonOnly = process.argv.includes('--json');
    const graphMode = process.argv.includes('--graph');
    const orphansMode = process.argv.includes('--orphans');
    const rankMode = process.argv.includes('--rank');
    const sessionMode = process.argv.includes('--session');
    const keypointsMode = process.argv.includes('--keypoints');
    const depsMode = process.argv.includes('--deps');
    const lintFragmentsMode = process.argv.includes('--lint-fragments');
    const budget = parseInt(getFlagArg('--budget') || '', 10) || 100000;
    const maxResults = parseInt(getFlagArg('--max-results') || '', 10) || 0;
    const backlinksTarget = getFlagArg('--backlinks');
    const searchKeyword = getFlagArg('--search');
    const filterRaw = getFlagArg('--filter');
    const session = loadSession();
    if (!jsonOnly)
        console.log(`Scanning: ${targetDir}\n`);
    const { files: mdFiles, errors: scanErrors } = scanMarkdownFiles(targetDir);
    if (!jsonOnly) {
        console.log(`Found ${mdFiles.length} .md files\n`);
        if (scanErrors.length > 0)
            console.log(`Warnings: ${scanErrors.length} directories skipped\n`);
    }
    let results = mdFiles.map(file => analyzeFile(file));
    if (scanErrors.length > 0 && results.length > 0) {
        if (!results[0].stats.errors)
            results[0].stats.errors = [];
        results[0].stats.errors.push(...scanErrors);
    }
    if (filterRaw && filterRaw.includes('=')) {
        const [key, value] = filterRaw.split('=');
        results = filterByMetadata(results, key, value);
        if (!jsonOnly)
            console.log(`Filtered by ${key}=${value}: ${results.length} results\n`);
    }
    if (searchKeyword) {
        results = searchContent(results, searchKeyword);
        if (!jsonOnly)
            console.log(`Search "${searchKeyword}": ${results.length} results\n`);
    }
    if (rankMode && searchKeyword) {
        results = rankByRelevance(results, searchKeyword);
        if (!jsonOnly)
            console.log(`Ranked by relevance to "${searchKeyword}"\n`);
    }
    let limitedResults = results;
    if (maxResults > 0 && results.length > maxResults) {
        if (!jsonOnly)
            console.log(`Warning: Limiting output to ${maxResults} of ${results.length} results\n`);
        limitedResults = results.slice(0, maxResults);
    }
    const updatedSession = updateSessionStats(results, session);
    saveSession(updatedSession);
    const tokensThisCall = results.reduce((sum, r) => sum + r.stats.tokens, 0);
    if (sessionMode)
        console.log(JSON.stringify(getTokenBudgetReport(updatedSession, budget), null, 2));
    else if (keypointsMode)
        console.log(JSON.stringify(limitedResults.map(doc => extractKeyPoints(doc)), null, 2));
    else if (lintFragmentsMode)
        console.log(JSON.stringify(getFragmentHealth(limitedResults), null, 2));
    else if (depsMode) {
        const graph = buildGraph(limitedResults);
        console.log(JSON.stringify({ nodes: Object.keys(graph.nodes), edges: graph.edges, tokensThisCall }, null, 2));
    }
    else if (orphansMode) {
        const orphans = findOrphans(buildGraph(limitedResults));
        console.log(JSON.stringify({ orphans, count: orphans.length, tokensThisCall }, null, 2));
    }
    else if (backlinksTarget) {
        const backlinks = findBacklinks(limitedResults, backlinksTarget);
        console.log(JSON.stringify({ target: backlinksTarget, backlinks, count: backlinks.length, tokensThisCall }, null, 2));
    }
    else if (graphMode)
        console.log(JSON.stringify(buildGraph(limitedResults), null, 2));
    else {
        if (!jsonOnly) {
            console.log(`\nTokens this call: ${tokensThisCall}`);
            console.log(`Total session tokens: ${updatedSession.totalTokens}\n`);
        }
        ;
        console.log(JSON.stringify(limitedResults, null, 2));
    }
    const flags = process.argv.slice(2).filter(a => a.startsWith('--')).map(a => a.replace(/=.*/, ''));
    const mode = depsMode ? 'deps' : lintFragmentsMode ? 'lint-fragments' : sessionMode ? 'session' : keypointsMode ? 'keypoints' : orphansMode ? 'orphans' : backlinksTarget ? 'backlinks' : graphMode ? 'graph' : searchKeyword ? 'search' : 'default';
    writeRunLog({
        timestamp: new Date().toISOString(),
        sessionId: updatedSession.sessionId,
        directory: targetDir,
        flags,
        filesFound: mdFiles.length,
        filesProcessed: results.length,
        tokensThisCall,
        totalSessionTokens: updatedSession.totalTokens,
        errors: scanErrors,
        durationMs: Date.now() - startTime,
        mode
    });
}
main();
//# sourceMappingURL=md-analyzer.js.map