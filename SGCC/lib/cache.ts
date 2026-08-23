/**
 * 文件缓存。必须使用 appGroupDocumentsDirectory —— 只有该目录小组件进程可读写。
 */
import { Path } from 'scripting'

const CACHE_DIR = Path.join(FileManager.appGroupDocumentsDirectory, 'SGCC')

function ensureDir(): void {
  if (!FileManager.existsSync(CACHE_DIR)) {
    FileManager.createDirectorySync(CACHE_DIR, true)
  }
}

function pathFor(key: string): string {
  return Path.join(CACHE_DIR, key)
}

export function readCache(key: string): string | null {
  const file = pathFor(key)
  if (!FileManager.existsSync(file)) return null
  try {
    const content = FileManager.readAsStringSync(file)
    return content.length > 0 ? content : null
  } catch {
    return null
  }
}

export function writeCache(key: string, content: string): void {
  try {
    ensureDir()
    FileManager.writeAsStringSync(pathFor(key), content)
  } catch (e) {
    console.error(`缓存写入失败: ${e}`)
  }
}

/** 缓存写入距今的分钟数；无缓存返回 -1 */
export function cacheAgeMinutes(key: string): number {
  const file = pathFor(key)
  if (!FileManager.existsSync(file)) return -1
  try {
    const stat = FileManager.statSync(file)
    const raw = stat.modificationDate
    if (!raw) return -1
    // 兼容秒级 / 毫秒级时间戳
    const ms = raw > 1e12 ? raw : raw * 1000
    return Math.floor((Date.now() - ms) / 60000)
  } catch {
    return -1
  }
}

export function clearCache(): void {
  if (FileManager.existsSync(CACHE_DIR)) {
    FileManager.removeSync(CACHE_DIR)
  }
}

export { CACHE_DIR }
