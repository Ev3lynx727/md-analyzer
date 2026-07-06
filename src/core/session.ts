import * as fs from 'fs'
import * as path from 'path'
import { SESSION_FILE } from '../utils/constants.js'
import type { AnalysisResult, SessionStats } from '../types/index.js'

export function loadSession(): SessionStats {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
  } catch (e: unknown) {
    console.error('session_load: new session created')
    return { sessionId: `session-${Date.now()}`, calls: 0, totalTokens: 0, filesProcessed: 0, startTime: new Date().toISOString() }
  }
}

export function saveSession(session: SessionStats): void {
  try {
    const dir = path.dirname(SESSION_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2))
  } catch (e: unknown) {
    console.error('session_save_error:', e instanceof Error ? e.message : e)
  }
}

export function updateSessionStats(results: AnalysisResult[], session: SessionStats): SessionStats {
  const tokensThisCall = results.reduce((sum, r) => sum + r.stats.tokens, 0)
  return { ...session, calls: session.calls + 1, totalTokens: session.totalTokens + tokensThisCall, filesProcessed: session.filesProcessed + results.length }
}

export function getTokenBudgetReport(session: SessionStats, budget: number): object {
  const remaining = budget - session.totalTokens
  const percentUsed = Math.round((session.totalTokens / budget) * 100)
  return {
    sessionId: session.sessionId, totalCalls: session.calls, totalTokens: session.totalTokens, budget, remaining,
    percentUsed: percentUsed + '%', status: percentUsed >= 100 ? 'EXCEEDED' : percentUsed >= 80 ? 'WARNING' : 'OK'
  }
}
