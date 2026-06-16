import * as fs from 'fs'
import * as path from 'path'
import { AnalyzerConfigSchema } from '../core/schema.js'
import type { AnalyzerConfig } from '../core/schema.js'

const DEFAULT_CONFIG: AnalyzerConfig = AnalyzerConfigSchema.parse({})

export function getTomlConfig(tomlPath: string): AnalyzerConfig {
  try {
    const content = fs.readFileSync(tomlPath, 'utf-8')
    const config: Record<string, string> = {}
    let inConfigSection = false
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed === '[tool.md-analyzer.config]') { inConfigSection = true; return }
      if (inConfigSection) {
        if (trimmed.startsWith('[')) { inConfigSection = false; return }
        if (trimmed.includes('=')) {
          const separatorIdx = trimmed.indexOf('=')
          const key = trimmed.substring(0, separatorIdx).trim()
          const value = trimmed.substring(separatorIdx + 1).trim().replace(/^["']|["']$/g, '')
          config[key] = value
        }
      }
    })
    return {
      default_directory: config['default_directory'] || DEFAULT_CONFIG.default_directory,
      default_budget: parseInt(config['default_budget'] || '', 10) || DEFAULT_CONFIG.default_budget,
      max_tokens: parseInt(config['max_tokens'] || '', 10) || DEFAULT_CONFIG.max_tokens,
      max_results_default: parseInt(config['max_results_default'] || '', 10) || DEFAULT_CONFIG.max_results_default,
      session_file: config['session_file'] || DEFAULT_CONFIG.session_file,
    }
  } catch (e: unknown) {
    console.error('config_load_error: could not read hooks.toml:', e instanceof Error ? e.message : e)
    return { ...DEFAULT_CONFIG }
  }
}

export function resolveConfigPath(): string {
  const candidates = [
    path.join(__dirname, '..', '..', 'hooks.toml'),
    path.join(__dirname, '..', 'hooks.toml'),
    path.join(process.cwd(), 'hooks.toml'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return candidates[0]
}
