import { Color, Widget } from "scripting"

export interface Drink { id: string; name: string; icon: string; color: Color }
export interface DrinkRecord {
  id: string
  drinkTypeId: string
  ml: number
  timestamp: string
  healthState?: "pending" | "syncing" | "synced" | "failed"
  healthSampleUUID?: string
}
export const DRINKS: Drink[] = [
  { id: "water", name: "水", icon: "drop.fill", color: "#3B82F6" },
  { id: "tea", name: "茶", icon: "leaf.fill", color: "#22A064" },
  { id: "coffee", name: "咖啡", icon: "cup.and.saucer.fill", color: "#A06B45" },
  { id: "juice", name: "果汁", icon: "carrot.fill", color: "#F08A24" },
  { id: "milk", name: "牛奶", icon: "waterbottle.fill", color: "#6996B5" },
  { id: "soda", name: "汽水", icon: "bubbles.and.sparkles.fill", color: "#D9559A" },
  { id: "sports", name: "运动饮料", icon: "bolt.fill", color: "#BE960C" },
  { id: "soup", name: "汤", icon: "takeoutbag.and.cup.and.straw.fill", color: "#9965CA" },
]
export const KEYS = {
  records: "drink_records_today", goal: "drink_daily_goal", ml: "drink_custom_ml",
  drinks: "drink_widget_drinks", health: "drink_sync_to_health", history: "drink_daily_history",
} as const
const DEFAULT_DRINKS = ["water", "tea", "coffee", "juice"]

export function put<T>(key: string, value: T) {
  if (!Storage.set(key, value)) throw new Error("保存失败，请稍后重试")
}
export function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
}
export function parseAmount(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return positiveInteger(value) ? value : null
}
export function loadGoal(): number {
  const value = Storage.get<unknown>(KEYS.goal)
  return positiveInteger(value) ? value : 2000
}
export function loadMl(): number {
  const value = Storage.get<unknown>(KEYS.ml)
  return positiveInteger(value) ? value : 250
}
export function loadHealth(): boolean { return Storage.get<unknown>(KEYS.health) === true }
export function loadSelected(): string[] {
  const value = Storage.get<unknown>(KEYS.drinks)
  const defaultSelected = ["water", "tea"]
  if (!Array.isArray(value)) return defaultSelected
  const ids = DRINKS.map(d => d.id)
  const selected = value.filter((id): id is string => typeof id === "string" && ids.includes(id))
  if (!selected.length) return ["water"]
  return selected.slice(0, 2)
}
function rawRecords(): unknown[] {
  const value = Storage.get<unknown>(KEYS.records)
  if (value === null) return []
  if (!Array.isArray(value)) throw new Error("记录数据格式异常，已停止修改以保护原数据")
  return value
}
export function isRecord(value: unknown): value is DrinkRecord {
  if (typeof value !== "object" || value === null) return false
  const record = value as Partial<DrinkRecord>
  return typeof record.id === "string" && typeof record.drinkTypeId === "string"
    && positiveInteger(record.ml) && typeof record.timestamp === "string"
    && Number.isFinite(new Date(record.timestamp).getTime())
}
export function loadRecords(): DrinkRecord[] { return rawRecords().filter(isRecord) }
export function todayRecords(records: DrinkRecord[], now = new Date()): DrinkRecord[] {
  return records.filter(r => new Date(r.timestamp).toDateString() === now.toDateString())
}
export function totalMl(records: DrinkRecord[]): number { return records.reduce((sum, r) => sum + r.ml, 0) }
export function drinkFor(id: string): Drink { return DRINKS.find(d => d.id === id) ?? { id, name: "其他饮品", icon: "drop.fill", color: "#6996B5" } }

// records 是唯一事实来源；历史汇总只是兼容旧版本的缓存，不影响记录是否成功。
function refreshHistory(now: Date) {
  try {
    const saved = Storage.get<unknown>(KEYS.history)
    const history = saved && typeof saved === "object" && !Array.isArray(saved) ? { ...saved } : {}
    put(KEYS.history, { ...history, [now.toDateString()]: totalMl(todayRecords(loadRecords(), now)) })
  } catch (error) { console.error("历史缓存更新失败", error) }
  Widget.reloadAll()
}
export function addRecord(drinkTypeId: string, ml: number): DrinkRecord {
  if (!DRINKS.some(d => d.id === drinkTypeId) || !positiveInteger(ml)) throw new Error("请选择饮品并输入正整数容量")
  const now = new Date()
  const record: DrinkRecord = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
    drinkTypeId, ml, timestamp: now.toISOString(),
    ...(drinkTypeId === "water" && loadHealth() ? { healthState: "pending" as const } : {}),
  }
  // 每次读取最新存储，避免页面的旧状态覆盖小组件新增的记录。
  put(KEYS.records, [...rawRecords(), record])
  refreshHistory(now)
  return record
}
export function removeRecords(ids: string[]) {
  const raw = rawRecords()
  const dates = raw.filter(isRecord).filter(r => ids.includes(r.id)).map(r => new Date(r.timestamp))
  put(KEYS.records, raw.filter(r => !isRecord(r) || !ids.includes(r.id)))
  dates.forEach(refreshHistory)
  Widget.reloadAll()
}
export function patchRecord(id: string, patch: Partial<DrinkRecord>) {
  const raw = rawRecords()
  if (!raw.some(r => isRecord(r) && r.id === id)) throw new Error("记录已不存在")
  put(KEYS.records, raw.map(r => isRecord(r) && r.id === id ? { ...r, ...patch } : r))
}

// 仅显式调用此函数时访问健康数据；预览及小组件不会请求健康权限。
// 旧记录无同步标记，不补写，避免重复导入旧版本可能已经写入的健康样本。
export async function syncPendingWater(): Promise<string> {
  if (!loadHealth()) throw new Error("请先开启健康同步")
  if (!Health.isHealthDataAvailable) throw new Error("此设备不支持健康数据")
  const pending = loadRecords().filter(r => r.drinkTypeId === "water" && (r.healthState === "pending" || r.healthState === "failed"))
  let count = 0
  for (const record of pending) {
    const date = new Date(record.timestamp)
    const sample = HealthQuantitySample.create({
      type: "dietaryWater", value: record.ml, unit: HealthUnit.fromString("mL"),
      startDate: date, endDate: date,
      metadata: { "drinkRecord.id": record.id, "drinkRecord.project": "喝水记录" },
    })
    if (!sample) throw new Error("无法创建健康样本；本地记录仍然保留")
    // 写入前保存中间状态；若进程中断，不会在下次点击时自动重复写入。
    patchRecord(record.id, { healthState: "syncing", healthSampleUUID: sample.uuid })
    try { await Health.saveQuantitySample(sample) }
    catch (error) {
      patchRecord(record.id, { healthState: "failed" })
      throw new Error(`已同步 ${count} 条，其余保留在本地。健康写入失败：${String(error)}`)
    }
    patchRecord(record.id, { healthState: "synced" })
    count++
  }
  return count ? `已同步 ${count} 条饮水记录` : "没有待同步的饮水记录"
}
