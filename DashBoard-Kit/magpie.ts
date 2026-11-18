import { fetch } from "scripting"
import { DEFAULT_MAGPIE, MetricBalanceData } from "./types"

// ============================================================
// Magpie / 通用 OpenAI 兼容 API 网关 —— 余额与用量看板数据层
// 所有凭据均由用户在设置页自行填写，不内置任何密钥。
// ============================================================

export const MAGPIE_ENDPOINT_KEY = "dashboard_kit_magpie_endpoint"
export const MAGPIE_KEY = "dashboard_kit_magpie_key"
export const MAGPIE_QUOTA_PATH_KEY = "dashboard_kit_magpie_quota_path"
export const MAGPIE_CACHE_KEY = "dashboard_kit_magpie_cache_v1"
const MAGPIE_FILE_CACHE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_magpie_cache.json"

/** 常见网关用量接口路径（用户可自定义覆盖，逐个尝试） */
const DEFAULT_QUOTA_PATHS = [
  "/",
  "/api/user/self",
  "/api/status",
  "/api/user/info",
  "/api/user/dashboard",
  "/dashboard/api/data",
  "/v1/dashboard",
  "/api/usage",
  "/v1/usage",
]

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
  return !!(getMagpieSettings().endpoint || "").trim()
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
 * 解析用户粘贴的「管理台链接」，例如 http://host:3430/?k=xxx
 * 自动拆出 根地址 与 密钥（兼容 k / key / token / api_key 参数名）。
 * 也兼容只填裸地址或带 /v1 的 API 地址。
 */
export function parseMagpieInput(input: string): { endpoint: string; apiKey: string } {
  let raw = (input || "").trim()
  if (!raw) return { endpoint: "", apiKey: "" }
  if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`

  // 根地址 = 协议 + 主机 + 端口，丢掉路径/查询/片段
  const m = raw.match(/^(https?:\/\/[^/?#]+)/i)
  let endpoint = m ? m[1] : raw
  endpoint = endpoint.replace(/\/v1\/?$/i, "").replace(/\/+$/i, "")

  // 从查询参数里取密钥
  let apiKey = ""
  const q = raw.match(/[?&](?:k|key|token|api_key|auth)=([^&#]+)/i)
  if (q) {
    try {
      apiKey = decodeURIComponent(q[1])
    } catch {
      apiKey = q[1]
    }
  }
  return { endpoint, apiKey }
}

function normalizeBase(input: string): string {
  let base = (input || "").trim()
  if (!base) return ""
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`
  base = base.replace(/\/+$/i, "")
  base = base.replace(/\/v1\/?$/i, "")
  return base.replace(/\/+$/i, "")
}

/** 给探测 URL 追加上 ?k= 鉴权参数（管理台链接的鉴权方式） */
function withKeyParam(url: string, key: string): string {
  if (!key) return url
  return url + (url.includes("?") ? "&" : "?") + "k=" + encodeURIComponent(key)
}

function num(v: any): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/[,¥$%\s]/g, ""))
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/** 从网关返回的任意 JSON 中智能提取额度信息 */
function extractQuota(json: any): {
  remaining?: number
  total?: number
  used?: number
  requests?: number
  currency?: string
  rawExists: boolean
} {
  if (!json || typeof json !== "object") return { rawExists: false }

  // 兼容 data/user 包裹
  const d = json.data && typeof json.data === "object" ? json.data : json
  const u = d.user && typeof d.user === "object" ? d.user : d

  const pick = (...keys: string[]): any => {
    for (const k of keys) {
      const val = u?.[k] ?? d?.[k] ?? json?.[k]
      if (val !== undefined && val !== null) return val
    }
    return undefined
  }

  const remaining =
    num(pick("remaining_quota", "remainingQuota", "quota_remaining", "balance", "credit", "credits", "remaining", "可用额度", "剩余额度", "余额")) ??
    undefined
  const total =
    num(pick("total_quota", "totalQuota", "quota_total", "total_credit", "total", "quota", "总额度")) ??
    undefined
  const used =
    num(pick("used_quota", "usedQuota", "quota_used", "used", "consumed", "已用", "已消费")) ??
    undefined
  const requests =
    num(pick("request_count", "requestCount", "requests", "total_requests", "call_count", "请求次数", "调用次数")) ??
    undefined
  const currency = String(pick("currency", "unit", "币种") || "")

  return {
    remaining,
    total,
    used,
    requests,
    currency,
    rawExists: remaining !== undefined || total !== undefined || used !== undefined || requests !== undefined,
  }
}

function formatNum(n: number, currency?: string): string {
  const val = n >= 1000 ? n.toLocaleString() : String(Math.round(n * 100) / 100)
  return currency && /^[¥$€]/i.test(currency) ? `${currency}${val}` : val
}

/**
 * 刷新 Magpie 网关数据。
 * 用户填写网关地址 + 密钥；额度接口路径可选（留空则自动尝试常见路径）。
 */
export async function refreshMagpieData(): Promise<MetricBalanceData | null> {
  const settings = getMagpieSettings()
  const base = normalizeBase(settings.endpoint || "")
  if (!base) return null

  const apiKey = (settings.apiKey || "").trim()
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`
    headers["x-api-key"] = apiKey
  }

  const customPath = (settings.quotaPath || "").trim()
  const paths = customPath ? [customPath.startsWith("/") ? customPath : `/${customPath}`] : DEFAULT_QUOTA_PATHS

  for (const path of paths) {
    try {
      // 管理台 ?k= 鉴权 + Bearer/x-api-key 头 同时带上，最大化兼容
      const url = withKeyParam(`${base}${path}`, apiKey)
      const res = await fetch(url, { method: "GET", headers, timeout: 10 })
      if (!res.ok) continue
      const json: any = await res.json().catch(() => null)
      const q = extractQuota(json)
      if (!q.rawExists) continue

      const remaining = q.remaining ?? (q.total !== undefined && q.used !== undefined ? Math.max(0, q.total - q.used) : undefined)
      const used = q.used ?? (q.total !== undefined && remaining !== undefined ? Math.max(0, q.total - remaining) : undefined)
      const pct =
        q.total && q.total > 0 && remaining !== undefined
          ? Math.max(0, Math.min(100, Math.round((remaining / q.total) * 1000) / 10))
          : DEFAULT_MAGPIE.progressPct

      const data: MetricBalanceData = {
        ...DEFAULT_MAGPIE,
        statusText: "在线",
        mainLabel: "剩余额度",
        mainValue: remaining !== undefined ? formatNum(remaining, q.currency) : (used !== undefined ? formatNum(used, q.currency) : "--"),
        prefix: "",
        progressPct: pct,
        subLabel1: "已用",
        subValue1: used !== undefined ? formatNum(used, q.currency) : "--",
        subLabel2: "请求次数",
        subValue2: q.requests !== undefined ? q.requests.toLocaleString() : "--",
        footerLeft: q.currency ? `币种 ${q.currency}` : `网关 ${base.replace(/^https?:\/\//i, "")}`,
        updatedAt: new Date().toISOString(),
      }
      saveMagpieData(data)
      return data
    } catch (e) {
      console.log(`Magpie 额度接口 ${path} 尝试失败:`, e)
    }
  }
  return null
}
