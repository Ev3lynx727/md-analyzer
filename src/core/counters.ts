import { encodingForModel } from 'js-tiktoken'

export function countStats(content: string): { wordCount: number; charCount: number; lineCount: number; codeBlocks: number; tokens: number } {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
  const charCount = content.length
  const lineCount = content.split('\n').length
  const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length
  let tokens = 0
  try {
    tokens = encodingForModel('gpt-4').encode(content).length
  } catch (e: unknown) {
    console.error('token_count_fallback: tiktoken unavailable, using estimate:', e instanceof Error ? e.message : e)
    tokens = Math.ceil(charCount / 4)
  }
  return { wordCount, charCount, lineCount, codeBlocks, tokens }
}
