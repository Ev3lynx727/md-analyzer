import * as path from 'path'

export const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg',
  'services', 'data', 'appendonlydir',
  'dist', 'build', '__pycache__', '.next', 'coverage'
])

export const SESSION_FILE = '/tmp/md-analyzer-session.json'

export const LOG_DIR = path.join(__dirname, '..', '..', 'log')
