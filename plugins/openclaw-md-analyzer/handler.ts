import { execFile } from "child_process/promises"

const KEYPOINTS_CACHE = new Map<string, string>()

const handler = async (tool: string, input: any) => {
  if (tool !== "read") return input

  const path = input?.path ?? input?.filePath
  if (!path || typeof path !== "string") return input
  if (!path.endsWith(".md") && !path.endsWith(".txt")) return input

  const cached = KEYPOINTS_CACHE.get(path)
  if (cached) {
    console.log("[md-analyzer]", cached)
    return input
  }

  try {
    const { stdout } = await execFile("md-analyzer", [path, "--keypoints", "--json"])
    const outline = stdout.trim()
    if (outline) {
      KEYPOINTS_CACHE.set(path, outline)
      console.log("[md-analyzer]", outline)
    }
  } catch {
    // md-analyzer unavailable — read proceeds normally
  }

  return input
}

export default handler
