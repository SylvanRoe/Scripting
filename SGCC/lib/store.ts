/**
 * 配置读写。使用 Storage（脚本私有域），index.tsx 与 widget.tsx 共享。
 */
import { DEFAULT_SETTINGS, type SGCCSettings } from './types'

const KEY = 'sgcc.settings'

export function loadSettings(): SGCCSettings {
  const raw = Storage.get<Partial<SGCCSettings>>(KEY)
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS }
  }
  // 与默认值合并，保证新增字段有兜底
  return { ...DEFAULT_SETTINGS, ...raw }
}

export function saveSettings(settings: SGCCSettings): boolean {
  return Storage.set(KEY, settings)
}

export function resetSettings(): void {
  Storage.remove(KEY)
}
