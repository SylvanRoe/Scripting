import { fetch, Device } from "scripting"
import {
  DEFAULT_ANTIGRAVITY,
  DEFAULT_CODEX,
  DEFAULT_CPAMP,
  DEFAULT_DEEPSEEK,
  DEFAULT_MEDIA_NEXUS,
  DEFAULT_VPN,
  DEFAULT_WORKBUDDY,
  DEFAULT_FUEL,
  DEFAULT_QBITTORRENT,
  DEFAULT_QX,
  DualQuotaData,
  FuelCardData,
  QbittorrentData,
  QuantumultXData,
  QxPolicyItem,
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
const ANTIGRAVITY_FILE_CACHE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_antigravity_cache.json"
const CODEX_FILE_CACHE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_codex_cache.json"

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
    // 1. 优先读取本机直连缓存（支持 Storage 与 App Group 文件双通道）
    let local =
      Storage.get<any>(CODEX_CACHE_KEY, { shared: true }) ||
      Storage.get<any>(CODEX_CACHE_KEY)

    if (!local && FileManager.existsSync(CODEX_FILE_CACHE_PATH)) {
      try {
        const raw = FileManager.readAsStringSync(CODEX_FILE_CACHE_PATH)
        if (raw) local = JSON.parse(raw)
      } catch {}
    }

    if (local && (local.item1 || local.stat1)) {
      return {
        ...DEFAULT_CODEX,
        ...local,
        serviceId: "codex",
        iconImage: DEFAULT_CODEX.iconImage,
      }
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
      FileManager.writeAsStringSync(CODEX_FILE_CACHE_PATH, JSON.stringify(data))
    } catch {}
    return data
  } catch (e) {
    console.log("刷新 Codex 出现异常:", e)
    return null
  }
}

export function getAntigravityData(): DualQuotaData {
  try {
    // 1. 优先读取本机直连缓存（支持 Storage 与 App Group 文件双通道）
    let local =
      Storage.get<any>(ANTIGRAVITY_CACHE_KEY, { shared: true }) ||
      Storage.get<any>(ANTIGRAVITY_CACHE_KEY)

    if (!local && FileManager.existsSync(ANTIGRAVITY_FILE_CACHE_PATH)) {
      try {
        const raw = FileManager.readAsStringSync(ANTIGRAVITY_FILE_CACHE_PATH)
        if (raw) local = JSON.parse(raw)
      } catch {}
    }

    if (local && (local.item1 || local.stat1)) {
      return {
        ...DEFAULT_ANTIGRAVITY,
        ...local,
        serviceId: "antigravity",
        iconImage: DEFAULT_ANTIGRAVITY.iconImage,
      }
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
                footerStatus: `最紧 ${Math.min(p1, p2)}%`,
                updatedAt: new Date().toISOString(),
              }

              try {
                Storage.set(ANTIGRAVITY_CACHE_KEY, data, { shared: true })
                Storage.set(ANTIGRAVITY_CACHE_KEY, data)
                FileManager.writeAsStringSync(ANTIGRAVITY_FILE_CACHE_PATH, JSON.stringify(data))
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
              stat1: {
                label: "Gem 周",
                value: "100%",
              },
              stat2: {
                label: "C/G 周",
                value: "100%",
              },
              footerStatus: `最紧 ${Math.min(p1, p2)}%`,
              updatedAt: new Date().toISOString(),
            }
            try {
              Storage.set(ANTIGRAVITY_CACHE_KEY, data, { shared: true })
              Storage.set(ANTIGRAVITY_CACHE_KEY, data)
              FileManager.writeAsStringSync(ANTIGRAVITY_FILE_CACHE_PATH, JSON.stringify(data))
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
      statusTitle = "VPN 已连接"
      vpnScore += 50
    } else if (hasVpnInterface) {
      statusTitle = "VPN 已连接"
      vpnScore += 40
    } else if (isOverseas) {
      statusTitle = "VPN 已连接"
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

// ============================================================
// 8. 今日油价（风格 2：Shell 贝壳高光小组件）数据抓取与缓存
// ============================================================
export const FUEL_CACHE_KEY = "dashboard_kit_fuel_cache_v1"
export const FUEL_PROVINCE_KEY = "dashboard_kit_fuel_province"
export const FUEL_OIL_KEY = "dashboard_kit_fuel_oil"
const FUEL_FILE_CACHE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_fuel_cache.json"
const FUEL_SETTINGS_FILE =
  FileManager.appGroupDocumentsDirectory + "/fuel_price_settings.json"

export const FUEL_PROVINCE_MAP: Record<string, string> = {
  北京: "/beijing.shtml",
  上海: "/shanghai.shtml",
  天津: "/tianjin.shtml",
  重庆: "/chongqing.shtml",
  广东: "/guangdong.shtml",
  浙江: "/zhejiang.shtml",
  江苏: "/jiangsu.shtml",
  山东: "/shandong.shtml",
  福建: "/fujian.shtml",
  四川: "/sichuan.shtml",
  湖北: "/hubei.shtml",
  湖南: "/hunan.shtml",
  河南: "/henan.shtml",
  河北: "/hebei.shtml",
  安徽: "/anhui.shtml",
  江西: "/jiangxi.shtml",
  辽宁: "/liaoning.shtml",
  吉林: "/jilin.shtml",
  黑龙江: "/heilongjiang.shtml",
  内蒙古: "/neimenggu.shtml",
  广西: "/guangxi.shtml",
  海南: "/hainan.shtml",
  贵州: "/guizhou.shtml",
  云南: "/yunnan.shtml",
  西藏: "/xizang.shtml",
  陕西: "/shanxi-3.shtml",
  山西: "/shanxi.shtml",
  甘肃: "/gansu.shtml",
  青海: "/qinghai.shtml",
  宁夏: "/ningxia.shtml",
  新疆: "/xinjiang.shtml",
}

export function getFuelData(): FuelCardData {
  try {
    let local =
      Storage.get<FuelCardData>(FUEL_CACHE_KEY, { shared: true }) ||
      Storage.get<FuelCardData>(FUEL_CACHE_KEY)

    if (!local && FileManager.existsSync(FUEL_FILE_CACHE_PATH)) {
      try {
        const raw = FileManager.readAsStringSync(FUEL_FILE_CACHE_PATH)
        if (raw) local = JSON.parse(raw)
      } catch {}
    }

    if (local && local.focusPrice) {
      return {
        ...DEFAULT_FUEL,
        ...local,
        serviceId: "fuel",
      }
    }
  } catch {}
  return DEFAULT_FUEL
}

export async function refreshFuelData(): Promise<FuelCardData | null> {
  try {
    let targetProvince =
      Storage.get<string>(FUEL_PROVINCE_KEY, { shared: true }) ||
      Storage.get<string>(FUEL_PROVINCE_KEY) ||
      ""
    let focusOilKey: "oil92" | "oil95" | "oil98" | "oil0" =
      (Storage.get<any>(FUEL_OIL_KEY, { shared: true }) ||
        Storage.get<any>(FUEL_OIL_KEY) ||
        "") as any

    // 若本地未配置，尝试兼容读取「今日油价」独立脚本已有的配置
    if ((!targetProvince || !focusOilKey) && FileManager.existsSync(FUEL_SETTINGS_FILE)) {
      try {
        const s = JSON.parse(FileManager.readAsStringSync(FUEL_SETTINGS_FILE))
        if (!targetProvince && s.selectedProvince && s.selectedProvince !== "auto") {
          targetProvince = s.selectedProvince.replace(/(省|壮族自治区|回族自治区|自治州|维吾尔自治区|自治区|市)$/, "").trim()
        }
        if (!focusOilKey && s.focusOil) {
          focusOilKey = s.focusOil
        }
      } catch {}
    }

    if (!targetProvince) targetProvince = "北京"
    if (!focusOilKey) focusOilKey = "oil92"

    let path = FUEL_PROVINCE_MAP[targetProvince] || "/beijing.shtml"
    const targetUrl = `http://m.qiyoujiage.com${path.startsWith("/") ? path : `/${path}`}`
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)" },
    })
    const html = await res.text()

    const ddMatches = [...html.matchAll(/<dd>([0-9.]+)/g)].map((m) => m[1])
    const prices: Record<string, string> = {
      oil92: ddMatches[0] || "7.88",
      oil95: ddMatches[1] || "8.39",
      oil98: ddMatches[2] || "9.89",
      oil0: ddMatches[3] || "7.59",
    }

    let rawForecast = "暂无调价预测信息"
    const tishiMatch = html.match(/var tishiContent\s*=\s*"([^"]+)"/)
    if (tishiMatch && tishiMatch[1]) {
      rawForecast = tishiMatch[1].replace(/<br\s*\/?>/gi, "，").replace(/&nbsp;/gi, "").trim()
    }

    let nextAdjustDate = "近期调价"
    const dateMatch = rawForecast.match(/下次油价\s*([0-9]+月[0-9]+日(?:[0-9]+时)?)\s*调整/)
    if (dateMatch) {
      nextAdjustDate = dateMatch[1]
    }

    const isDown = rawForecast.includes("下调") || rawForecast.includes("跌")
    const isUp = rawForecast.includes("上调") || rawForecast.includes("涨")
    const trendType: "down" | "up" | "flat" = isDown ? "down" : isUp ? "up" : "flat"

    let cleanLiter = ""
    const rangeLiterMatch = rawForecast.match(/([0-9.]+)\s*元\/升\s*[-~至到]\s*([0-9.]+)\s*元\/升/)
    if (rangeLiterMatch) {
      cleanLiter = `${rangeLiterMatch[1]}-${rangeLiterMatch[2]}`
    } else {
      const singleLiterMatch = rawForecast.match(/([0-9.]+)\s*元\/升/)
      if (singleLiterMatch) cleanLiter = singleLiterMatch[1]
    }

    const sign = trendType === "down" ? "-" : trendType === "up" ? "+" : ""
    let smallTrend = ""
    if (cleanLiter) {
      smallTrend = `预计${sign}${cleanLiter}`
    } else if (trendType === "flat") {
      smallTrend = "预计搁浅"
    } else {
      smallTrend = trendType === "down" ? "预计下调" : "预计上调"
    }

    const trendColor = trendType === "down" ? "#2FB350" : trendType === "up" ? "#FF3B30" : "#8E8E93"

    const oilThemeNames: Record<string, string> = {
      oil92: "92#",
      oil95: "95#",
      oil98: "98#",
      oil0: "0#",
    }
    const oilName = oilThemeNames[focusOilKey] || "92#"
    const oilFullName = focusOilKey === "oil0" ? "0 号柴油" : `${oilName.replace("#", "")} 号汽油`
    const subTitle = `${targetProvince} ${oilFullName}`
    const cleanDateText = `${(nextAdjustDate || "近期").replace(/调整.*$/, "").replace(/调价.*$/, "").trim()}调价`
    const focusPrice = prices[focusOilKey] || prices.oil92 || "--"

    let cleanDate = (nextAdjustDate || "近期").replace(/调整.*$/, "").replace(/调价.*$/, "").trim()
    let mediumForecast = `${cleanDate}调价`
    const arrow = trendType === "down" ? "↓" : trendType === "up" ? "↑" : "-"
    if (cleanLiter) {
      mediumForecast = `${cleanDate}调价 ${arrow} ${cleanLiter}`
    } else if (trendType === "flat") {
      mediumForecast = `${cleanDate}调价 预计搁浅`
    } else {
      mediumForecast = `${cleanDate}调价 ${arrow}`
    }

    const data: FuelCardData = {
      serviceId: "fuel",
      province: targetProvince,
      focusOilKey,
      oilName,
      oilFullName,
      subTitle,
      focusPrice,
      prices: {
        oil92: prices.oil92 || "--",
        oil95: prices.oil95 || "--",
        oil98: prices.oil98 || "--",
        oil0: prices.oil0 || "--",
      },
      cleanDateText,
      smallTrend,
      mediumForecast,
      trendType,
      trendColor,
      rawForecast,
      updatedAt: new Date().toISOString(),
    }

    try {
      Storage.set(FUEL_CACHE_KEY, data, { shared: true })
      Storage.set(FUEL_CACHE_KEY, data)
      FileManager.writeAsStringSync(FUEL_FILE_CACHE_PATH, JSON.stringify(data))
    } catch {}
    return data
  } catch (e) {
    console.log("拉取油价数据异常:", e)
    return null
  }
}

// ============================================================
// 9. qBittorrent 状态与传输数据抓取与缓存
// ============================================================
export const QB_URL_KEY = "dashboard_kit_qb_url"
export const QB_USER_KEY = "dashboard_kit_qb_username"
export const QB_PASS_KEY = "dashboard_kit_qb_password"
export const QB_CACHE_KEY = "dashboard_kit_qb_cache_v1"
export const QB_SID_KEY = "dashboard_kit_qb_sid"

const QB_FILE_CACHE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_qb_cache.json"

export function hasQbConfigured(): boolean {
  try {
    const url = Keychain.contains(QB_URL_KEY) ? Keychain.get(QB_URL_KEY) || "" : ""
    return !!url.trim()
  } catch {
    return false
  }
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "0 B/s"
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  if (bytesPerSec < 1024 * 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
  return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(2)} GB/s`
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb < 1024) return `${gb.toFixed(1)} GB`
  return `${(gb / 1024).toFixed(1)} TB`
}

export function getQbittorrentData(): QbittorrentData {
  try {
    let local =
      Storage.get<QbittorrentData>(QB_CACHE_KEY, { shared: true }) ||
      Storage.get<QbittorrentData>(QB_CACHE_KEY)

    if (!local && FileManager.existsSync(QB_FILE_CACHE_PATH)) {
      try {
        const raw = FileManager.readAsStringSync(QB_FILE_CACHE_PATH)
        if (raw) local = JSON.parse(raw)
      } catch {}
    }

    if (local && local.dlSpeed !== undefined) {
      return {
        ...DEFAULT_QBITTORRENT,
        ...local,
        serviceId: "qbittorrent",
      }
    }
  } catch {}
  return DEFAULT_QBITTORRENT
}

/** 刷新 qBittorrent 真实传输与任务数据 */
export async function refreshQbittorrentData(): Promise<QbittorrentData | null> {
  try {
    const rawUrl = Keychain.contains(QB_URL_KEY) ? (Keychain.get(QB_URL_KEY) || "").trim() : ""
    if (!rawUrl) return null

    let baseUrl = rawUrl.replace(/\/+$/, "")
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `http://${baseUrl}`
    }

    const username = Keychain.contains(QB_USER_KEY) ? (Keychain.get(QB_USER_KEY) || "").trim() : ""
    const password = Keychain.contains(QB_PASS_KEY) ? (Keychain.get(QB_PASS_KEY) || "").trim() : ""

    let sid = (Storage.get<string>(QB_SID_KEY, { shared: true }) || Storage.get<string>(QB_SID_KEY) || "").trim()

    // 辅助请求方法（带 Cookie）
    const callApi = async (path: string, cookie: string) => {
      return await fetch(`${baseUrl}${path}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
          ...(cookie ? { Cookie: cookie } : {}),
        },
      })
    }

    // 1. 尝试使用现有 Cookie 获取 maindata
    let maindataRes: any = null
    if (sid) {
      try {
        const r = await callApi("/api/v2/sync/maindata", sid)
        if (r.status === 200) {
          maindataRes = await r.json()
        }
      } catch {}
    }

    // 2. 如果未认证或 Cookie 失效，执行登录
    if (!maindataRes) {
      const loginBody = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
      const loginRes = await fetch(`${baseUrl}/api/v2/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: baseUrl,
        },
        body: loginBody,
      })

      const hdrs: any = loginRes.headers
      let setCookie = ""
      if (typeof hdrs.get === "function") {
        setCookie = hdrs.get("set-cookie") || hdrs.get("Set-Cookie") || ""
      }
      if (!setCookie && typeof hdrs.getSetCookie === "function") {
        const arr = hdrs.getSetCookie()
        if (Array.isArray(arr)) setCookie = arr.join("; ")
      }
      if (!setCookie) {
        setCookie = hdrs["set-cookie"] || hdrs["Set-Cookie"] || ""
      }
      if (setCookie) {
        const m = String(setCookie).match(/SID=([^;]+)/)
        if (m) sid = `SID=${m[1]}`
        else sid = setCookie
        Storage.set(QB_SID_KEY, sid, { shared: true })
        Storage.set(QB_SID_KEY, sid)
      }

      const r2 = await callApi("/api/v2/sync/maindata", sid)
      if (r2.status === 200) {
        maindataRes = await r2.json()
      }
    }

    if (!maindataRes || !maindataRes.server_state) {
      return null
    }

    const ss = maindataRes.server_state
    const dlSpeedBytes = ss.dl_info_speed || 0
    const upSpeedBytes = ss.up_info_speed || 0
    const dlSpeed = formatSpeed(dlSpeedBytes)
    const upSpeed = formatSpeed(upSpeedBytes)

    const allTimeDl = formatBytes(ss.alltime_dl || 0)
    const allTimeUl = formatBytes(ss.alltime_ul || 0)

    const ratioVal = ss.alltime_dl > 0 ? (ss.alltime_ul / ss.alltime_dl).toFixed(2) : "--"
    const freeSpace = formatBytes(ss.free_space_on_disk || 0)

    // 统计活动任务与做种任务
    const torrents = maindataRes.torrents || {}
    let activeCount = 0
    let seedingCount = 0
    const totalCount = Object.keys(torrents).length

    for (const hash in torrents) {
      const t = torrents[hash]
      const state = (t.state || "").toLowerCase()
      if (state.includes("downloading") || state.includes("forceddl") || state.includes("stalleddl")) {
        activeCount++
      }
      if (state.includes("uploading") || state.includes("forcedup") || state.includes("stalledup") || state.includes("seeding")) {
        seedingCount++
      }
    }

    let connectionStatus: "connected" | "firewalled" | "disconnected" = "connected"
    if (ss.connection_status === "firewalled") connectionStatus = "firewalled"
    else if (ss.connection_status === "disconnected") connectionStatus = "disconnected"

    let statusText = "运行中"
    if (connectionStatus === "firewalled") statusText = "已连接(防火墙)"
    else if (connectionStatus === "disconnected") statusText = "未连接节点"

    const data: QbittorrentData = {
      serviceId: "qbittorrent",
      statusText,
      serverName: "qBittorrent",
      dlSpeed,
      upSpeed,
      dlSpeedBytes,
      upSpeedBytes,
      activeCount,
      seedingCount,
      totalCount,
      allTimeDl,
      allTimeUl,
      shareRatio: ratioVal,
      freeSpace,
      connectionStatus,
      updatedAt: new Date().toISOString(),
    }

    try {
      Storage.set(QB_CACHE_KEY, data, { shared: true })
      Storage.set(QB_CACHE_KEY, data)
      FileManager.writeAsStringSync(QB_FILE_CACHE_PATH, JSON.stringify(data))
    } catch {}
    return data
  } catch (e) {
    console.log("拉取 qBittorrent 状态异常:", e)
    return null
  }
}

// ============================================================
// 10. Quantumult X 深度联动（方案三：Rewrite 本地桥接 + 桌面切节点/模式 + 订阅流量）
// ============================================================
export const QX_BRIDGE_URL_KEY = "dashboard_kit_qx_bridge_url"
export const QX_SUB_URL_KEY = "dashboard_kit_qx_sub_url"
export const QX_SUB_NAME_KEY = "dashboard_kit_qx_sub_name"
export const QX_POLICIES_KEY = "dashboard_kit_qx_policies"
export const QX_CACHE_KEY = "dashboard_kit_qx_cache_v1"

const QX_FILE_CACHE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_qx_cache.json"

/**
 * 供用户一键复制到 Quantumult X 的本地 Rewrite 与桥接脚本模板
 */
export const QX_REWRITE_GUIDE_TEXT = `# 方式一（推荐）：在 Quantumult X「重写 (Rewrite) -> 引用」中添加远程重写订阅：
https://raw.githubusercontent.com/SylvanRoe/Scripting/refs/heads/main/DashBoard-Kit/qx_dashboard.conf

# 方式二：在 Quantumult X 配置文件 [rewrite_local] 下直接添加一行（自动拉取远程脚本，无需建本地文件）：
^http:\\/\\/qx\\.(lan|local)\\/api url script-analyze-echo-response https://raw.githubusercontent.com/SylvanRoe/Scripting/refs/heads/main/DashBoard-Kit/qx_dashboard_bridge.js`

const MODE_LABELS: Record<"filter" | "all_proxy" | "all_direct", string> = {
  filter: "规则分流",
  all_proxy: "全部代理",
  all_direct: "全部直连",
}

export function hasQxConfigured(): boolean {
  try {
    const sub = Keychain.contains(QX_SUB_URL_KEY) ? Keychain.get(QX_SUB_URL_KEY) || "" : ""
    const bridge = Keychain.contains(QX_BRIDGE_URL_KEY) ? Keychain.get(QX_BRIDGE_URL_KEY) || "" : ""
    return !!(sub.trim() || bridge.trim())
  } catch {
    return false
  }
}

export function saveQxData(data: QuantumultXData) {
  try {
    Storage.set(QX_CACHE_KEY, data, { shared: true })
    Storage.set(QX_CACHE_KEY, data)
    FileManager.writeAsStringSync(QX_FILE_CACHE_PATH, JSON.stringify(data))
  } catch {}
}

export function getQxData(): QuantumultXData {
  try {
    const fromStorage =
      Storage.get<QuantumultXData>(QX_CACHE_KEY, { shared: true }) ||
      Storage.get<QuantumultXData>(QX_CACHE_KEY)

    let fromFile: QuantumultXData | null = null
    if (FileManager.existsSync(QX_FILE_CACHE_PATH)) {
      try {
        const raw = FileManager.readAsStringSync(QX_FILE_CACHE_PATH)
        if (raw) fromFile = JSON.parse(raw)
      } catch {}
    }

    let local = fromStorage
    if (fromFile && fromFile.serviceId === "qx") {
      const tFile = Date.parse(fromFile.updatedAt || "") || 0
      const tStor = Date.parse(fromStorage?.updatedAt || "") || 0
      if (!local || tFile >= tStor) {
        local = fromFile
      }
    }

    if (local && local.serviceId === "qx" && Array.isArray(local.policies)) {
      return {
        ...DEFAULT_QX,
        ...local,
        serviceId: "qx",
      }
    }
  } catch {}
  return DEFAULT_QX
}

function flagFromCountry(countryOrCode: string): string {
  const s = (countryOrCode || "").toUpperCase()
  if (s.includes("HK") || s.includes("香港")) return "🇭🇰"
  if (s.includes("SG") || s.includes("新加坡") || s.includes("狮城")) return "🇸🇬"
  if (s.includes("JP") || s.includes("日本") || s.includes("东京") || s.includes("大阪")) return "🇯🇵"
  if (s.includes("US") || s.includes("美国") || s.includes("硅谷") || s.includes("洛杉矶")) return "🇺🇸"
  if (s.includes("TW") || s.includes("台湾") || s.includes("台北")) return "🇹🇼"
  if (s.includes("KR") || s.includes("韩国") || s.includes("首尔")) return "🇰🇷"
  if (s.includes("MY") || s.includes("马来")) return "🇲🇾"
  if (s.includes("TH") || s.includes("泰国")) return "🇹🇭"
  if (s.includes("VN") || s.includes("越南")) return "🇻🇳"
  if (s.includes("IN") || s.includes("印度")) return "🇮🇳"
  if (s.includes("AU") || s.includes("澳大利亚") || s.includes("悉尼")) return "🇦🇺"
  if (s.includes("CA") || s.includes("加拿大")) return "🇨🇦"
  if (s.includes("FR") || s.includes("法国")) return "🇫🇷"
  if (s.includes("NL") || s.includes("荷兰")) return "🇳🇱"
  if (s.includes("RU") || s.includes("俄罗斯")) return "🇷🇺"
  if (s.includes("GB") || s.includes("UK") || s.includes("英国") || s.includes("伦敦")) return "🇬🇧"
  if (s.includes("DE") || s.includes("德国") || s.includes("法兰克福")) return "🇩🇪"
  if (s.includes("CN") || s.includes("中国")) return "🇨🇳"
  return "🌐"
}

/**
 * 解析机场订阅响应头 subscription-userinfo: upload=123; download=456; total=789; expire=1790000000
 */
function parseSubscriptionUserinfo(headerVal: string): {
  usedGb: string
  totalGb: string
  remainGb: string
  remainPct: number
  expireText: string
  downloadTraffic: string
  uploadTraffic: string
} | null {
  if (!headerVal) return null
  const getNum = (key: string) => {
    const m = headerVal.match(new RegExp(`${key}=([0-9.]+)`, "i"))
    return m ? Number(m[1]) : 0
  }
  const upload = getNum("upload")
  const download = getNum("download")
  const total = getNum("total")
  const expire = getNum("expire")
  if (total <= 0) return null

  const usedBytes = upload + download
  const remainBytes = Math.max(0, total - usedBytes)
  const remainPct = Math.round((remainBytes / total) * 1000) / 10

  const toGb = (b: number) => {
    const gb = b / (1024 * 1024 * 1024)
    return gb >= 100 ? `${Math.round(gb)} GB` : `${gb.toFixed(1)} GB`
  }

  const formatTraffic = (b: number) => {
    const gb = b / (1024 * 1024 * 1024)
    if (gb >= 1) return gb >= 100 ? `${Math.round(gb)} GB` : `${gb.toFixed(1)} GB`
    const mb = b / (1024 * 1024)
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    const kb = b / 1024
    return `${Math.max(0.1, Math.round(kb * 10) / 10)} KB`
  }

  let expireText = "长期有效"
  if (expire > 0) {
    const days = Math.max(0, Math.ceil((expire * 1000 - Date.now()) / (86400 * 1000)))
    expireText = days > 0 ? `${days}天后到期` : "今日到期"
  }

  return {
    usedGb: toGb(usedBytes),
    totalGb: toGb(total),
    remainGb: toGb(remainBytes),
    remainPct,
    expireText,
    downloadTraffic: formatTraffic(download),
    uploadTraffic: formatTraffic(upload),
  }
}

/**
 * 刷新 Quantumult X 状态（并发请求本地 Rewrite 桥接接口 + 机场订阅流量头 + 实时延迟与出口）
 */
export async function refreshQxData(): Promise<QuantumultXData | null> {
  try {
    const current = getQxData()
    const rawBridge = (
      (Keychain.contains(QX_BRIDGE_URL_KEY) ? Keychain.get(QX_BRIDGE_URL_KEY) : "") ||
      "http://qx.lan/api"
    ).trim()
    const bridgeUrl = rawBridge.replace("://qx.local/", "://qx.lan/")
    const subUrl = (Keychain.contains(QX_SUB_URL_KEY) ? Keychain.get(QX_SUB_URL_KEY) || "" : "").trim()
    const subName = (
      (Keychain.contains(QX_SUB_NAME_KEY) ? Keychain.get(QX_SUB_NAME_KEY) : "") ||
      current.subName ||
      "Quantumult X"
    ).trim()

    let runningMode = current.runningMode
    let runningModeLabel = MODE_LABELS[runningMode] || "规则分流"
    let bridgeConnected = false
    let policies: QxPolicyItem[] = current.policies.map((p) => ({ ...p }))
    let policyGroupCount = current.policyGroupCount || "14"
    let activeNodeCount = current.activeNodeCount || "6"
    let qxVersion = current.qxVersion || "Quantumult X 1.8.1"

    // 1. 尝试调用 QX 本地 Rewrite Bridge 获取真实策略组与运行模式
    try {
      const sep = bridgeUrl.includes("?") ? "&" : "?"
      const res = await fetch(`${bridgeUrl}${sep}action=status`, { timeout: 1.5 })
      if (res.ok) {
        const json: any = await res.json().catch(() => null)
        if (json && (json.ok || json.running_mode || json.policies)) {
          bridgeConnected = true
          if (json.version) {
            const vStr = String(json.version).trim()
            qxVersion = vStr.toLowerCase().startsWith("quantumult") ? vStr : `Quantumult X ${vStr}`
          }
          if (
            json.running_mode === "filter" ||
            json.running_mode === "all_proxy" ||
            json.running_mode === "all_direct"
          ) {
            runningMode = json.running_mode
            runningModeLabel = MODE_LABELS[runningMode]
          }
          if (json.policies && typeof json.policies === "object") {
            const pKeys = Object.keys(json.policies)
            if (pKeys.length > 0) {
              policyGroupCount = String(pKeys.length)
              // 收集所有区域子策略组与当前活跃落地节点，供未返回完整 candidates 时智能构建候选列表
              const regionGroups = pKeys.filter((k) =>
                /自动|香港|台湾|日本|狮城|新加坡|美国|韩国|英国|德国|节点|HK|TW|JP|SG|US/i.test(k)
              )
              const mainProxyKey = pKeys.find((k) => /^(proxy|节点选择|主策略)$/i.test(k))
              const leafNodes: string[] = []
              for (const k of pKeys) {
                const v = json.policies[k]
                if (Array.isArray(v) && v.length >= 2) {
                  const leaf = String(v[v.length - 1] || "")
                  if (
                    leaf &&
                    !pKeys.includes(leaf) &&
                    leaf.toLowerCase() !== "direct" &&
                    leaf !== "⚠️" &&
                    !leafNodes.includes(leaf)
                  ) {
                    leafNodes.push(leaf)
                  }
                }
              }
              if (leafNodes.length > 0) {
                activeNodeCount = String(leafNodes.length)
              }

              const iconForGroup = (name: string, idx: number): string => {
                if (/苹果|apple/i.test(name)) return "apple.logo"
                if (/媒体|影视|流媒体|stream|emby|netflix|youtube|哔哩|bilibili/i.test(name)) return "play.tv.fill"
                if (/音乐|music|spotify|声田/i.test(name)) return "music.note"
                if (/ai|openai|claude|gpt|gemini/i.test(name)) return "sparkles"
                if (/全球|加速|global/i.test(name)) return "bolt.horizontal.circle.fill"
                if (/兜底|final|match/i.test(name)) return "shield.lefthalf.filled"
                return DEFAULT_QX.policies[idx]?.icon || "globe.asia.australia.fill"
              }

              const labelForGroup = (name: string): string => {
                if (name.toLowerCase() === "proxy") return "节点选择"
                return name
              }

              // 解析 QX get_policy_state 策略链数组 [策略组名本身, 当前选中项, ...(最终落地节点)]
              // 或 get_customized_policy 对象格式 { selected, candidates }
              const parsePolicyEntry = (key: string, val: any) => {
                if (Array.isArray(val) && val.length > 0) {
                  // get_policy_state 返回格式: [groupName, currentSelected, ...leafNode]
                  const rawSelected =
                    val.length >= 2 && String(val[0]) === key
                      ? String(val[1])
                      : String(val[0])
                  // 如果选中项本身是子策略组，优先展示可读性更好的选中项
                  const sel = rawSelected === "⚠️" && val.length >= 3 ? String(val[2]) : rawSelected

                  const cands: string[] = []
                  const pushCand = (c: string) => {
                    if (c && c !== key && c !== "⚠️" && !cands.includes(c)) cands.push(c)
                  }
                  pushCand(sel)

                  if (key.toLowerCase() === "proxy" || regionGroups.includes(key)) {
                    // 圈X内置 proxy 组与地区组只能直接选择具体服务器节点（不能选子策略组），因此只放入真实活跃节点与 direct
                    for (const lf of leafNodes) pushCand(lf)
                    pushCand("direct")
                  } else {
                    // 分流规则组（如全球加速、国际媒体、苹果服务、哔哩哔哩等）：可在 proxy、自动选择、各地区组、direct 间切换
                    if (mainProxyKey) pushCand(mainProxyKey)
                    for (const rg of regionGroups) pushCand(rg)
                    pushCand("direct")
                  }
                  return { selected: sel, candidates: cands.length > 0 ? cands : [sel] }
                }
                if (val && typeof val === "object") {
                  const cands =
                    Array.isArray(val.candidates) && val.candidates.length > 0
                      ? val.candidates.map(String)
                      : ["direct"]
                  const sel = String(val.selected || cands[0] || "direct")
                  return { selected: sel, candidates: cands }
                }
                return { selected: "direct", candidates: ["direct"] }
              }

              // 读取用户自定义的 4 个策略组名称（如有），否则按智能优先级选取 4 个真实策略组
              let preferredKeys: string[] = []
              try {
                const savedCustom = Keychain.contains(QX_POLICIES_KEY)
                  ? Keychain.get(QX_POLICIES_KEY) || ""
                  : ""
                if (savedCustom.trim()) {
                  preferredKeys = savedCustom
                    .split(/[,，\n]/)
                    .map((s) => s.trim())
                    .filter((s) => pKeys.includes(s))
                }
              } catch {}

              if (preferredKeys.length < 4) {
                const priorityOrder = [
                  "proxy",
                  "全球加速",
                  "国际媒体",
                  "苹果服务",
                  "哔哩哔哩",
                  "声田音乐",
                  "兜底分流",
                  "自动选择",
                  "香港节点",
                  "台湾节点",
                  "日本节点",
                  "狮城节点",
                  "美国节点",
                ]
                for (const pk of priorityOrder) {
                  const found = pKeys.find((k) => k.toLowerCase() === pk.toLowerCase())
                  if (found && !preferredKeys.includes(found)) {
                    preferredKeys.push(found)
                    if (preferredKeys.length >= 4) break
                  }
                }
                for (const k of pKeys) {
                  if (preferredKeys.length >= 4) break
                  if (!preferredKeys.includes(k)) preferredKeys.push(k)
                }
              }

              policies = preferredKeys.slice(0, 4).map((k, idx) => {
                const parsed = parsePolicyEntry(k, json.policies[k])
                return {
                  id: k,
                  label: labelForGroup(k),
                  selected: parsed.selected,
                  candidates: parsed.candidates,
                  icon: iconForGroup(k, idx),
                }
              })
            }
          }
        }
      }
    } catch {}

    // 2. 若配置了机场订阅链接，拉取真实流量与到期时间
    let usedGb = current.usedGb
    let totalGb = current.totalGb
    let remainGb = current.remainGb
    let remainPct = current.remainPct
    let expireText = current.expireText
    let downloadTraffic = current.downloadTraffic || "102.6 GB"
    let uploadTraffic = current.uploadTraffic || "5.8 GB"

    if (subUrl) {
      try {
        const subRes = await fetch(subUrl, {
          method: "GET",
          headers: { "User-Agent": "Quantumult%20X/1.4.4 (iPhone; iOS 17.5)" },
          timeout: 5,
        })
        const hdrs: any = subRes.headers
        let userInfo = ""
        if (typeof hdrs?.get === "function") {
          userInfo =
            hdrs.get("subscription-userinfo") ||
            hdrs.get("Subscription-Userinfo") ||
            hdrs.get("SUBSCRIPTION-USERINFO") ||
            ""
        } else if (hdrs && typeof hdrs === "object") {
          for (const k of Object.keys(hdrs)) {
            if (k.toLowerCase() === "subscription-userinfo") {
              userInfo = String(hdrs[k])
              break
            }
          }
        }
        const parsed = parseSubscriptionUserinfo(userInfo)
        if (parsed) {
          usedGb = parsed.usedGb
          totalGb = parsed.totalGb
          remainGb = parsed.remainGb
          remainPct = parsed.remainPct
          expireText = parsed.expireText
          downloadTraffic = parsed.downloadTraffic
          uploadTraffic = parsed.uploadTraffic
        }
      } catch (e) {
        console.log("拉取 QX 机场订阅流量失败:", e)
      }
    }

    // 3. 测量实时代理延迟与当前出口地区
    let latencyMs = current.latencyMs
    let outboundTag = current.outboundTag
    try {
      const t0 = Date.now()
      const [pingRes, ipInfo] = await Promise.all([
        fetch("http://cp.cloudflare.com/generate_204", { timeout: 3 }).catch(() => null),
        fetch(IP_API_URL, { timeout: 3.5 })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ])
      if (pingRes) {
        const dt = Math.max(8, Date.now() - t0)
        latencyMs = `${dt} ms`
      }
      if (ipInfo && ipInfo.status === "success") {
        const flag = flagFromCountry(ipInfo.countryCode || ipInfo.country || "")
        const region = ipInfo.country || ipInfo.regionName || "海外"
        const firstOctet = String(ipInfo.query || "").split(".")[0]
        outboundTag = `${flag} ${region}${firstOctet ? ` · ${firstOctet}.*` : ""}`
      }
    } catch {}

    const nextData: QuantumultXData = {
      serviceId: "qx",
      runningMode,
      runningModeLabel,
      bridgeConnected,
      subName,
      usedGb,
      totalGb,
      remainGb,
      remainPct,
      expireText,
      downloadTraffic,
      uploadTraffic,
      policyGroupCount,
      activeNodeCount,
      latencyMs,
      outboundTag,
      qxVersion,
      policies,
      updatedAt: new Date().toISOString(),
    }

    saveQxData(nextData)
    return nextData
  } catch (e) {
    console.log("刷新 Quantumult X 数据异常:", e)
    return null
  }
}

/**
 * 桌面交互按钮：循环切换 Quantumult X 运行模式（规则分流 -> 全部代理 -> 全部直连）
 */
export async function switchQxRunningMode(): Promise<QuantumultXData> {
  const current = getQxData()
  const order: ("filter" | "all_proxy" | "all_direct")[] = ["filter", "all_proxy", "all_direct"]
  const idx = order.indexOf(current.runningMode)
  const nextMode = order[(idx + 1) % order.length]
  const nextLabel = MODE_LABELS[nextMode]

  const updated: QuantumultXData = {
    ...current,
    runningMode: nextMode,
    runningModeLabel: nextLabel,
    updatedAt: new Date().toISOString(),
  }
  // 先立即落盘，确保桌面小组件毫秒级刷新 UI
  saveQxData(updated)

  const rawBridge = (
    (Keychain.contains(QX_BRIDGE_URL_KEY) ? Keychain.get(QX_BRIDGE_URL_KEY) : "") ||
    "http://qx.lan/api"
  ).trim()
  const bridgeUrl = rawBridge.replace("://qx.local/", "://qx.lan/")

  try {
    const sep = bridgeUrl.includes("?") ? "&" : "?"
    const res = await fetch(`${bridgeUrl}${sep}action=set_mode&mode=${nextMode}`, { timeout: 1.2 }).catch(
      () => null
    )
    if (res && res.ok) {
      updated.bridgeConnected = true
      saveQxData(updated)
    }
  } catch {}

  return updated
}

/**
 * 桌面交互按钮：点击某个策略组直接切换到下一个候选节点
 */
export async function switchQxPolicyNode(policyId: string): Promise<QuantumultXData> {
  const current = getQxData()
  let targetNode = ""

  const nextPolicies = current.policies.map((p) => {
    if (p.id === policyId || p.label === policyId) {
      const cands = Array.isArray(p.candidates) && p.candidates.length > 0 ? p.candidates : [p.selected]
      const curIdx = cands.indexOf(p.selected)
      const nextNode = cands[(curIdx + 1) % cands.length]
      targetNode = nextNode
      return {
        ...p,
        selected: nextNode,
      }
    }
    return p
  })

  const updated: QuantumultXData = {
    ...current,
    policies: nextPolicies,
    updatedAt: new Date().toISOString(),
  }
  // 先立即落盘，确保桌面小组件毫秒级刷新 UI
  saveQxData(updated)

  if (targetNode) {
    const rawBridge = (
      (Keychain.contains(QX_BRIDGE_URL_KEY) ? Keychain.get(QX_BRIDGE_URL_KEY) : "") ||
      "http://qx.lan/api"
    ).trim()
    const bridgeUrl = rawBridge.replace("://qx.local/", "://qx.lan/")
    try {
      const sep = bridgeUrl.includes("?") ? "&" : "?"
      const res = await fetch(
        `${bridgeUrl}${sep}action=set_policy&policy=${encodeURIComponent(policyId)}&node=${encodeURIComponent(targetNode)}`,
        { timeout: 1.2 }
      ).catch(() => null)
      if (res && res.ok) {
        updated.bridgeConnected = true
        saveQxData(updated)
      }
    } catch {}
  }

  return updated
}



