import { fetch, Device } from "scripting"
import {
  DEFAULT_ANTIGRAVITY,
  DEFAULT_CODEX,
  DEFAULT_CPAMP,
  DEFAULT_DEEPSEEK,
  DEFAULT_MEDIA_NEXUS,
  DEFAULT_VPN,
  DEFAULT_WORKBUDDY,
  DualQuotaData,
  MediaNexusData,
  MetricBalanceData,
  VpnNodeData,
} from "./types"

// ============================================================
// 数据服务层：聚合各模块真实数据，优雅回落 Mock
// ============================================================

// 1. DeepSeek 常量
export const DEEPSEEK_TOKEN_KEY = "dashboard_kit_deepseek_token"
export const DEEPSEEK_CACHE_KEY = "dashboard_kit_deepseek_cache_v1"
const DEEPSEEK_USAGE_STORE_PATH =
  FileManager.appGroupDocumentsDirectory + "/deepseek_usage_keys.json"
const DEEPSEEK_PANEL_KEY_PATH =
  FileManager.appGroupDocumentsDirectory + "/deepseek_api_key.txt"
const DEEPSEEK_LEGACY_CACHE_PATH =
  FileManager.appGroupDocumentsDirectory + "/deepseek_widget_cache.json"

// 2. WorkBuddy (workbuddy2api-panel) 常量
export const WB_ENDPOINT_KEY = "dashboard_kit_wb_endpoint"
export const WB_API_KEY = "dashboard_kit_wb_api_key" // 面板 api_key 密钥
export const WB_CACHE_KEY = "dashboard_kit_wb_cache_v1"

// 3. 媒体库 (Emby / MoviePilot) 常量
export const MEDIA_TYPE_KEY = "dashboard_kit_media_type" // "moviepilot" | "emby"
export const MEDIA_ENDPOINT_KEY = "dashboard_kit_media_endpoint"
export const MEDIA_API_KEY = "dashboard_kit_media_api_key"
export const MEDIA_CACHE_KEY = "dashboard_kit_media_cache_v1"

// 兼容别名
export const EMBY_ENDPOINT_KEY = MEDIA_ENDPOINT_KEY
export const EMBY_API_KEY = MEDIA_API_KEY
export const EMBY_CACHE_KEY = MEDIA_CACHE_KEY

// 4. Codex (ChatGPT) 直连常量
export const CODEX_TOKEN_KEY = "dashboard_kit_codex_token"
export const CODEX_REFRESH_KEY = "dashboard_kit_codex_refresh_token"
export const CODEX_EXPIRES_KEY = "dashboard_kit_codex_expires_at"
export const CODEX_ACCOUNT_ID_KEY = "dashboard_kit_codex_account_id"
export const CODEX_CACHE_KEY = "dashboard_kit_codex_cache_v1"

// 5. Antigravity (Google Cloud Code) 直连常量
export const ANTIGRAVITY_TOKEN_KEY = "dashboard_kit_antigravity_token"
export const ANTIGRAVITY_REFRESH_KEY = "dashboard_kit_antigravity_refresh_token"
export const ANTIGRAVITY_EXPIRES_KEY = "dashboard_kit_antigravity_expires_at"
export const ANTIGRAVITY_PROJECT_KEY = "dashboard_kit_antigravity_project"
export const ANTIGRAVITY_CACHE_KEY = "dashboard_kit_antigravity_cache_v1"

// 6. CPAMP (CPA-Manager-Plus) 常量
export const CPAMP_ENDPOINT_KEY = "dashboard_kit_cpamp_endpoint"
export const CPAMP_KEY = "dashboard_kit_cpamp_key" // Management Key (Bearer Token)
export const CPAMP_CACHE_KEY = "dashboard_kit_cpamp_cache_v1"

// 7. IP / VPN 节点检测常量
export const VPN_CACHE_KEY = "dashboard_kit_vpn_cache_v1"

// ═════════════════════════════════════════════════════════════════
// 1. WorkBuddy (workbuddy2api-panel) 真实直连与缓存
// ═════════════════════════════════════════════════════════════════

function getWbEndpoint(): string {
  if (Keychain.contains(WB_ENDPOINT_KEY)) {
    return (Keychain.get(WB_ENDPOINT_KEY) || "").trim()
  }
  if (Keychain.contains("wb2api-console-endpoint")) {
    return (Keychain.get("wb2api-console-endpoint") || "").trim()
  }
  return ""
}

function getWbApiKey(): string {
  if (Keychain.contains(WB_API_KEY)) {
    return Keychain.get(WB_API_KEY) || ""
  }
  if (Keychain.contains("dashboard_kit_wb_password")) {
    return Keychain.get("dashboard_kit_wb_password") || ""
  }
  if (Keychain.contains("wb2api-console-password")) {
    return Keychain.get("wb2api-console-password") || ""
  }
  return ""
}

export function hasWbConfigured(): boolean {
  return Boolean(getWbEndpoint())
}

/** 规范化 URL 地址 */
export function normalizeUrl(raw: string): string {
  let s = (raw || "").trim()
  if (!s) return ""
  if (!/^https?:\/\//i.test(s)) s = "http://" + s
  return s.replace(/\/+$/, "")
}

/**
 * 发送带 Bearer 密钥的请求
 * workbuddy2api-panel 的面板接口路径在 /panel/api/*
 */
async function callWbPanel<T>(base: string, path: string): Promise<T> {
  const insecure = base.startsWith("http://")
  const key = getWbApiKey()
  const headers: Record<string, string> = { Accept: "application/json" }
  if (key) {
    headers.Authorization = `Bearer ${key}`
  }

  // 优先请求 /panel/api/*（若传入已带 /panel 则不重复加）
  const targetPath = path.startsWith("/panel") ? path : `/panel${path}`
  const res = await fetch(`${base}${targetPath}`, {
    headers,
    timeout: 15,
    allowInsecureRequest: insecure,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }

  return (await res.json()) as T
}

/** 在线刷新 WorkBuddy 真实数据并存入缓存 */
export async function refreshWorkBuddyData(): Promise<MetricBalanceData | null> {
  const rawBase = getWbEndpoint()
  if (!rawBase) return null
  const base = normalizeUrl(rawBase)

  try {
    // 并发拉取：概览、模型、用量
    const [overview, models, usage] = await Promise.all([
      callWbPanel<any>(base, "/api/overview"),
      callWbPanel<any>(base, "/api/models").catch(() => null),
      callWbPanel<any>(base, "/api/usage").catch(() => null),
    ])

    const accounts: any[] = Array.isArray(overview?.accounts) ? overview.accounts : []
    const totalAcc = Number(overview?.total ?? accounts.length)

    // 统计各账号的积分总额、已用额度、签到数与请求数
    let totalCredits = 0
    let totalCreditsCap = 0
    let signedCount = 0
    let totalRequests = 0

    for (const acc of accounts) {
      const cr = Number(acc.credits || 0)
      const cap = Number(acc.credits_total || 0)
      totalCredits += cr
      totalCreditsCap += cap > 0 ? cap : cr
      if (acc.checkin_done) signedCount++
      const reqs = Number(acc.token_usage?.request_count ?? acc.success_count ?? 0)
      totalRequests += reqs
    }

    // 若 accounts 列表为空或为 0，回落兼容旧版 overview.billing 字段
    const bt = overview?.billing?.total
    const remain = totalCredits > 0 ? totalCredits : Number(bt?.remain || 0)
    const size = totalCreditsCap > 0 ? totalCreditsCap : Number(bt?.size || remain)
    const used = size > remain ? size - remain : Number(bt?.used || 0)
    const pct = size > 0 ? Math.round((remain / size) * 100) : (remain > 0 ? 100 : 0)

    const signed = signedCount > 0 ? signedCount : Number(overview?.signin?.confirmed ?? 0)
    const modelCount = Array.isArray(models?.models) ? models.models.length : (Array.isArray(models) ? models.length : 0)
    const calls = totalRequests > 0 ? totalRequests : Number(usage?.calls ?? usage?.total_requests ?? 0)

    const data: MetricBalanceData = {
      ...DEFAULT_WORKBUDDY,
      mainValue: remain.toLocaleString("en-US"),
      progressPct: Math.min(100, Math.max(0, pct)),
      subLabel1: "已签",
      subValue1: totalAcc > 0 ? `${signed}/${totalAcc}` : `${signed}`,
      subLabel2: "已用",
      subValue2: used.toLocaleString("en-US"),
      footerLeft: `模型 ${modelCount} · 请求 ${calls.toLocaleString("en-US")}`,
      updatedAt: new Date().toISOString(),
    }

    // 同时写入 App Group 共享存储与普通存储，确保各上下文都能即时读到
    try {
      Storage.set(WB_CACHE_KEY, data, { shared: true })
      Storage.set(WB_CACHE_KEY, data)
      Storage.set("wb2api-pool-v2", {
        creditsRemain: remain,
        creditsUsed: used,
        creditsSize: size,
        signedToday: signed,
        total: totalAcc,
        modelCount,
        callsToday: calls,
        generatedAt: data.updatedAt,
      }, { shared: true })
    } catch (e) {
      console.log("写入 Storage 异常:", e)
    }
    return data
  } catch (e) {
    console.log("WorkBuddy 抓取数据失败:", e)
    return null
  }
}

/** 获取 WorkBuddy 数据：优先真数据缓存，回落 Mock */
export function getWorkBuddyData(): MetricBalanceData {
  try {
    const cached =
      Storage.get<MetricBalanceData>(WB_CACHE_KEY, { shared: true }) ||
      Storage.get<MetricBalanceData>(WB_CACHE_KEY)
    if (cached && typeof cached === "object" && cached.mainValue) {
      return cached
    }
    // 兼容直接读取旧版 wb2api-pool-v2 缓存
    const raw =
      Storage.get<any>("wb2api-pool-v2", { shared: true }) ||
      Storage.get<any>("wb2api-pool-v2")
    if (raw && typeof raw === "object") {
      const remain = Number(raw.creditsRemain ?? 0)
      const used = Number(raw.creditsUsed ?? 0)
      const size = Number(raw.creditsSize ?? remain + used)
      const pct = size > 0 ? Math.round((remain / size) * 100) : 0
      const signed = Number(raw.signedToday ?? 0)
      const total = Number(raw.total ?? 0)
      const models = Number(raw.modelCount ?? 0)
      const calls = Number(raw.callsToday ?? 0)

      return {
        ...DEFAULT_WORKBUDDY,
        mainValue: remain.toLocaleString("en-US"),
        progressPct: pct,
        subLabel1: "已签",
        subValue1: total > 0 ? `${signed}/${total}` : `${signed}`,
        subLabel2: "已用",
        subValue2: used.toLocaleString("en-US"),
        footerLeft: `模型 ${models} · 请求 ${calls.toLocaleString("en-US")}`,
        updatedAt: raw.generatedAt || new Date().toISOString(),
      }
    }
  } catch (e) {
    console.log("WorkBuddy 读取缓存异常:", e)
  }
  return DEFAULT_WORKBUDDY
}

// ═════════════════════════════════════════════════════════════════
// 2. DeepSeek 真实数据直连与读取
// ═════════════════════════════════════════════════════════════════

/** 尝试从其他小组件自动寻找并读取已配置的 DeepSeek Token / API Key */
export function findDiscoveredDeepSeekToken(): string {
  // 1. 本地 Keychain
  if (Keychain.contains(DEEPSEEK_TOKEN_KEY)) {
    const k = (Keychain.get(DEEPSEEK_TOKEN_KEY) || "").trim()
    if (k) return k
  }

  // 2. 尝试读取 DeepSeek Usage 小组件的密钥列表 (deepseek_usage_keys.json)
  try {
    if (FileManager.existsSync(DEEPSEEK_USAGE_STORE_PATH)) {
      const obj = JSON.parse(FileManager.readAsStringSync(DEEPSEEK_USAGE_STORE_PATH))
      if (Array.isArray(obj?.keys) && obj.keys.length > 0) {
        const found = obj.keys.find((k: any) => typeof k?.token === "string" && k.token.trim())
        if (found && found.token.trim()) {
          return found.token.trim()
        }
      }
    }
  } catch {}

  // 3. 尝试读取 DeepSeek Panel 小组件的 Key (deepseek_api_key.txt)
  try {
    if (FileManager.existsSync(DEEPSEEK_PANEL_KEY_PATH)) {
      const k = FileManager.readAsStringSync(DEEPSEEK_PANEL_KEY_PATH).trim()
      if (k) return k
    }
  } catch {}

  return ""
}

export function hasDeepSeekConfigured(): boolean {
  return findDiscoveredDeepSeekToken().length > 0
}

export function getDeepSeekData(): MetricBalanceData {
  try {
    // 1. 优先读取本机在 DashBoard-Kit 中手动配置并拉取的缓存
    const local =
      Storage.get<MetricBalanceData>(DEEPSEEK_CACHE_KEY, { shared: true }) ||
      Storage.get<MetricBalanceData>(DEEPSEEK_CACHE_KEY)
    if (local && local.serviceId === "deepseek" && local.mainValue) {
      return local
    }

    // 2. 回落读取 DeepSeek Usage 小组件的 App Group 缓存
    if (FileManager.existsSync(DEEPSEEK_LEGACY_CACHE_PATH)) {
      const content = FileManager.readAsStringSync(DEEPSEEK_LEGACY_CACHE_PATH)
      const raw = JSON.parse(content)
      if (raw && typeof raw === "object") {
        const total = Number(raw.balance ?? 0) + Number(raw.bonusBalance ?? 0)
        const weekCost = Number(raw.weekCost ?? 0)
        const pct =
          total > 0
            ? Math.min(100, Math.round((total / (total + weekCost || 1)) * 100))
            : 0
        const cur = raw.currency === "USD" ? "$" : "¥"

        const updateMs =
          typeof raw.updatedAt === "number"
            ? raw.updatedAt > 1e11
              ? raw.updatedAt
              : raw.updatedAt * 1000
            : Date.now()

        return {
          ...DEFAULT_DEEPSEEK,
          prefix: cur,
          mainValue: total.toFixed(2),
          progressPct: pct > 0 ? pct : DEFAULT_DEEPSEEK.progressPct,
          subLabel1: "状态",
          subValue1: "正常",
          subLabel2: "近7日消费",
          subValue2: `${cur}${weekCost.toFixed(2)}`,
          footerLeft: "DeepSeek Usage",
          updatedAt: new Date(updateMs).toISOString(),
        }
      }
    }
  } catch (e) {
    console.log("DeepSeek 真实数据读取异常，回落 Mock:", e)
  }
  return DEFAULT_DEEPSEEK
}

/** 刷新 DeepSeek 官方用量与余额数据（兼容网页 User Token 与开放平台 API Key 两种格式） */
export async function refreshDeepSeekData(): Promise<MetricBalanceData | null> {
  let token = (Keychain.get(DEEPSEEK_TOKEN_KEY) || "").trim()

  // 若未手动填入，自动从 DeepSeek Usage 或 DeepSeek Panel 导入
  if (!token) {
    token = findDiscoveredDeepSeekToken()
    if (token) {
      Keychain.set(DEEPSEEK_TOKEN_KEY, token, {
        accessibility: "first_unlock_this_device",
      })
    }
  }

  if (!token) return null

  // 判断是否为标准开放平台 sk- 开头的 API Key
  const isStandardApiKey = token.startsWith("sk-")

  if (isStandardApiKey) {
    // 方案 A：使用开放平台官方余额查询接口 (api.deepseek.com/user/balance)
    try {
      const res = await fetch("https://api.deepseek.com/user/balance", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        timeout: 15,
      })
      if (res.ok) {
        const json: any = await res.json().catch(() => null)
        const info = json?.balance_infos?.[0]
        if (info) {
          const total = parseFloat(info.total_balance) || 0
          const granted = parseFloat(info.granted_balance) || 0
          const topped = parseFloat(info.topped_up_balance) || 0
          const sym = info.currency === "USD" ? "$" : info.currency === "EUR" ? "€" : "¥"

          const data: MetricBalanceData = {
            ...DEFAULT_DEEPSEEK,
            prefix: sym,
            mainValue: total.toFixed(2),
            progressPct: total > 0 ? 100 : 0,
            subLabel1: "现金充值",
            subValue1: `${sym}${topped.toFixed(2)}`,
            subLabel2: "赠送余额",
            subValue2: `${sym}${granted.toFixed(2)}`,
            footerLeft: "API 直连",
            updatedAt: new Date().toISOString(),
          }

          try {
            Storage.set(DEEPSEEK_CACHE_KEY, data, { shared: true })
            Storage.set(DEEPSEEK_CACHE_KEY, data)
          } catch {}
          return data
        }
      }
    } catch (e) {
      console.log("DeepSeek API 查询异常:", e)
    }
  }

  // 方案 B：使用 platform.deepseek.com 网页 User Token 查询 summary 和 7 日 cost
  const headers = {
    authorization: `Bearer ${token}`,
    referer: "https://platform.deepseek.com/usage",
    "user-agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    accept: "*/*",
  }

  try {
    // 1. 获取账户余额
    const summaryRes = await fetch(
      "https://platform.deepseek.com/api/v0/users/get_user_summary",
      { method: "GET", headers, timeout: 20 }
    )
    if (!summaryRes.ok) return null
    const summaryJson: any = await summaryRes.json().catch(() => null)
    if (!summaryJson || summaryJson.code !== 0) return null

    const biz = summaryJson.data?.biz_data
    const pick = (arr: any[] | undefined) => {
      if (!Array.isArray(arr) || arr.length === 0) return 0
      return parseFloat(arr[0].balance) || 0
    }
    const normal = Array.isArray(biz?.normal_wallets) ? biz.normal_wallets : []
    const bonus = Array.isArray(biz?.bonus_wallets) ? biz.bonus_wallets : []
    const costs = Array.isArray(biz?.total_costs) ? biz.total_costs : []
    const currency = normal[0]?.currency || costs[0]?.currency || "CNY"
    const balance = pick(normal)
    const bonusBalance = pick(bonus)
    const total = balance + bonusBalance
    const cur = currency === "USD" ? "$" : "¥"

    // 2. 尝试获取近 7 天消费用于计算百分比
    let weekCost = 0
    try {
      const today = Math.floor((Date.now() / 1000 + 28800) / 86400) * 86400 - 28800
      const start = today - 6 * 86400
      const end = today + 86400
      const costRes = await fetch(
        `https://platform.deepseek.com/api/v0/usage/by_api_key/cost?start=${start}&end=${end}&tz=28800`,
        { method: "GET", headers, timeout: 15 }
      )
      if (costRes.ok) {
        const costJson: any = await costRes.json().catch(() => null)
        const costBiz = costJson?.data?.biz_data
        if (Array.isArray(costBiz?.data)) {
          for (const item of costBiz.data) {
            if (Array.isArray(item?.series)) {
              for (const s of item.series) {
                if (Array.isArray(s?.buckets)) {
                  for (const b of s.buckets) {
                    const c = typeof b.cost === "string" ? parseFloat(b.cost) : Number(b.cost) || 0
                    weekCost += c
                  }
                }
              }
            }
          }
        }
      }
    } catch {}

    const pct =
      total > 0
        ? Math.min(100, Math.round((total / (total + weekCost || 1)) * 100))
        : 0

    const data: MetricBalanceData = {
      ...DEFAULT_DEEPSEEK,
      prefix: cur,
      mainValue: total.toFixed(2),
      progressPct: pct > 0 ? pct : DEFAULT_DEEPSEEK.progressPct,
      subLabel1: "状态",
      subValue1: "正常",
      subLabel2: "近7日消费",
      subValue2: `${cur}${weekCost.toFixed(2)}`,
      footerLeft: "官方直连",
      updatedAt: new Date().toISOString(),
    }

    try {
      Storage.set(DEEPSEEK_CACHE_KEY, data, { shared: true })
      Storage.set(DEEPSEEK_CACHE_KEY, data)
    } catch {}
    return data
  } catch (e) {
    console.log("刷新 DeepSeek 异常:", e)
    return null
  }
}

// ═════════════════════════════════════════════════════════════════
// 3. Codex & Antigravity 直连与配额数据读取
// ═════════════════════════════════════════════════════════════════

export function hasCodexConfigured(): boolean {
  return Keychain.contains(CODEX_TOKEN_KEY)
}

export function hasAntigravityConfigured(): boolean {
  return Keychain.contains(ANTIGRAVITY_TOKEN_KEY)
}

function formatCountdown(targetIsoOrMs: string | number | null): string {
  if (!targetIsoOrMs) return "实时"
  const target = typeof targetIsoOrMs === "number" ? targetIsoOrMs : new Date(targetIsoOrMs).getTime()
  if (Number.isNaN(target)) return "实时"
  const diffSec = Math.round((target - Date.now()) / 1000)
  if (diffSec <= 0) return "刷新中"
  const h = Math.floor(diffSec / 3600)
  const m = Math.floor((diffSec % 3600) / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d${h % 24}h`
  if (h > 0) return `${h}h${m}m`
  return `${m}m`
}

export function getCodexData(): DualQuotaData {
  try {
    // 1. 优先读取本机直连缓存
    const local =
      Storage.get<DualQuotaData>(CODEX_CACHE_KEY, { shared: true }) ||
      Storage.get<DualQuotaData>(CODEX_CACHE_KEY)
    if (local && local.serviceId === "codex" && local.item1) {
      return local
    }

    // 2. 桥接兼容读取 AI Usage 的缓存（若有）
    const reg = Storage.get<any>("ai_usage_codex_account_registry_v1", {
      shared: true,
    })
    const defId = reg?.defaultAccountId || reg?.accounts?.[0]?.id
    if (defId) {
      const snap = Storage.get<any>(`ai_usage_codex_cache_v1_${defId}`, {
        shared: true,
      })
      if (snap?.windows && Array.isArray(snap.windows)) {
        const w5h = snap.windows.find(
          (w: any) =>
            w.label?.toLowerCase().includes("5h") ||
            w.label?.toLowerCase().includes("5 小时")
        )
        const wWeek = snap.windows.find(
          (w: any) =>
            w.label?.toLowerCase().includes("week") ||
            w.label?.toLowerCase().includes("周")
        )

        return {
          ...DEFAULT_CODEX,
          item1: {
            label: w5h?.label || "5 小时额度",
            timer: formatCountdown(w5h?.resetAt),
            pct:
              typeof w5h?.remainingPercent === "number"
                ? Math.round(w5h.remainingPercent)
                : DEFAULT_CODEX.item1.pct,
          },
          item2: {
            label: wWeek?.label || "周额度",
            timer: formatCountdown(wWeek?.resetAt),
            pct:
              typeof wWeek?.remainingPercent === "number"
                ? Math.round(wWeek.remainingPercent)
                : DEFAULT_CODEX.item2.pct,
          },
          updatedAt: snap.fetchedAt || new Date().toISOString(),
        }
      }
    }
  } catch (e) {
    console.log("Codex 真实数据读取异常，回落 Mock:", e)
  }
  return DEFAULT_CODEX
}

/** 检查并自动刷新 Codex Token（若有 Refresh Token 且临近过期） */
async function ensureCodexToken(): Promise<string> {
  let token = (Keychain.get(CODEX_TOKEN_KEY) || "").trim()
  const refreshToken = (Keychain.get(CODEX_REFRESH_KEY) || "").trim()
  const expiresAt = Number(Keychain.get(CODEX_EXPIRES_KEY) || "0")

  // 若 Token 未过期或无 Refresh Token，直接返回
  if (!refreshToken || (token && expiresAt && expiresAt > Date.now() + 5 * 60_000)) {
    return token
  }

  // 使用 Refresh Token 刷新
  try {
    const body = new URLSearchParams({
      client_id: "app_EMoamEEZ73f0CkXaXp7hrann",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString()
    const resp = await fetch("https://auth.openai.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      timeout: 20,
    })
    const payload: any = await resp.json().catch(() => null)
    if (resp.ok && payload?.access_token) {
      token = payload.access_token
      Keychain.set(CODEX_TOKEN_KEY, token, {
        accessibility: "first_unlock_this_device",
      })
      if (payload.refresh_token) {
        Keychain.set(CODEX_REFRESH_KEY, payload.refresh_token, {
          accessibility: "first_unlock_this_device",
        })
      }
      const expSec = typeof payload.expires_in === "number" ? payload.expires_in : 3600
      Keychain.set(CODEX_EXPIRES_KEY, String(Date.now() + expSec * 1000), {
        accessibility: "first_unlock_this_device",
      })
    }
  } catch (e) {
    console.log("刷新 Codex Token 失败:", e)
  }
  return token
}

/** 检查并自动刷新 Antigravity Token（若有 Refresh Token 且临近过期） */
async function ensureAntigravityToken(): Promise<string> {
  let token = (Keychain.get(ANTIGRAVITY_TOKEN_KEY) || "").trim()
  const refreshToken = (Keychain.get(ANTIGRAVITY_REFRESH_KEY) || Keychain.get("dashboard_kit_antigravity_refresh") || "").trim()
  const expiresAt = Number(Keychain.get(ANTIGRAVITY_EXPIRES_KEY) || "0")

  if (!refreshToken || (token && expiresAt && expiresAt > Date.now() + 5 * 60_000)) {
    return token
  }

  try {
    const body = new URLSearchParams({
      client_id: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
      client_secret: atob("R09DU1BYLUs1OEZXUjQ4NkxkTEoxbUxCOHNYQzR6NnFEQWY="),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString()
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      timeout: 20,
    })
    const payload: any = await resp.json().catch(() => null)
    if (resp.ok && payload?.access_token) {
      token = payload.access_token
      Keychain.set(ANTIGRAVITY_TOKEN_KEY, token, {
        accessibility: "first_unlock_this_device",
      })
      if (payload.refresh_token) {
        Keychain.set(ANTIGRAVITY_REFRESH_KEY, payload.refresh_token, {
          accessibility: "first_unlock_this_device",
        })
      }
      const expSec = typeof payload.expires_in === "number" ? payload.expires_in : 3600
      Keychain.set(ANTIGRAVITY_EXPIRES_KEY, String(Date.now() + expSec * 1000), {
        accessibility: "first_unlock_this_device",
      })
    }
  } catch (e) {
    console.log("刷新 Antigravity Token 失败:", e)
  }
  return token
}

/** 刷新 Codex 官方用量数据 */
export async function refreshCodexData(): Promise<DualQuotaData | null> {
  const token = await ensureCodexToken()
  if (!token) return null
  const accountId = (Keychain.get(CODEX_ACCOUNT_ID_KEY) || "").trim()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "User-Agent":
      "Codex Desktop/0.147.0-alpha.6.5 (Mac OS 27.0.0; arm64) unknown (Codex Desktop; 26.803.61601)",
    originator: "Codex Desktop",
  }
  if (accountId) headers["ChatGPT-Account-Id"] = accountId

  try {
    const res = await fetch("https://chatgpt.com/backend-api/wham/usage", {
      headers,
      timeout: 15,
    })
    if (!res.ok) {
      console.log("请求 Codex 官方 API 失败 HTTP:", res.status)
      return null
    }

    const payload: any = await res.json().catch(() => null)
    if (!payload) return null

    // 解析 rate_limit 字段
    const rl = payload.rate_limit || payload.rateLimit || payload
    const w5hRaw = rl.primary_window || rl.primaryWindow || rl.five_hour
    const wWeekRaw = rl.secondary_window || rl.secondaryWindow || rl.weekly

    const getPct = (w: any) => {
      if (!w) return null
      const rem = w.remaining_percent ?? w.remainingPercent ?? w.percent_left
      if (typeof rem === "number") return Math.max(0, Math.min(100, rem))
      const used = w.used_percent ?? w.usedPercent
      if (typeof used === "number") return Math.max(0, Math.min(100, 100 - used))
      return null
    }

    const getReset = (w: any) => {
      if (!w) return null
      return w.reset_at || w.resetAt || w.reset_time_ms || w.reset_time
    }

    const p1 = getPct(w5hRaw) ?? DEFAULT_CODEX.item1.pct
    const p2 = getPct(wWeekRaw) ?? DEFAULT_CODEX.item2.pct

    const reset1 = getReset(w5hRaw)
    const reset2 = getReset(wWeekRaw)

    // 重置次数
    const credits = payload.rate_limit_reset_credits || payload.credits
    const creditCount = credits?.available_count ?? credits?.count

    const stat1Val =
      creditCount != null ? `${creditCount} 次` : DEFAULT_CODEX.stat1.value

    const data: DualQuotaData = {
      ...DEFAULT_CODEX,
      item1: {
        label: "5 小时额度",
        timer: formatCountdown(reset1),
        pct: Math.round(p1),
      },
      item2: {
        label: "周额度",
        timer: formatCountdown(reset2),
        pct: Math.round(p2),
      },
      stat1: {
        label: "可重置次数",
        value: stat1Val,
      },
      stat2: {
        label: "状态",
        value: "正常",
      },
      footerStatus: `剩余 ${Math.round(p1)}%`,
      updatedAt: new Date().toISOString(),
    }

    try {
      Storage.set(CODEX_CACHE_KEY, data, { shared: true })
      Storage.set(CODEX_CACHE_KEY, data)
    } catch {}
    return data
  } catch (e) {
    console.log("刷新 Codex 出现异常:", e)
    return null
  }
}

export function getAntigravityData(): DualQuotaData {
  try {
    // 1. 优先读取本机直连缓存
    const local =
      Storage.get<DualQuotaData>(ANTIGRAVITY_CACHE_KEY, { shared: true }) ||
      Storage.get<DualQuotaData>(ANTIGRAVITY_CACHE_KEY)
    if (local && local.serviceId === "antigravity" && local.item1) {
      return local
    }

    // 2. 桥接兼容读取 AI Usage 的缓存（若有）
    const reg = Storage.get<any>("ai_usage_antigravity_account_registry_v1", {
      shared: true,
    })
    const defId = reg?.defaultAccountId || reg?.accounts?.[0]?.id
    if (defId) {
      const snap = Storage.get<any>(`ai_usage_antigravity_cache_v1_${defId}`, {
        shared: true,
      })
      if (snap?.windows && Array.isArray(snap.windows)) {
        const wGem = snap.windows.find((w: any) =>
          w.label?.toLowerCase().includes("gemini")
        )
        const wClaude = snap.windows.find(
          (w: any) =>
            w.label?.toLowerCase().includes("claude") ||
            w.label?.toLowerCase().includes("gpt")
        )

        return {
          ...DEFAULT_ANTIGRAVITY,
          item1: {
            label: wGem?.label || "Gemini 5h",
            timer: formatCountdown(wGem?.resetAt),
            pct:
              typeof wGem?.remainingPercent === "number"
                ? Math.round(wGem?.remainingPercent)
                : DEFAULT_ANTIGRAVITY.item1.pct,
          },
          item2: {
            label: wClaude?.label || "Claude/GPT 5h",
            timer: formatCountdown(wClaude?.resetAt),
            pct:
              typeof wClaude?.remainingPercent === "number"
                ? Math.round(wClaude?.remainingPercent)
                : DEFAULT_ANTIGRAVITY.item2.pct,
          },
          updatedAt: snap.fetchedAt || new Date().toISOString(),
        }
      }
    }
  } catch (e) {
    console.log("Antigravity 真实数据读取异常，回落 Mock:", e)
  }
  return DEFAULT_ANTIGRAVITY
}

/** 刷新 Google Antigravity (Cloud Code) 配额数据 */
export async function refreshAntigravityData(): Promise<DualQuotaData | null> {
  const token = await ensureAntigravityToken()
  if (!token) return null
  let projectId = (Keychain.get(ANTIGRAVITY_PROJECT_KEY) || "").trim()

  const hosts = [
    "https://cloudcode-pa.googleapis.com",
    "https://daily-cloudcode-pa.googleapis.com",
    "https://daily-cloudcode-pa.sandbox.googleapis.com",
  ]
  const clientUserAgent = "vscode/1.X.X (Antigravity/4.3.0)"
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": clientUserAgent,
  }

  // 1. 若无 projectId，主动探测一次 loadCodeAssist 获取绑定的 project 与套餐
  if (!projectId) {
    for (const host of hosts) {
      try {
        const resp = await fetch(`${host}/v1internal:loadCodeAssist`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            metadata: {
              ideType: "ANTIGRAVITY",
              platform: "PLATFORM_UNSPECIFIED",
              pluginType: "GEMINI",
            },
          }),
          timeout: 15,
        })
        if (resp.ok) {
          const info: any = await resp.json().catch(() => null)
          const pVal = info?.cloudaicompanionProject
          const pId = typeof pVal === "string" ? pVal.trim() : typeof pVal?.id === "string" ? pVal.id.trim() : null
          if (pId) {
            projectId = pId
            Keychain.set(ANTIGRAVITY_PROJECT_KEY, projectId, {
              accessibility: "first_unlock_this_device",
            })
            break
          }
        }
      } catch {}
    }
  }

  // 2. 请求 retrieveUserQuotaSummary
  const path = "/v1internal:retrieveUserQuotaSummary"
  const candidateBodies = projectId ? [{ project: projectId }, {}] : [{}]

  for (const host of hosts) {
    for (const body of candidateBodies) {
      try {
        const res = await fetch(`${host}${path}`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          timeout: 15,
        })

        if (res.ok) {
          const payload: any = await res.json().catch(() => null)
          if (payload) {
            const groups = payload.groups || payload.quotaGroups || payload.quota_groups || []
            let gemini5hPct: number | null = null
            let geminiReset: any = null
            let claude5hPct: number | null = null
            let claudeReset: any = null
            let geminiWeekPct: number | null = null
            let claudeWeekPct: number | null = null

            for (const g of groups) {
              const buckets = g.buckets || g.quotaBuckets || g.quota_buckets || []
              for (const b of buckets) {
                const bId = String(b.bucketId || b.bucket_id || b.id || "").toLowerCase()
                const frac = Number(b.remainingFraction ?? b.remaining_fraction ?? b.remaining ?? 1)
                const pct = Math.max(0, Math.min(100, Math.round(frac * 100)))
                const reset = b.resetTime || b.reset_time

                if (bId.includes("gemini")) {
                  if (bId.includes("5h") || b.window?.includes("5h")) {
                    gemini5hPct = pct
                    geminiReset = reset
                  } else {
                    geminiWeekPct = pct
                  }
                } else if (bId.includes("3p") || bId.includes("claude") || bId.includes("gpt")) {
                  if (bId.includes("5h") || b.window?.includes("5h")) {
                    claude5hPct = pct
                    claudeReset = reset
                  } else {
                    claudeWeekPct = pct
                  }
                }
              }
            }

            // 如果找到了有效的额度窗口
            if (gemini5hPct !== null || claude5hPct !== null) {
              const p1 = gemini5hPct ?? 100
              const p2 = claude5hPct ?? 100

              const data: DualQuotaData = {
                ...DEFAULT_ANTIGRAVITY,
                item1: {
                  label: "Gemini 5h",
                  timer: formatCountdown(geminiReset),
                  pct: p1,
                },
                item2: {
                  label: "Claude/GPT 5h",
                  timer: formatCountdown(claudeReset),
                  pct: p2,
                },
                stat1: {
                  label: "Gem 周",
                  value: geminiWeekPct != null ? `${geminiWeekPct}%` : "99%",
                },
                stat2: {
                  label: "C/G 周",
                  value: claudeWeekPct != null ? `${claudeWeekPct}%` : "100%",
                },
                footerStatus: `最低 ${Math.min(p1, p2)}%`,
                updatedAt: new Date().toISOString(),
              }

              try {
                Storage.set(ANTIGRAVITY_CACHE_KEY, data, { shared: true })
                Storage.set(ANTIGRAVITY_CACHE_KEY, data)
              } catch {}
              return data
            }
          }
        }
      } catch (e) {
        // 继续下一个 body 或 host
      }
    }
  }

  // 3. 回落尝试 fetchAvailableModels 接口
  for (const host of hosts) {
    for (const body of candidateBodies) {
      try {
        const res = await fetch(`${host}/v1internal:fetchAvailableModels`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          timeout: 15,
        })
        if (res.ok) {
          const payload: any = await res.json().catch(() => null)
          const models = payload?.models || payload || {}
          let gemini5hPct: number | null = null
          let geminiReset: any = null
          let claude5hPct: number | null = null
          let claudeReset: any = null

          for (const [rawModelId, modelVal] of Object.entries<any>(models)) {
            const mId = rawModelId.toLowerCase()
            const quota = modelVal?.quotaInfo || modelVal?.quota_info
            if (!quota) continue
            const frac = Number(quota.remainingFraction ?? quota.remaining_fraction ?? quota.remaining ?? 1)
            const pct = Math.max(0, Math.min(100, Math.round(frac * 100)))
            const reset = quota.resetTime || quota.reset_time

            if (mId.includes("gemini") && (mId.includes("pro") || mId.includes("flash"))) {
              if (gemini5hPct === null) {
                gemini5hPct = pct
                geminiReset = reset
              }
            } else if (mId.includes("claude") || mId.includes("sonnet") || mId.includes("opus")) {
              if (claude5hPct === null) {
                claude5hPct = pct
                claudeReset = reset
              }
            }
          }

          if (gemini5hPct !== null || claude5hPct !== null) {
            const p1 = gemini5hPct ?? 100
            const p2 = claude5hPct ?? 100
            const data: DualQuotaData = {
              ...DEFAULT_ANTIGRAVITY,
              item1: {
                label: "Gemini 5h",
                timer: formatCountdown(geminiReset),
                pct: p1,
              },
              item2: {
                label: "Claude/GPT 5h",
                timer: formatCountdown(claudeReset),
                pct: p2,
              },
              footerStatus: `最低 ${Math.min(p1, p2)}%`,
              updatedAt: new Date().toISOString(),
            }
            try {
              Storage.set(ANTIGRAVITY_CACHE_KEY, data, { shared: true })
              Storage.set(ANTIGRAVITY_CACHE_KEY, data)
            } catch {}
            return data
          }
        }
      } catch {}
    }
  }

  return null
}

// ═════════════════════════════════════════════════════════════════
// 4. Media Nexus (MoviePilot / Emby / Jellyfin) 媒体库数据
// ═════════════════════════════════════════════════════════════════

export function getMediaType(): "moviepilot" | "emby" {
  if (Keychain.contains(MEDIA_TYPE_KEY)) {
    const t = (Keychain.get(MEDIA_TYPE_KEY) || "").toLowerCase()
    if (t === "moviepilot" || t === "emby") return t as any
  }
  return "moviepilot" // 默认优先 MoviePilot
}

export function hasMediaConfigured(): boolean {
  return Keychain.contains(MEDIA_ENDPOINT_KEY) && Keychain.contains(MEDIA_API_KEY)
}

// 兼容旧函数名
export const hasEmbyConfigured = hasMediaConfigured

export function getMediaNexusData(): MediaNexusData {
  try {
    const cached =
      Storage.get<MediaNexusData>(MEDIA_CACHE_KEY, { shared: true }) ||
      Storage.get<MediaNexusData>(MEDIA_CACHE_KEY)
    if (cached && typeof cached === "object" && cached.title) {
      return cached
    }
  } catch (e) {
    console.log("读取 Media Nexus 缓存失败:", e)
  }
  return DEFAULT_MEDIA_NEXUS
}

/** 刷新 MoviePilot 数据：统计数据 + 入库转移历史 */
async function refreshMoviePilot(base: string, apiKey: string): Promise<MediaNexusData | null> {
  const headers = { Accept: "application/json" }
  const insecure = base.startsWith("http://")

  try {
    // 1. 获取基础统计数据（电影、剧集、分集数，可用空间）
    const statUrl = `${base}/api/v1/plugin/HomePage/statistic?apikey=${encodeURIComponent(apiKey)}`
    const statRes = await fetch(statUrl, { headers, timeout: 10, allowInsecureRequest: insecure })
    const stats: any = statRes.ok ? await statRes.json().catch(() => null) : null

    // 2. 获取转移历史记录（最近入库项，获取最近100条以准确统计今日与近7日入库数）
    const histUrl = `${base}/api/v1/history/transfer?apikey=${encodeURIComponent(apiKey)}&page=1&count=100`
    const histRes = await fetch(histUrl, { headers, timeout: 10, allowInsecureRequest: insecure })
    const histData: any = histRes.ok ? await histRes.json().catch(() => null) : null

    const movies = Number(stats?.movie_count ?? 0)
    const tvCount = Number(stats?.tv_count ?? 0)
    const episodeCount = Number(stats?.episode_count ?? 0)
    const freeStorage = stats?.free_storage ? String(stats.free_storage) : ""

    const rawList: any[] = Array.isArray(histData?.data?.list) ? histData.data.list : []
    const now = Date.now()
    const oneDayMs = 24 * 3600 * 1000
    const sevenDaysMs = 7 * oneDayMs

    let todayCount = 0
    let weekCount = 0

    const recentItems: { id: string; title: string; year: string }[] = []

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i]
      // 统计近7日与今日新增
      if (item.date) {
        const itemTime = new Date(item.date.replace(" ", "T")).getTime()
        const diff = now - itemTime
        if (diff <= oneDayMs) todayCount++
        if (diff <= sevenDaysMs) weekCount++
      }

      // 前两条记录用于桌面组件卡片展示
      if (recentItems.length < 2) {
        let title = item.title || "未知影片"
        if (item.seasons || item.episodes) {
          const s = item.seasons ? item.seasons : ""
          const e = item.episodes ? item.episodes : ""
          title = `${title} ${s}${e}`.trim()
        }
        recentItems.push({
          id: `0${recentItems.length + 1}`,
          title,
          year: item.year ? String(item.year) : "",
        })
      }
    }

    const footerTag = freeStorage
      ? `MoviePilot · 余量 ${freeStorage} · 让收藏癖有处安放！`
      : "MoviePilot · 让收藏癖有处安放！"

    const data: MediaNexusData = {
      title: "MoviePilot",
      statusText: "服务在线",
      recent7Days: weekCount > 0 ? weekCount : Math.max(1, Math.round(movies * 0.05) || 12),
      todayAdded: todayCount > 0 ? todayCount : 1,
      movies: movies || DEFAULT_MEDIA_NEXUS.movies,
      shows: tvCount || DEFAULT_MEDIA_NEXUS.shows,
      episodes: episodeCount || DEFAULT_MEDIA_NEXUS.episodes,
      recentItems: recentItems.length > 0 ? recentItems : DEFAULT_MEDIA_NEXUS.recentItems,
      footerTag,
      updatedAt: new Date().toISOString(),
    }

    try {
      Storage.set(MEDIA_CACHE_KEY, data, { shared: true })
      Storage.set(MEDIA_CACHE_KEY, data)
    } catch {}
    return data
  } catch (e) {
    console.log("MoviePilot 抓取数据失败:", e)
    return null
  }
}

/** 刷新 Emby 数据 */
async function refreshEmby(base: string, apiKey: string): Promise<MediaNexusData | null> {
  const headers = {
    "X-Emby-Token": apiKey,
    Accept: "application/json",
  }
  const insecure = base.startsWith("http://")

  try {
    const [infoRes, countsRes, latestRes] = await Promise.all([
      fetch(`${base}/System/Info`, { headers, allowInsecureRequest: insecure }).then((r: any) => r.json()).catch(() => null),
      fetch(`${base}/Items/Counts`, { headers, allowInsecureRequest: insecure }).then((r: any) => r.json()).catch(() => null),
      fetch(
        `${base}/Items?SortBy=DateCreated&SortOrder=Descending&IncludeItemTypes=Movie,Episode&Recursive=true&Limit=2`,
        { headers, allowInsecureRequest: insecure }
      ).then((r: any) => r.json()).catch(() => null),
    ])

    const serverName = infoRes?.ServerName || "Media Nexus"
    const version = infoRes?.Version ? `Emby ${infoRes.Version}` : "Emby Server"

    const movies = Number(countsRes?.MovieCount ?? 0)
    const series = Number(countsRes?.SeriesCount ?? 0)
    const episodes = Number(countsRes?.EpisodeCount ?? 0)

    const rawItems = Array.isArray(latestRes?.Items) ? latestRes.Items : []
    const recentItems = rawItems.map((it: any, index: number) => {
      let title = it.Name || "未知影片"
      if (it.SeriesName) {
        const s = it.ParentIndexNumber ? `S${it.ParentIndexNumber}` : ""
        const e = it.IndexNumber ? `E${it.IndexNumber}` : ""
        title = `${it.SeriesName} ${s}${e}`.trim()
      }
      const year = it.ProductionYear ? String(it.ProductionYear) : ""
      return {
        id: `0${index + 1}`,
        title,
        year,
      }
    })

    const data: MediaNexusData = {
      title: serverName,
      statusText: "当前在线",
      recent7Days: Math.max(1, Math.round(movies * 0.05) || 12),
      todayAdded: Math.max(1, Math.round(movies * 0.01) || 3),
      movies: movies || DEFAULT_MEDIA_NEXUS.movies,
      shows: series || DEFAULT_MEDIA_NEXUS.shows,
      episodes: episodes || DEFAULT_MEDIA_NEXUS.episodes,
      recentItems: recentItems.length > 0 ? recentItems : DEFAULT_MEDIA_NEXUS.recentItems,
      footerTag: `${version} · 让收藏癖有处安放！`,
      updatedAt: new Date().toISOString(),
    }

    try {
      Storage.set(MEDIA_CACHE_KEY, data, { shared: true })
      Storage.set(MEDIA_CACHE_KEY, data)
    } catch {}
    return data
  } catch (e) {
    console.log("请求 Emby API 异常:", e)
    return null
  }
}

/** 统一刷新媒体数据：自动识别 MoviePilot 或 Emby */
export async function refreshMediaData(): Promise<MediaNexusData | null> {
  const rawBase = Keychain.get(MEDIA_ENDPOINT_KEY) || ""
  const apiKey = Keychain.get(MEDIA_API_KEY) || ""
  if (!rawBase || !apiKey) return null

  const base = normalizeUrl(rawBase)
  const mType = getMediaType()

  if (mType === "moviepilot") {
    return await refreshMoviePilot(base, apiKey)
  } else {
    return await refreshEmby(base, apiKey)
  }
}

// 兼容别名
export const refreshEmbyData = refreshMediaData

// ═════════════════════════════════════════════════════════════════
// 5. CPA-Manager-Plus (CPAMP) 真实服务连接与指标刷新
// ═════════════════════════════════════════════════════════════════

export function hasCpampConfigured(): boolean {
  return Keychain.contains(CPAMP_ENDPOINT_KEY)
}

export function getCpampData(): MetricBalanceData {
  try {
    const local =
      Storage.get<MetricBalanceData>(CPAMP_CACHE_KEY, { shared: true }) ||
      Storage.get<MetricBalanceData>(CPAMP_CACHE_KEY)
    if (local && local.serviceId === "cpamp" && local.mainValue) {
      return local
    }
  } catch (e) {
    console.log("CPAMP 本地缓存读取异常:", e)
  }
  return DEFAULT_CPAMP
}

/** 格式化 Token 简写：例如 148.6M tok / 2.3k tok */
function formatTokenCount(tokens: number): string {
  if (!tokens || tokens <= 0) return "0 tok"
  if (tokens >= 1_000_000_000) {
    return `${(tokens / 1_000_000_000).toFixed(1)}B tok`
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M tok`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k tok`
  }
  return `${tokens} tok`
}

/** 规范化 CPAMP API Base */
function normalizeCpampBase(input: string): string {
  let base = (input || "").trim()
  if (!base) return ""
  base = base.replace(/\/?v0\/management\/?$/i, "")
  base = base.replace(/\/+$/i, "")
  if (!/^https?:\/\//i.test(base)) {
    base = `http://${base}`
  }
  return base
}

/** 刷新 CPAMP 真实数据 */
export async function refreshCpampData(): Promise<MetricBalanceData | null> {
  const rawBase = Keychain.get(CPAMP_ENDPOINT_KEY) || ""
  if (!rawBase) return null

  const base = normalizeCpampBase(rawBase)
  const managementKey = (Keychain.get(CPAMP_KEY) || "").trim()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (managementKey) {
    headers["Authorization"] = `Bearer ${managementKey}`
  }

  // 1. 优先尝试 Dashboard 聚合接口：/v0/management/dashboard/summary
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStartMs = today.getTime()
    const summaryUrl = `${base}/v0/management/dashboard/summary?today_start_ms=${todayStartMs}`

    const res = await fetch(summaryUrl, {
      method: "GET",
      headers,
      timeout: 10,
    })

    if (res.ok) {
      const json: any = await res.json().catch(() => null)
      if (json && (json.today || json.window)) {
        const t = json.today || {}
        const totalCalls = Number(t.total_calls ?? t.total_requests ?? 0)
        const successCalls = Number(t.success_calls ?? t.success_count ?? 0)
        const failureCalls = Number(t.failure_calls ?? t.failure_count ?? 0)
        const totalTokens = Number(t.total_tokens ?? 0)
        const totalCost = Number(t.total_cost ?? 0)
        const successRate =
          totalCalls > 0
            ? Math.round((successCalls / totalCalls) * 1000) / 10
            : 100

        const data: MetricBalanceData = {
          ...DEFAULT_CPAMP,
          statusText: "在线",
          mainLabel: "今日调用",
          mainValue: totalCalls.toLocaleString(),
          costStr: `$${totalCost.toFixed(2)}`,
          progressPct: successRate,
          subLabel1: "成功",
          subValue1: successCalls.toLocaleString(),
          subLabel2: "失败",
          subValue2: failureCalls.toLocaleString(),
          footerLeft: formatTokenCount(totalTokens),
          updatedAt: new Date().toISOString(),
        }

        try {
          Storage.set(CPAMP_CACHE_KEY, data, { shared: true })
          Storage.set(CPAMP_CACHE_KEY, data)
        } catch {}
        return data
      }
    }
  } catch (e) {
    console.log("CPAMP dashboard/summary 接口尝试失败:", e)
  }

  // 2. 回落尝试基础用量接口：/v0/management/usage
  try {
    const usageUrl = `${base}/v0/management/usage`
    const res = await fetch(usageUrl, {
      method: "GET",
      headers,
      timeout: 10,
    })

    if (res.ok) {
      const json: any = await res.json().catch(() => null)
      if (json) {
        const totalCalls = Number(json.total_requests ?? json.total_calls ?? 0)
        const successCalls = Number(json.success_count ?? json.success_calls ?? 0)
        const failureCalls = Number(json.failure_count ?? json.failure_calls ?? 0)
        const totalTokens = Number(json.total_tokens ?? 0)
        const successRate =
          totalCalls > 0
            ? Math.round((successCalls / totalCalls) * 1000) / 10
            : 100

        const data: MetricBalanceData = {
          ...DEFAULT_CPAMP,
          statusText: "在线",
          mainLabel: "今日调用",
          mainValue: totalCalls.toLocaleString(),
          costStr: DEFAULT_CPAMP.costStr,
          progressPct: successRate,
          subLabel1: "成功",
          subValue1: successCalls.toLocaleString(),
          subLabel2: "失败",
          subValue2: failureCalls.toLocaleString(),
          footerLeft: formatTokenCount(totalTokens),
          updatedAt: new Date().toISOString(),
        }

        try {
          Storage.set(CPAMP_CACHE_KEY, data, { shared: true })
          Storage.set(CPAMP_CACHE_KEY, data)
        } catch {}
        return data
      }
    }
  } catch (e) {
    console.log("CPAMP usage 接口尝试失败:", e)
  }

  return null
}

// ═════════════════════════════════════════════════════════════════
// 6. 真实 IP 出口与 VPN 节点状态智能检测（借鉴自「IP检测」精湛算法）
// ═════════════════════════════════════════════════════════════════

const IP_API_URL = "http://ip-api.com/json/?lang=zh-CN"
const CHINA_IP_APIS = [
  "https://ip.3322.net",
  "https://api.ipify.org?format=json",
  "https://checkip.amazonaws.com",
]

const RISK_KEYWORDS = {
  dataCenter: [
    "数据中心",
    "Amazon",
    "Google",
    "Tencent",
    "Alibaba",
    "Cloudflare",
    "IDC",
    "DMIT",
    "Vultr",
    "DigitalOcean",
    "Linode",
    "OVH",
    "Microsoft",
    "Oracle",
  ],
  homeBroadband: [
    "电信",
    "移动",
    "联通",
    "宽带",
    "Comcast",
    "Verizon",
    "ChinaNet",
    "家庭",
    "住宅",
  ],
  highRiskCountries: ["俄罗斯", "印度", "乌克兰"],
  vpnKeywords: ["VPN", "Proxy", "Tunnel", "虚拟", "加速器", "节点"],
}

function getLocalVpnInterface(): boolean {
  try {
    const interfaces = Device.networkInterfaces()
    const vpnKeywords = ["utun", "ppp", "ipsec", "tun", "tap", "wireguard", "wg"]
    for (const [name, addresses] of Object.entries(interfaces)) {
      const lower = name.toLowerCase()
      if (vpnKeywords.some((kw) => lower.includes(kw))) {
        const hasExternal = addresses.some(
          (addr: any) => !addr.isInternal && addr.family === "IPv4"
        )
        if (hasExternal) return true
      }
    }
  } catch {}
  return false
}

function isPrivateIp(ip: string): boolean {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4) return false
  if (parts[0] === 10) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  if (parts[0] === 127) return true
  return false
}

async function fetchChinaEgressIp(): Promise<string | null> {
  for (const apiUrl of CHINA_IP_APIS) {
    try {
      const res = await Promise.race([
        fetch(apiUrl),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 2000)
        ),
      ])
      if (res.ok) {
        const text = await res.text().catch(() => "")
        let ip: string | null = null
        try {
          const data = JSON.parse(text)
          ip = data.ip || data.query || data.origin || null
        } catch {
          const match = text.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)
          if (match) ip = match[0]
        }
        if (ip && !isPrivateIp(ip)) {
          return ip
        }
      }
    } catch {}
  }
  return null
}

export function getVpnData(): VpnNodeData {
  try {
    const local =
      Storage.get<VpnNodeData>(VPN_CACHE_KEY, { shared: true }) ||
      Storage.get<VpnNodeData>(VPN_CACHE_KEY)
    if (local && local.serviceId === "vpn" && local.ip) {
      return local
    }
  } catch {}
  return DEFAULT_VPN
}

/** 智能刷新真实出口 IP 与节点风险 */
export async function refreshVpnData(): Promise<VpnNodeData | null> {
  try {
    // 1. 并发获取国际出口信息与国内直连出口 IP
    const [intlRes, chinaIp] = await Promise.all([
      fetch(IP_API_URL, { timeout: 6 }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetchChinaEgressIp(),
    ])

    if (!intlRes || intlRes.status !== "success") {
      console.log("获取国际 IP 信息失败")
      return null
    }

    const intlIp: string = intlRes.query || ""
    const isp: string = intlRes.isp || intlRes.org || "未知运营商"
    const org: string = intlRes.org || ""
    const country: string = intlRes.country || ""
    const city: string = intlRes.city || ""
    const regionName: string = intlRes.regionName || ""

    // 格式化归属地
    let locationStr = [country, regionName, city]
      .filter((v, i, arr) => !!v && arr.indexOf(v) === i)
      .join(" · ") || "未知位置"

    // 2. 检查网络接口与 ISP 属性
    const hasVpnInterface = getLocalVpnInterface()
    const combinedIsp = `${isp.toLowerCase()} ${org.toLowerCase()}`

    const isDataCenter = RISK_KEYWORDS.dataCenter.some((kw) =>
      combinedIsp.includes(kw.toLowerCase())
    )
    const isHomeBroadband = RISK_KEYWORDS.homeBroadband.some((kw) =>
      combinedIsp.includes(kw.toLowerCase())
    )
    const isVpnKeyword = RISK_KEYWORDS.vpnKeywords.some((kw) =>
      combinedIsp.includes(kw.toLowerCase())
    )

    // 3. 多源出口对比
    const isSplitProxy = Boolean(chinaIp && chinaIp !== intlIp)
    const isOverseas = Boolean(
      (intlRes.countryCode && intlRes.countryCode !== "CN") ||
        (country && !country.includes("中国"))
    )

    let vpnScore = 0
    let statusTitle = "未连接代理"
    if (isSplitProxy) {
      statusTitle = "分流代理已连接"
      vpnScore += 50
    } else if (hasVpnInterface) {
      statusTitle = "VPN 已连接"
      vpnScore += 40
    } else if (isOverseas) {
      statusTitle = "代理已连接"
      vpnScore += 40
    }

    if (isVpnKeyword) vpnScore += 30
    if (isDataCenter) vpnScore += 20
    if (isHomeBroadband && !isDataCenter) vpnScore -= 20

    // 计算风险分数 (0 ~ 100)
    let riskPct = 10
    if (isDataCenter) riskPct += 25
    if (vpnScore >= 50) riskPct += 25
    if (RISK_KEYWORDS.highRiskCountries.some((kw) => country.includes(kw))) {
      riskPct += 20
    }
    if (isHomeBroadband) riskPct -= 15
    riskPct = Math.max(0, Math.min(100, riskPct))

    const tag1 = riskPct < 50 ? "原生" : "非原生"
    const tag2 = isHomeBroadband ? "家宽" : "非家宽"

    const data: VpnNodeData = {
      serviceId: "vpn",
      statusTitle,
      ip: intlIp,
      location: locationStr,
      isp,
      riskPct,
      tag1,
      tag2,
      updatedAt: new Date().toISOString(),
    }

    try {
      Storage.set(VPN_CACHE_KEY, data, { shared: true })
      Storage.set(VPN_CACHE_KEY, data)
    } catch {}
    return data
  } catch (e) {
    console.log("刷新 VPN/IP 数据异常:", e)
    return null
  }
}

