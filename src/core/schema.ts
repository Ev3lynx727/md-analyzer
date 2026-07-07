import { z } from 'zod'
import * as path from 'path'
import * as os from 'os'

const defaultSessionFile = path.join(os.homedir(), '.local', 'share', 'md-analyzer', 'tokens', 'md-analyzer-session.json')

export const CliOptions = z.object({
  directory: z.string().optional(),
  json: z.boolean().default(false),
  search: z.string().min(1, 'Search keyword cannot be empty').optional(),
  filter: z.string().regex(/^[^=]+=.+$/, 'Filter must be in format key=value').optional(),
  rank: z.boolean().default(false),
  graph: z.boolean().default(false),
  deps: z.boolean().default(false),
  orphans: z.boolean().default(false),
  backlinks: z.string().min(1, 'Backlinks target cannot be empty').optional(),
  keypoints: z.boolean().default(false),
  lintFragments: z.boolean().default(false),
  summary: z.boolean().default(false),
  watch: z.boolean().default(false),
  session: z.boolean().default(false),
  budget: z.number().int().positive('Budget must be a positive integer').default(100000),
  maxResults: z.number().int().nonnegative('max-results must be non-negative').default(0),
})

export type CliOptions = z.infer<typeof CliOptions>

export const AnalyzerConfigSchema = z.object({
  default_directory: z.string().default(''),
  default_budget: z.number().int().positive().default(100000),
  max_tokens: z.number().int().positive().default(200000),
  max_results_default: z.number().int().nonnegative().default(20),
  session_file: z.string().default(defaultSessionFile),
})

export type AnalyzerConfig = z.infer<typeof AnalyzerConfigSchema>
