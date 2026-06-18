import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg',
  'services', 'data', 'appendonlydir',
  'dist', 'build', '__pycache__', '.next', 'coverage'
])

export const SESSION_FILE = '/tmp/md-analyzer-session.json'

export const LOG_DIR = path.join(__dirname, '..', '..', 'log')
