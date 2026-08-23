/**
 * 配置读写。使用 Storage（脚本私有域），index.tsx 与 widget.tsx 共享。
 */
import { DEFAULT_SETTINGS, type SGCCSettings } from './types'

const KEY = 'sgcc.settings'

export function loadSettings(): SGCCSettings {
  const raw = Storage.get<Partial<SGCCSettings>>(KEY)
  // 与默认值合并，保证新增字段有兜底
  const merged = !raw || typeof raw !== 'object'
    ? { ...DEFAULT_SETTINGS }
    : { ...DEFAULT_SETTINGS, ...raw }
  // 阶梯口径仅保留「按年累计」；临时让旧的按月配置也退回到年度
  merged.stepMode = '年'
  return merged
}

export function saveSettings(settings: SGCCSettings): boolean {
  return Storage.set(KEY, settings)
}

export function resetSettings(): void {
  Storage.remove(KEY)
}
