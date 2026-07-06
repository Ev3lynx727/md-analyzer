import * as path from 'path'
import * as os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg',
  'services', 'data', 'appendonlydir',
  'dist', 'build', '__pycache__', '.next', 'coverage'
])

// Get STATE_DIR from env, default to XDG data dir (~/.local/share/md-analyzer)
const STATE_DIR = process.env.STATE_DIR || path.join(os.homedir(), '.local', 'share', 'md-analyzer')
export const SESSION_FILE = path.join(STATE_DIR, 'tokens', 'md-analyzer-session.json')

// Get LOG_DIR from env, default to XDG state dir (~/.local/state/md-analyzer)
export const LOG_DIR = process.env.LOG_DIR || path.join(os.homedir(), '.local', 'state', 'md-analyzer', 'log')
