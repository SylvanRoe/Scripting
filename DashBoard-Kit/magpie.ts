import { fetch } from "scripting"
import { DEFAULT_MAGPIE, MetricBalanceData } from "./types"

// ============================================================
// Magpie Web 今日用量总览
// 配置只存本机 Keychain；源码不内置任何地址或密钥。
// ============================================================

export const MAGPIE_ENDPOINT_KEY = "dashboard_kit_magpie_endpoint"
export const MAGPIE_KEY = "dashboard_kit_magpie_key"
// 保留旧键，方便升级时清理旧版手动路径设置
export const MAGPIE_QUOTA_PATH_KEY = "dashboard_kit_magpie_quota_path"
export const MAGPIE_CACHE_KEY = "dashboard_kit_magpie_cache_v1"
const MAGPIE_FILE_CACHE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_magpie_cache.json"
const USAGE_PATH = "/api/usage/requests?period=today&limit=1"

export interface MagpieSettings {
  endpoint?: string
  apiKey?: string
  quotaPath?: string
}

export function getMagpieSettings(): MagpieSettings {
  const s: MagpieSettings = {}
  try {
    if (Keychain.contains(MAGPIE_ENDPOINT_KEY)) s.endpoint = Keychain.get(MAGPIE_ENDPOINT_KEY) || ""
    if (Keychain.contains(MAGPIE_KEY)) s.apiKey = Keychain.get(MAGPIE_KEY) || ""
    if (Keychain.contains(MAGPIE_QUOTA_PATH_KEY)) s.quotaPath = Keychain.get(MAGPIE_QUOTA_PATH_KEY) || ""
  } catch {}
  return s
}

export function hasMagpieConfigured(): boolean {
  const s = getMagpieSettings()
  return !!(s.endpoint || "").trim() && !!(s.apiKey || "").trim()
}

export function saveMagpieData(data: MetricBalanceData) {
  try {
    Storage.set(MAGPIE_CACHE_KEY, data, { shared: true })
    Storage.set(MAGPIE_CACHE_KEY, data)
    FileManager.writeAsStringSync(MAGPIE_FILE_CACHE_PATH, JSON.stringify(data))
  } catch {}
}

export function getMagpieData(): MetricBalanceData {
  try {
    const local =
      Storage.get<MetricBalanceData>(MAGPIE_CACHE_KEY, { shared: true }) ||
      Storage.get<MetricBalanceData>(MAGPIE_CACHE_KEY)
    let fromFile: MetricBalanceData | null = null
    if (FileManager.existsSync(MAGPIE_FILE_CACHE_PATH)) {
      try {
        const raw = FileManager.readAsStringSync(MAGPIE_FILE_CACHE_PATH)
        if (raw) fromFile = JSON.parse(raw)
      } catch {}
    }
    if (fromFile && fromFile.serviceId === "magpie") {
      const tf = Date.parse(fromFile.updatedAt || "") || 0
      const ts = Date.parse(local?.updatedAt || "") || 0
      if (!local || tf >= ts) return { ...DEFAULT_MAGPIE, ...fromFile, serviceId: "magpie" }
    }
    if (local && local.serviceId === "magpie") {
      return { ...DEFAULT_MAGPIE, ...local, serviceId: "magpie" }
    }
  } catch {}
  return DEFAULT_MAGPIE
}

/**
 * 解析用户粘贴的管理台链接，例如 http://host:port/?k=xxx。
 * 自动拆出根地址与密钥；也兼容裸地址和带 /v1 的地址。
 */
export function parseMagpieInput(input: string): { endpoint: string; apiKey: string } {
  let raw = (input || "").trim()
  if (!raw) return { endpoint: "", apiKey: "" }
  if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`

  const m = raw.match(/^(https?:\/\/[^/?#]+)/i)
  let endpoint = m ? m[1] : raw
  endpoint = endpoint.replace(/\/v1\/?$/i, "").replace(/\/+$/i, "")

  let apiKey = ""
  const q = raw.match(/[?&](?:k|key|token|api_key|auth)=([^&#]+)/i)
  if (q) {
    try { apiKey = decodeURIComponent(q[1]) } catch { apiKey = q[1] }
  }
  return { endpoint, apiKey }
}

function normalizeBase(input: string): string {
  let base = (input || "").trim()
  if (!base) return ""
  if (!/^https?:\/\//i.test(base)) base = `http://${base}`
  return base.replace(/\/+$/i, "").replace(/\/v1\/?$/i, "").replace(/\/+$/i, "")
}

function withKeyParam(url: string, key: string): string {
  if (!key) return url
  return url + (url.includes("?") ? "&" : "?") + "k=" + encodeURIComponent(key)
}

/** 从 Scripting fetch 响应中取 Set-Cookie，只保留 name=value。 */
function pickSetCookie(res: any): string {
  try {
    const h = res?.headers || {}
    const map = h.map || {}
    const sc = map["set-cookie"] || map["Set-Cookie"] || h.setCookieList || h["set-cookie"] || ""
    if (Array.isArray(sc)) {
      return sc.map((x: any) => String(x).split(";")[0].trim()).filter(Boolean).join("; ")
    }
    return String(sc || "").split(";")[0].trim()
  } catch { return "" }
}

/**
 * Magpie Web 鉴权：GET /?k=KEY 返回 303 + Set-Cookie。
 * 必须取消自动重定向，否则最终 200 响应里看不到原始 Set-Cookie。
 */
async function establishSession(base: string, apiKey: string): Promise<string> {
  if (!apiKey) return ""
  try {
    const r = await fetch(withKeyParam(`${base}/`, apiKey), {
      method: "GET",
      timeout: 6,
      allowInsecureRequest: base.startsWith("http://"),
      handleRedirect: async () => null,
    })
    return pickSetCookie(r)
  } catch { return "" }
}

function n(v: any): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function compact(v: number): string {
  const x = Math.max(0, v)
  const trim = (s: string) => s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s
  if (x >= 1_000_000_000) return `${trim((x / 1_000_000_000).toFixed(2))}B`
  if (x >= 1_000_000) return `${trim((x / 1_000_000).toFixed(2))}M`
  if (x >= 1_000) return `${trim((x / 1_000).toFixed(1))}K`
  return Math.round(x).toLocaleString()
}

function parseUsage(json: any): MetricBalanceData | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null

  const calls = n(json.calls)
  const errors = n(json.errors)
  const input = n(json.input)
  const output = n(json.output)
  const cacheRead = n(json.cache_read)
  const cacheWrite = n(json.cache_write)
  const cacheUnknown = n(json.cache_unknown)
  const cost = n(json.cost)
  const totalTokens = input + output + cacheRead + cacheWrite

  // 与 Magpie Web 前端公式一致：缓存读取 / 可判定的总 prompt token。
  const prompt = Math.max(0, input + cacheRead + cacheWrite - cacheUnknown)
  const hitRate = prompt > 0 ? Math.max(0, Math.min(100, (cacheRead / prompt) * 100)) : 0
  const successRate = calls > 0 ? Math.max(0, Math.min(100, ((calls - errors) / calls) * 100)) : 100

  const providers = Array.isArray(json.providers)
    ? json.providers.length
    : Array.isArray(json?.by?.provider)
      ? json.by.provider.length
      : 0

  return {
    ...DEFAULT_MAGPIE,
    statusText: "在线",
    mainLabel: "今日 Tokens",
    mainValue: compact(totalTokens),
    prefix: "",
    progressPct: Math.round(hitRate * 10) / 10,
    subLabel1: "请求",
    subValue1: Math.round(calls).toLocaleString(),
    subLabel2: "成功率",
    subValue2: `${(Math.round(successRate * 10) / 10).toFixed(1)}%`,
    footerLeft: `$${cost.toFixed(2)} · ${providers}个供应商`,
    updatedAt: new Date().toISOString(),
  }
}

/** 刷新 Magpie 今日用量：Token、缓存命中率、请求数、成功率、费用、供应商数。 */
export async function refreshMagpieData(): Promise<MetricBalanceData | null> {
  const settings = getMagpieSettings()
  const base = normalizeBase(settings.endpoint || "")
  const apiKey = (settings.apiKey || "").trim()
  if (!base || !apiKey) return null

  const seed: MetricBalanceData = {
    ...DEFAULT_MAGPIE,
    statusText: "已配置",
    mainLabel: "正在连接网关",
    mainValue: "--",
    footerLeft: "等待首次用量同步",
    updatedAt: new Date().toISOString(),
  }
  const existing = getMagpieData()
  if (existing.statusText === "未配置" || existing.statusText === "等待更新") saveMagpieData(seed)

  const cookie = await establishSession(base, apiKey)
  if (!cookie) return getMagpieData()

  try {
    const res = await fetch(`${base}${USAGE_PATH}`, {
      method: "GET",
      headers: { Accept: "application/json", Cookie: cookie },
      timeout: 12,
      allowInsecureRequest: base.startsWith("http://"),
    })
    if (res.ok) {
      const json: any = await res.json().catch(() => null)
      const data = parseUsage(json)
      if (data) {
        saveMagpieData(data)
        return data
      }
    }
  } catch (e) {
    console.log("Magpie 今日用量刷新失败:", e)
  }
  return getMagpieData()
}
