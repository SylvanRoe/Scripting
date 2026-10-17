// ============================================================
// 12. 中国联通（CUCC）深度联动
// 话费余额 / 通用流量 / 语音余量 三合一监控（支持 BoxJS 或手动 Cookie）
// ============================================================
import { Script, fetch } from "scripting"

export const UNICOM_COOKIE_KEY = "dashboard_kit_unicom_cookie"
export const UNICOM_BOXJS_KEY = "dashboard_kit_unicom_boxjs"
export const UNICOM_CACHE_KEY = "dashboard_kit_unicom_cache_v1"

const UNICOM_FILE_CACHE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_unicom_cache.json"

const UNICOM_SETTINGS_FILE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_unicom_settings.json"

// 中国联通官方红色中国结 Logo 本地路径
export const UNICOM_LOGO_PATH = `${Script.directory}/assets/unicom.png`

export interface UnicomSettings {
  cookie?: string
  enableBoxJs?: boolean
  boxJsUrl?: string
}

export function getUnicomSettings(): UnicomSettings {
  const out: UnicomSettings = {}
  try {
    if (FileManager.existsSync(UNICOM_SETTINGS_FILE_PATH)) {
      const raw = FileManager.readAsStringSync(UNICOM_SETTINGS_FILE_PATH)
      if (raw) Object.assign(out, JSON.parse(raw))
    }
  } catch {}
  try {
    const stor =
      Storage.get<UnicomSettings>("dashboard_kit_unicom_settings_v1", { shared: true }) ||
      Storage.get<UnicomSettings>("dashboard_kit_unicom_settings_v1")
    if (stor && typeof stor === "object") {
      if (out.cookie === undefined) out.cookie = stor.cookie
      if (out.enableBoxJs === undefined) out.enableBoxJs = stor.enableBoxJs
      if (out.boxJsUrl === undefined) out.boxJsUrl = stor.boxJsUrl
    }
  } catch {}
  try {
    if (!out.cookie && Keychain.contains(UNICOM_COOKIE_KEY)) {
      out.cookie = Keychain.get(UNICOM_COOKIE_KEY) || ""
    }
  } catch {}
  return out
}

export function saveUnicomSettings(patch: Partial<UnicomSettings>) {
  const next: UnicomSettings = { ...getUnicomSettings(), ...patch }
  try {
    FileManager.writeAsStringSync(UNICOM_SETTINGS_FILE_PATH, JSON.stringify(next))
  } catch {}
  try {
    Storage.set("dashboard_kit_unicom_settings_v1", next, { shared: true })
    Storage.set("dashboard_kit_unicom_settings_v1", next)
  } catch {}
  try {
    if (patch.cookie !== undefined) {
      if (patch.cookie.trim()) {
        Keychain.set(UNICOM_COOKIE_KEY, patch.cookie.trim(), {
          accessibility: "first_unlock_this_device",
        })
      } else {
        Keychain.remove(UNICOM_COOKIE_KEY)
      }
    }
  } catch {}
}

export interface UnicomData {
  serviceId: "unicom"
  feeBalance: string // "38.60"
  feeUnit: string // "元"
  flowUsedGb: string // "12.35"
  flowTotalGb: string // "30.00" 或 "" 表示不限量
  flowPct: number // 0~100，不限量时为 0
  flowUnlimited: boolean
  voiceUsedMin: number // 已用分钟
  voiceTotalMin: number // 总分钟，<=0 表示不限量
  updatedAt: string
}

export const DEFAULT_UNICOM: UnicomData = {
  serviceId: "unicom",
  feeBalance: "38.60",
  feeUnit: "元",
  flowUsedGb: "12.35",
  flowTotalGb: "30.00",
  flowPct: 41.2,
  flowUnlimited: false,
  voiceUsedMin: 120,
  voiceTotalMin: 300,
  updatedAt: new Date().toISOString(),
}

const MB_PER_GB = 1024

const FEE_ENDPOINT =
  "https://m.client.10010.com/mobileserviceimportant/home/queryUserInfoSeven"
const DETAIL_ENDPOINT =
  "https://m.client.10010.com/servicequerybusiness/operationservice/queryOcsPackageFlowLeftContentRevisedInJune"
const UNICOM_UA =
  "ChinaUnicom.x CFNetwork iOS/16.3 unicom{version:iphone_c@10.0100}"

function parseCookie(raw: string): Record<string, string> {
  const values: Record<string, string> = Object.create(null)
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=")
    if (eq < 1) continue
    values[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
  }
  return values
}

function buildFeeUrl(cookie: string): string {
  const v = parseCookie(cookie)
  const version = v.c_version || "iphone_c@10.0100"
  const mobile = [v.c_mobile, v.u_account].find((m) => /^1\d{10}$/.test(m || ""))
  const params = [`version=${encodeURIComponent(version)}`, "showType=0"]
  if (mobile) params.push(`desmobiel=${encodeURIComponent(mobile)}`)
  return `${FEE_ENDPOINT}?${params.join("&")}`
}

function num(v: unknown): number | undefined {
  if (typeof v !== "number" && typeof v !== "string") return undefined
  if (typeof v === "string" && !v.trim()) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function sumField(items: any[], field: string): number | undefined {
  if (!items.length) return undefined
  const vals = items.map((i) => num(i?.[field]))
  if (vals.some((v) => v === undefined)) return undefined
  return (vals as number[]).reduce((a, b) => a + b, 0)
}

interface FlowUsage {
  totalMB: number
  usedMB: number
  hasFiniteTotal: boolean
}

function extractGeneralFlow(detail: any): FlowUsage {
  const summary = detail?.flowSumList?.find((i: any) => String(i.flowtype) === "1")
  const fres = detail?.fresSumList?.find((i: any) => String(i.flowtype) === "1")
  const resource = detail?.resources?.find(
    (i: any) => String(i.type).toLowerCase() === "flow"
  )
  const details =
    resource?.details?.filter((i: any) => String(i.flowType) === "1") ?? []
  const factor = String(detail?.canuseFlowAllUnit || "GB").toUpperCase() === "MB" ? 1 : MB_PER_GB
  const resUsed = num(resource?.userResource)
  const resRemain = num(resource?.remainResource)
  const used = Math.max(
    0,
    num(summary?.xusedvalue) ?? num(fres?.xusedvalue) ?? sumField(details, "use") ??
      (resUsed === undefined ? 0 : resUsed * factor)
  )
  const reportedRemain =
    num(summary?.xcanusevalue) ?? num(fres?.xcanusevalue) ?? sumField(details, "remain") ??
    (resRemain === undefined ? undefined : resRemain * factor)
  const detailTotal = sumField(details, "total")
  const hasNegative = details.some((i: any) => (num(i.total) ?? 0) < 0)
  const inferred = reportedRemain === undefined ? 0 : used + reportedRemain
  const rawTotal = hasNegative ? 0 : detailTotal ?? inferred
  const total = Number.isFinite(rawTotal) ? Math.max(0, rawTotal) : 0
  return {
    totalMB: total,
    usedMB: used,
    hasFiniteTotal: total > 0,
  }
}

function extractVoice(detail: any): { usedMin: number; totalMin: number } {
  const resource = detail?.resources?.find(
    (i: any) => String(i.type).toLowerCase() === "voice"
  )
  const summary = detail?.voiceSumList?.find(
    (i: any) => String(i.voicetype) === "1" || String(i.flowtype) === "1"
  )
  const details = resource?.details ?? []
  const factor = String(detail?.canuseVoiceAllUnit || "分钟").toUpperCase() === "分钟" ? 1 : 1
  const used = Math.max(
    0,
    num(summary?.xusedvalue) ?? sumField(details, "use") ??
      (num(resource?.userResource) === undefined ? 0 : (num(resource?.userResource) as number) * factor)
  )
  const remain =
    num(summary?.xcanusevalue) ?? sumField(details, "remain") ??
    (num(resource?.remainResource) === undefined ? undefined : (num(resource?.remainResource) as number) * factor)
  const total = remain === undefined ? 0 : used + remain
  return { usedMin: used, totalMin: Math.max(0, total) }
}

/**
 * 在任意 JSON 结构中深度查找 Cookie 字段。
 * 兼容多种 BoxJS 存储形状：
 *   - {"Cookie":"ecs_token=...; c_mobile=..."}          （直存）
 *   - {"ChinaUnicom":{"Settings":{"Cookie":"..."}}}   （嵌套）
 *   - {"val":"..."} / 数组包裹 等
 */
function deepFindCookie(node: any, depth = 0): string | null {
  if (node == null || depth > 6) return null
  if (typeof node === "string") {
    const s = node.trim()
    return s.includes("=") && s.length > 16 ? s : null
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFindCookie(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof node === "object") {
    // 优先直接取 Cookie 字段
    for (const key of ["Cookie", "cookie", "COOKIE"]) {
      const v = (node as any)[key]
      if (typeof v === "string" && v.trim()) return v.trim()
    }
    // 否则递归子节点
    for (const k of Object.keys(node)) {
      const found = deepFindCookie((node as any)[k], depth + 1)
      if (found) return found
    }
    return null
  }
  return null
}

/**
 * 智能解析联通凭据输入，支持三种格式：
 *
 * 1. BoxJS 路径键（推荐）：`@ZayiaComponentService.ChinaUnicom.Settings`
 *    - 解析出 BoxJS key（ZayiaComponentService）与子路径（ChinaUnicom.Settings）
 *    - 通过 BoxJS HTTP API 读取，深度查找 Cookie 字段
 *    - 兼容省略 @ 前缀、带 .Cookie 后缀、只填 key 等写法
 *
 * 2. BoxJS JSON 值：`{"Cookie":"ecs_token=...; c_mobile=..."}`
 *    - 直接粘贴 BoxJS 里的 val 内容，自动提取 Cookie 字段
 *
 * 3. 原始 Cookie 字符串：`ecs_token=...; c_mobile=1xxxxxxxxxx; ...`
 *    - 含 `=` 且不以 @ 或 { 开头时视为原始 Cookie，直接使用
 */
export function parseUnicomCredential(raw: string): {
  isBoxJsPath: boolean
  cookie: string
  boxKey: string
  subPath: string
} {
  const input = String(raw || "").trim()

  // 直接粘贴的 BoxJS JSON 值：{"Cookie":"..."}
  if (input.startsWith("{")) {
    try {
      const obj = JSON.parse(input)
      const c = deepFindCookie(obj)
      if (c) return { isBoxJsPath: false, cookie: c, boxKey: "", subPath: "" }
    } catch {}
  }

  // 原始 Cookie 字符串：含 = 且不以 @ 开头
  if (input && input.includes("=") && !input.startsWith("@")) {
    return { isBoxJsPath: false, cookie: input, boxKey: "", subPath: "" }
  }

  // BoxJS 路径键
  const path = input.replace(/^@+/, "")
  const parts = path.split(".").filter(Boolean)
  const boxKey = parts[0] || "ZayiaComponentService"
  const subPath = parts.slice(1).join(".")
  return { isBoxJsPath: true, cookie: "", boxKey, subPath }
}

async function fetchCookieFromBoxJsPath(
  boxKey: string,
  subPath: string,
  boxJsUrl: string
): Promise<string | null> {
  try {
    const base = String(boxJsUrl || "https://boxjs.com").replace(/\/+$/, "")
    const res = await fetch(`${base}/query/data/${encodeURIComponent(boxKey)}`, {
      headers: { Accept: "application/json" },
      timeout: 5,
    })
    if (!res.ok) return null
    const data: any = await res.json()
    const rawVal = data?.val
    if (!rawVal) return null

    let root: any = rawVal
    if (typeof root === "string") {
      try {
        root = JSON.parse(root)
      } catch {
        // val 本身不是 JSON，可能直接就是 Cookie 字符串
        return root.includes("=") ? root.trim() : null
      }
    }

    // 1) 按 subPath 逐级取值（精确匹配优先）
    if (subPath) {
      let cur: any = root
      let ok = true
      for (const p of subPath.split(".")) {
        if (cur == null || typeof cur !== "object") {
          ok = false
          break
        }
        cur = cur[p]
      }
      if (ok && cur != null) {
 if (typeof cur === "string" && cur.includes("=")) return cur.trim()
        const found = deepFindCookie(cur)
        if (found) return found
      }
    }

    // 2) 回退：整树深度查找 Cookie 字段（兼容 {"Cookie":"..."} 直存）
    return deepFindCookie(root)
  } catch {
    return null
  }
}

/** 解析用户输入，最终拿到可用于请求的原始 Cookie 字符串 */
async function resolveUnicomCookie(
  raw: string,
  boxJsUrl: string
): Promise<string> {
  const parsed = parseUnicomCredential(raw)
  if (!parsed.isBoxJsPath) return parsed.cookie
  if (!parsed.boxKey) return ""
  return (await fetchCookieFromBoxJsPath(parsed.boxKey, parsed.subPath, boxJsUrl)) || ""
}

export function hasUnicomConfigured(): boolean {
  const s = getUnicomSettings()
  return !!(s.cookie && s.cookie.trim())
}

export function saveUnicomData(data: UnicomData) {
  try {
    Storage.set(UNICOM_CACHE_KEY, data, { shared: true })
    Storage.set(UNICOM_CACHE_KEY, data)
    FileManager.writeAsStringSync(UNICOM_FILE_CACHE_PATH, JSON.stringify(data))
  } catch {}
}

export function getUnicomData(): UnicomData {
  try {
    const fromStorage =
      Storage.get<UnicomData>(UNICOM_CACHE_KEY, { shared: true }) ||
      Storage.get<UnicomData>(UNICOM_CACHE_KEY)
    let fromFile: UnicomData | null = null
    if (FileManager.existsSync(UNICOM_FILE_CACHE_PATH)) {
      try {
        const raw = FileManager.readAsStringSync(UNICOM_FILE_CACHE_PATH)
        if (raw) fromFile = JSON.parse(raw)
      } catch {}
    }
    let local = fromStorage
    if (fromFile && fromFile.serviceId === "unicom") {
      const tFile = Date.parse(fromFile.updatedAt || "") || 0
      const tStor = Date.parse(fromStorage?.updatedAt || "") || 0
      if (!local || tFile >= tStor) local = fromFile
    }
    if (local && local.serviceId === "unicom") {
      return { ...DEFAULT_UNICOM, ...local, serviceId: "unicom" }
    }
  } catch {}
  return DEFAULT_UNICOM
}

function formatGb(mb: number): string {
  const gb = Math.max(0, mb) / MB_PER_GB
  return gb >= 100 ? gb.toFixed(0) : gb.toFixed(2)
}

export async function refreshUnicomData(): Promise<UnicomData | null> {
  try {
    const settings = getUnicomSettings()
    const boxJsUrl = (settings.boxJsUrl || "https://boxjs.com").trim()
    // 智能解析：支持 BoxJS 路径键（@ZayiaComponentService.ChinaUnicom.Settings）或原始 Cookie
    let cookie = await resolveUnicomCookie(settings.cookie || "", boxJsUrl)
    if (!cookie) return null

    const [feeRes, detailRes] = await Promise.all([
      fetch(buildFeeUrl(cookie), {
        headers: { Host: "m.client.10010.com", "User-Agent": UNICOM_UA, cookie },
        timeout: 6,
      }).catch(() => null),
      fetch(DETAIL_ENDPOINT, {
        headers: {
          Host: "m.client.10010.com",
          "User-Agent": UNICOM_UA,
          cookie,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        body: "{}",
        timeout: 6,
      }).catch(() => null),
    ])

    let feeBalance = ""
    if (feeRes && feeRes.ok) {
      const feeJson: any = await feeRes.json().catch(() => null)
      if (feeJson && feeJson.code === "Y") {
        // feeResource 形如 "1234"（分）或带小数；userResource 为已用
        const raw = num(feeJson.feeResource)
        if (raw !== undefined) {
          feeBalance = (raw / 100).toFixed(2)
        }
      }
    }

    let flow: FlowUsage = { totalMB: 0, usedMB: 0, hasFiniteTotal: false }
    let voice = { usedMin: 0, totalMin: 0 }
    if (detailRes && detailRes.ok) {
      const detailJson: any = await detailRes.json().catch(() => null)
      if (detailJson && detailJson.code === "Y") {
        flow = extractGeneralFlow(detailJson)
        voice = extractVoice(detailJson)
      }
    }

    if (!feeBalance && flow.usedMB <= 0) return null

    const unlimited = !flow.hasFiniteTotal
    const pct = unlimited
      ? 0
      : Math.max(0, Math.min(100, Math.round((flow.usedMB / Math.max(1, flow.totalMB)) * 1000) / 10))

    const data: UnicomData = {
      serviceId: "unicom",
      feeBalance: feeBalance || "--",
      feeUnit: "元",
      flowUsedGb: formatGb(flow.usedMB),
      flowTotalGb: unlimited ? "" : formatGb(flow.totalMB),
      flowPct: pct,
      flowUnlimited: unlimited,
      voiceUsedMin: Math.round(voice.usedMin),
      voiceTotalMin: Math.round(voice.totalMin),
      updatedAt: new Date().toISOString(),
    }
    saveUnicomData(data)
    return data
  } catch (e) {
    console.log("刷新中国联通数据异常:", e)
    return null
  }
}
