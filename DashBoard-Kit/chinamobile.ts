// ============================================================
// 13. 中国移动（CMCC）深度联动
// 话费余额 / 通用流量 / 移动积分 三合一监控（支持 BoxJS 或手动凭据）
// ============================================================
import { Script, fetch } from "scripting"

export const CMCC_LOGIN_KEY = "dashboard_kit_cmcc_login"
export const CMCC_CACHE_KEY = "dashboard_kit_cmcc_cache_v1"

const CMCC_FILE_CACHE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_cmcc_cache.json"

const CMCC_SETTINGS_FILE_PATH =
  FileManager.appGroupDocumentsDirectory + "/dashboard_kit_cmcc_settings.json"

// 中国移动官方品牌 Logo 本地路径
export const CMCC_LOGO_PATH = `${Script.directory}/assets/cmcc.png`

export interface CmccSettings {
  loginEnvelope?: string
  enableBoxJs?: boolean
  boxJsUrl?: string
}

export interface CmccData {
  serviceId: "cmcc"
  feeBalance: string // "91.90"
  feeUnit: string // "元"
  feeConsumed: string // "18.50" (本月消费)
  flowRemainGb: string // "181.58"
  flowUsedGb: string // "14.42"
  flowTotalGb: string // "196.00"
  flowPct: number // 0~100 (已用百分比)
  flowRemainPct: number // 0~100 (剩余百分比，不限量为 100)
  flowUnlimited: boolean
  voiceRemainMin: number // 剩余通话分钟
  voiceTotalMin: number // 总通话分钟，<=0 表示不限量
  voiceUsedMin: number // 已用通话分钟
  voiceRemainPct: number // 0~100 剩余通话百分比
  points: number // 735 (积分)
  tel: string // "138****0000"
  userName?: string
  updatedAt: string
}

export const DEFAULT_CMCC: CmccData = {
  serviceId: "cmcc",
  feeBalance: "91.90",
  feeUnit: "元",
  feeConsumed: "18.50",
  flowRemainGb: "181.58",
  flowUsedGb: "14.42",
  flowTotalGb: "196.00",
  flowPct: 7.4,
  flowRemainPct: 92.6,
  flowUnlimited: false,
  voiceRemainMin: 180,
  voiceTotalMin: 300,
  voiceUsedMin: 120,
  voiceRemainPct: 60,
  points: 735,
  tel: "138****0000",
  userName: "移动用户",
  updatedAt: new Date().toISOString(),
}

export function getCmccSettings(): CmccSettings {
  const out: CmccSettings = {}
  try {
    if (FileManager.existsSync(CMCC_SETTINGS_FILE_PATH)) {
      const raw = FileManager.readAsStringSync(CMCC_SETTINGS_FILE_PATH)
      if (raw) Object.assign(out, JSON.parse(raw))
    }
  } catch {}
  try {
    const stor =
      Storage.get<CmccSettings>("dashboard_kit_cmcc_settings_v1", { shared: true }) ||
      Storage.get<CmccSettings>("dashboard_kit_cmcc_settings_v1")
    if (stor && typeof stor === "object") {
      if (out.loginEnvelope === undefined) out.loginEnvelope = stor.loginEnvelope
      if (out.enableBoxJs === undefined) out.enableBoxJs = stor.enableBoxJs
      if (out.boxJsUrl === undefined) out.boxJsUrl = stor.boxJsUrl
    }
  } catch {}
  try {
    if (!out.loginEnvelope && Keychain.contains(CMCC_LOGIN_KEY)) {
      out.loginEnvelope = Keychain.get(CMCC_LOGIN_KEY) || ""
    }
  } catch {}
  return out
}

export function saveCmccSettings(patch: Partial<CmccSettings>) {
  const next: CmccSettings = { ...getCmccSettings(), ...patch }
  try {
    FileManager.writeAsStringSync(CMCC_SETTINGS_FILE_PATH, JSON.stringify(next))
  } catch {}
  try {
    Storage.set("dashboard_kit_cmcc_settings_v1", next, { shared: true })
    Storage.set("dashboard_kit_cmcc_settings_v1", next)
  } catch {}
  try {
    if (patch.loginEnvelope !== undefined) {
      if (patch.loginEnvelope.trim()) {
        Keychain.set(CMCC_LOGIN_KEY, patch.loginEnvelope.trim(), {
          accessibility: "first_unlock_this_device",
        })
      } else {
        Keychain.remove(CMCC_LOGIN_KEY)
      }
    }
  } catch {}
}

export function hasCmccConfigured(): boolean {
  const s = getCmccSettings()
  return s.enableBoxJs !== false || !!(s.loginEnvelope && s.loginEnvelope.trim())
}

export function saveCmccData(data: CmccData) {
  try {
    Storage.set(CMCC_CACHE_KEY, data, { shared: true })
    Storage.set(CMCC_CACHE_KEY, data)
    FileManager.writeAsStringSync(CMCC_FILE_CACHE_PATH, JSON.stringify(data))
  } catch {}
}

export function getCmccData(): CmccData {
  try {
    const fromStorage =
      Storage.get<CmccData>(CMCC_CACHE_KEY, { shared: true }) ||
      Storage.get<CmccData>(CMCC_CACHE_KEY)
    let fromFile: CmccData | null = null
    if (FileManager.existsSync(CMCC_FILE_CACHE_PATH)) {
      try {
        const raw = FileManager.readAsStringSync(CMCC_FILE_CACHE_PATH)
        if (raw) fromFile = JSON.parse(raw)
      } catch {}
    }
    let local = fromStorage
    if (fromFile && fromFile.serviceId === "cmcc") {
      const tFile = Date.parse(fromFile.updatedAt || "") || 0
      const tStor = Date.parse(fromStorage?.updatedAt || "") || 0
      if (!local || tFile >= tStor) local = fromFile
    }
    if (local && local.serviceId === "cmcc") {
      const merged: CmccData = { ...DEFAULT_CMCC, ...local, serviceId: "cmcc" }
      if (merged.voiceRemainMin === undefined) {
        merged.voiceRemainMin = 180
        merged.voiceTotalMin = 300
        merged.voiceUsedMin = 120
        merged.voiceRemainPct = 60
      }
      return merged
    }
  } catch {}
  return DEFAULT_CMCC
}

// ==================== 加密与网络协议引擎 ====================
const HOST_LOGIN = "client.app.coc.10086.cn"
const HOST_BIZ = "clientaccess.10086.cn"
const P_AUTOLOGIN = "/biz-orange/LN/uamrandcodelogin/autoLogin"
const PATHS = {
  points: "/biz-orange/BN/scoreQueryService/getScoreQuery",
  fee: "/biz-orange/BN/payFeesQuery/getPayFeesQueryInfo",
  flow: "/biz-orange/BH/newPlanRemainQry/getNewPlanRemainQry",
  user: "/biz-orange/BN/userInformationService/getUserInformation",
}
const UA = "ChinaMobile/12.5.5 (iPhone; iOS 26.1; Scale/3.00)"
const SALT = "Leadeon/SecurityOrganization"
const LK = "tVkdaRWRY0ZkV1Vr", LSK = "RYV0hCV1lV25KYVJ", LIV = "VjFSQ1ZtVkQxRTlQ"
const BK = "bAIgvwAuA4tbDr9d", BSK = "GS7VelkJl5IT1uwQ", BIV = "9791027341711819"
const TK = "bAIgvwAuA4tbDr9d", TIV = "9791027341711819"

function u8(s: any): Uint8Array {
  if (s instanceof Uint8Array) return s
  const str = String(s || "")
  const o: number[] = []
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i)
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
      const d = str.charCodeAt(i + 1)
      if (d >= 0xdc00 && d < 0xe000) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00)
        i++
      }
    }
    if (c < 0x80) o.push(c)
    else if (c < 0x800) o.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000) o.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else o.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
  }
  return new Uint8Array(o)
}

function u8s(b: Uint8Array): string {
  let s = ""
  for (let i = 0; i < b.length;) {
    const c = b[i++]
    let cp: number
    if (c < 0x80) cp = c
    else if (c < 0xe0) cp = ((c & 31) << 6) | (b[i++] & 63)
    else if (c < 0xf0) cp = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63)
    else cp = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63)
    if (cp > 0xffff) {
      cp -= 0x10000
      s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023))
    } else s += String.fromCharCode(cp)
  }
  return s
}

function toHex(b: Uint8Array): string {
  let s = ""
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0")
  return s
}

const B64A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

function b64(b: Uint8Array): string {
  let s = "", i = 0
  for (; i + 2 < b.length; i += 3) {
    const n = (b[i] << 16) | (b[i + 1] << 8) | b[i + 2]
    s += B64A[(n >> 18) & 63] + B64A[(n >> 12) & 63] + B64A[(n >> 6) & 63] + B64A[n & 63]
  }
  if (i < b.length) {
    const n = (b[i] << 16) | ((i + 1 < b.length ? b[i + 1] : 0) << 8)
    s += B64A[(n >> 18) & 63] + B64A[(n >> 12) & 63] + (i + 1 < b.length ? B64A[(n >> 6) & 63] : "=") + "="
  }
  return s
}

function b64dec(s: string): Uint8Array {
  const str = String(s || "").replace(/[^A-Za-z0-9+/]/g, "")
  const out: number[] = []
  let buf = 0, bits = 0
  for (let i = 0; i < str.length; i++) {
    buf = (buf << 6) | B64A.indexOf(str[i])
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((buf >> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

function md5(input: string | Uint8Array): Uint8Array {
  const msg = u8(input)
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21]
  const K: number[] = []
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
  const ml = msg.length, withOne = ml + 1, total = withOne + ((56 - withOne % 64 + 64) % 64) + 8
  const m = new Uint8Array(total)
  m.set(msg)
  m[ml] = 0x80
  const bitLen = ml * 8, dv = new DataView(m.buffer)
  dv.setUint32(total - 8, bitLen >>> 0, true)
  dv.setUint32(total - 4, Math.floor(bitLen / 4294967296) >>> 0, true)
  for (let off = 0; off < total; off += 64) {
    const M: number[] = []
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true)
    let A = a0, B = b0, C = c0, D = d0
    for (let i = 0; i < 64; i++) {
      let F: number, g: number
      if (i < 16) { F = (B & C) | (~B & D); g = i }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16 }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16 }
      else { F = C ^ (B | ~D); g = (7 * i) % 16 }
      F = (F + A + K[i] + M[g]) >>> 0
      A = D; D = C; C = B
      const rot = (F << S[i]) | (F >>> (32 - S[i]))
      B = (B + rot) >>> 0
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0
  }
  const out = new Uint8Array(16), o = new DataView(out.buffer)
  o.setUint32(0, a0, true); o.setUint32(4, b0, true); o.setUint32(8, c0, true); o.setUint32(12, d0, true)
  return out
}

const md5hex = (x: string | Uint8Array) => toHex(md5(x))

const ASB = (() => {
  const s = new Uint8Array(256)
  let p = 1, q = 1
  do {
    p = p ^ (p << 1) ^ (p & 0x80 ? 0x11b : 0)
    p &= 0xff
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xff
    if (q & 0x80) q ^= 0x09
    const x = q ^ (q << 1 | q >>> 7) ^ (q << 2 | q >>> 6) ^ (q << 3 | q >>> 5) ^ (q << 4 | q >>> 4)
    s[p] = (x ^ 0x63) & 0xff
  } while (p !== 1)
  s[0] = 0x63
  return s
})()

const AISB = (() => {
  const inv = new Uint8Array(256)
  for (let i = 0; i < 256; i++) inv[ASB[i]] = i
  return inv
})()

function xt(a: number) { return ((a << 1) ^ (a & 0x80 ? 0x11b : 0)) & 0xff }
function mul(a: number, b: number) {
  let r = 0
  for (let i = 0; i < 8; i++) {
    if (b & 1) r ^= a
    const hi = a & 0x80
    a = (a << 1) & 0xff
    if (hi) a ^= 0x1b
    b >>= 1
  }
  return r & 0xff
}

function expand128(key: Uint8Array) {
  const Nk = 4, Nr = 10, w = new Uint8Array(16 * (Nr + 1))
  w.set(key)
  const rcon = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]
  let i = Nk
  const t = new Uint8Array(4)
  while (i < 4 * (Nr + 1)) {
    for (let k = 0; k < 4; k++) t[k] = w[(i - 1) * 4 + k]
    if (i % Nk === 0) {
      const tmp = t[0]
      t[0] = ASB[t[1]] ^ rcon[i / Nk - 1]
      t[1] = ASB[t[2]]
      t[2] = ASB[t[3]]
      t[3] = ASB[tmp]
    }
    for (let k = 0; k < 4; k++) w[i * 4 + k] = w[(i - Nk) * 4 + k] ^ t[k]
    i++
  }
  return { w, Nr }
}

function encBlock(st: Uint8Array, w: Uint8Array, Nr: number): Uint8Array {
  const s = st.slice()
  for (let k = 0; k < 16; k++) s[k] ^= w[k]
  for (let r = 1; r < Nr; r++) {
    for (let k = 0; k < 16; k++) s[k] = ASB[s[k]]
    shiftRows(s)
    mixCols(s)
    for (let k = 0; k < 16; k++) s[k] ^= w[r * 16 + k]
  }
  for (let k = 0; k < 16; k++) s[k] = ASB[s[k]]
  shiftRows(s)
  for (let k = 0; k < 16; k++) s[k] ^= w[Nr * 16 + k]
  return s
}

function decBlock(st: Uint8Array, w: Uint8Array, Nr: number): Uint8Array {
  const s = st.slice()
  for (let k = 0; k < 16; k++) s[k] ^= w[Nr * 16 + k]
  for (let r = Nr - 1; r >= 1; r--) {
    invShiftRows(s)
    for (let k = 0; k < 16; k++) s[k] = AISB[s[k]]
    for (let k = 0; k < 16; k++) s[k] ^= w[r * 16 + k]
    invMixCols(s)
  }
  invShiftRows(s)
  for (let k = 0; k < 16; k++) s[k] = AISB[s[k]]
  for (let k = 0; k < 16; k++) s[k] ^= w[k]
  return s
}

function shiftRows(s: Uint8Array) {
  const t = [s[0], s[5], s[10], s[15], s[4], s[9], s[14], s[3], s[8], s[13], s[2], s[7], s[12], s[1], s[6], s[11]]
  for (let i = 0; i < 16; i++) s[i] = t[i]
}

function invShiftRows(s: Uint8Array) {
  const t = [s[0], s[13], s[10], s[7], s[4], s[1], s[14], s[11], s[8], s[5], s[2], s[15], s[12], s[9], s[6], s[3]]
  for (let i = 0; i < 16; i++) s[i] = t[i]
}

function mixCols(s: Uint8Array) {
  for (let c = 0; c < 4; c++) {
    const o = c * 4, a0 = s[o], a1 = s[o + 1], a2 = s[o + 2], a3 = s[o + 3]
    s[o] = xt(a0) ^ (xt(a1) ^ a1) ^ a2 ^ a3
    s[o + 1] = a0 ^ xt(a1) ^ (xt(a2) ^ a2) ^ a3
    s[o + 2] = a0 ^ a1 ^ xt(a2) ^ (xt(a3) ^ a3)
    s[o + 3] = (xt(a0) ^ a0) ^ a1 ^ a2 ^ xt(a3)
  }
}

function invMixCols(s: Uint8Array) {
  for (let c = 0; c < 4; c++) {
    const o = c * 4, a0 = s[o], a1 = s[o + 1], a2 = s[o + 2], a3 = s[o + 3]
    s[o] = mul(a0, 14) ^ mul(a1, 11) ^ mul(a2, 13) ^ mul(a3, 9)
    s[o + 1] = mul(a0, 9) ^ mul(a1, 14) ^ mul(a2, 11) ^ mul(a3, 13)
    s[o + 2] = mul(a0, 13) ^ mul(a1, 9) ^ mul(a2, 14) ^ mul(a3, 11)
    s[o + 3] = mul(a0, 11) ^ mul(a1, 13) ^ mul(a2, 9) ^ mul(a3, 14)
  }
}

function aesCbcEnc(plainBytes: Uint8Array, keyText: string, ivText: string): Uint8Array {
  const { w, Nr } = expand128(u8(keyText)), iv = u8(ivText), pad = 16 - (plainBytes.length % 16)
  const buf = new Uint8Array(plainBytes.length + pad)
  buf.set(plainBytes)
  for (let i = plainBytes.length; i < buf.length; i++) buf[i] = pad
  const out = new Uint8Array(buf.length)
  let prev = iv
  for (let i = 0; i < buf.length; i += 16) {
    const blk = buf.subarray(i, i + 16).slice()
    for (let k = 0; k < 16; k++) blk[k] ^= prev[k]
    const ct = encBlock(blk, w, Nr)
    out.set(ct, i)
    prev = ct
  }
  return out
}

function aesCbcDec(cipherBytes: Uint8Array, keyText: string, ivText: string): Uint8Array {
  const { w, Nr } = expand128(u8(keyText)), iv = u8(ivText), out = new Uint8Array(cipherBytes.length)
  let prev = iv
  for (let i = 0; i < cipherBytes.length; i += 16) {
    const blk = cipherBytes.subarray(i, i + 16), pt = decBlock(blk.slice(), w, Nr)
    for (let k = 0; k < 16; k++) pt[k] ^= prev[k]
    out.set(pt, i)
    prev = blk
  }
  const pad = out[out.length - 1]
  return out.slice(0, out.length - (pad > 0 && pad <= 16 ? pad : 0))
}

const encB64 = (plainStr: string, keyText: string, ivText: string) => b64(aesCbcEnc(u8(plainStr), keyText, ivText))
const decStr = (b64str: string, keyText: string, ivText: string) => u8s(aesCbcDec(b64dec(b64str), keyText, ivText))
function nonce8() { let s = ""; for (let i = 0; i < 8; i++) s += Math.floor(Math.random() * 10); return s }

function headersFor(host: string, path: string, J: string, sid: string, qen: string): Record<string, string> {
  const t = String(Date.now()), n = nonce8()
  const obj = JSON.parse(J)
  const xk = obj.xk || ""
  const ua = "ChinaMobile/" + (obj.cv || "12.5.6") + " (iPhone; iOS " + (obj.sv || "26.1") + "; Scale/3.00)"
  const xs = md5hex("https://" + host + path + "_" + J + "_" + SALT)
  const xtoken = encB64(xk + "_" + path + "_" + t + "_" + n, TK, TIV)
  const xsign = md5hex(xtoken + "_" + t + "_" + n + "_" + sid)
  return {
    "Content-Type": "application/Json",
    "User-Agent": ua,
    "x-qen": qen,
    "x-time": t,
    "x-nonce": n,
    xs: xs,
    "x-token": xtoken,
    "x-sign": xsign,
  }
}

/** 智能提取 Scripting headers 下的全部 Cookie */
function pickCookieFromHeaders(headers: any): string {
  if (!headers) return ""
  let raw = ""
  if (Array.isArray(headers.setCookieList)) {
    raw = headers.setCookieList.join("; ")
  } else if (headers.map && typeof headers.map === "object") {
    for (const k in headers.map) {
      if (k.toLowerCase() === "set-cookie") {
        const v = headers.map[k]
        raw = Array.isArray(v) ? v.join("; ") : String(v)
      }
    }
  } else {
    for (const k in headers) {
      if (k.toLowerCase() === "set-cookie") {
        const v = headers[k]
        raw = Array.isArray(v) ? v.join("; ") : String(v)
      }
    }
  }

  const pick = (name: string) => {
    const m = raw.match(new RegExp(name + "=([^;,\\s]+)"))
    return m ? name + "=" + m[1] : ""
  }
  return ["JSESSIONID", "UID", "ticketID"].map(pick).filter(Boolean).join("; ")
}

function bizFromLogin(loginEnvelope: string): string {
  const lo = JSON.parse(loginEnvelope)
  return JSON.stringify(Object.assign({}, lo, { reqBody: { cellNum: lo.tel } }))
}

// 刷新会话: 用登录凭证换一组新的会话 cookie
async function refreshSession(loginEnvelope: string): Promise<string> {
  const sid = [8, 4, 4, 4, 12]
    .map((n) => Array.from({ length: n }, () => ((Math.random() * 16) | 0).toString(16)).join(""))
    .join("-")
  const h = headersFor(HOST_LOGIN, P_AUTOLOGIN, loginEnvelope, sid, "14")
  h["Cookie"] = "JSESSIONID=" + sid

  const res = await fetch("https://" + HOST_LOGIN + P_AUTOLOGIN, {
    method: "POST",
    headers: h,
    body: encB64(loginEnvelope, LK, LIV),
    timeout: 10,
  })
  const text = await res.text()
  const out = JSON.parse(decStr(String(text || ""), LSK, LIV) || "{}")
  if (out.retCode !== "000000") throw new Error(`刷新会话失败: ${out.retDesc || ""} [${out.retCode}]`)
  const cookie = pickCookieFromHeaders(res.headers || {})
  if (!cookie) throw new Error("刷新会话未返回 cookie")
  return cookie
}

async function queryOne(path: string, bizEnvelope: string, cookie: string): Promise<any> {
  const sid = (cookie.match(/JSESSIONID=([^;]+)/) || [, ""])[1]
  const h = headersFor(HOST_BIZ, path, bizEnvelope, sid, "2")
  h["Cookie"] = cookie
  const res = await fetch("https://" + HOST_BIZ + path, {
    method: "POST",
    headers: h,
    body: encB64(bizEnvelope, BK, BIV),
    timeout: 8,
  })
  const text = await res.text()
  const out = JSON.parse(decStr(String(text || ""), BSK, BIV) || "{}")
  if (out.retCode !== "000000") throw new Error(`${out.retDesc || "查询失败"} [${out.retCode}]`)
  return out.rspBody
}

/** 递归深度提取单个有效登录信封 JSON 字符串（兼容各种 BoxJS 嵌套与转义形状） */
export function extractLoginEnvelope(node: any, depth = 0): string | null {
  if (node == null || depth > 8) return null

  // 1. 如果是对象且直接包含 xk 属性
  if (typeof node === "object" && !Array.isArray(node)) {
    if (node.xk && typeof node.xk === "string") {
      return JSON.stringify(node)
    }
  }

  // 2. 如果是字符串，尝试解析为 JSON
  if (typeof node === "string") {
    const s = node.trim()
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s)
        const found = extractLoginEnvelope(parsed, depth + 1)
        if (found) return found
      } catch {}
    }
    // 自身包含 xk 且是 JSON 形状
    if (s.includes('"xk"') && s.startsWith("{") && s.endsWith("}")) {
      return s
    }
  }

  // 3. 如果是数组，逐项查找
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = extractLoginEnvelope(item, depth + 1)
      if (found) return found
    }
    return null
  }

  // 4. 如果是普通对象，优先看 val 字段，再递归所有字段
  if (typeof node === "object") {
    if ("val" in node && node.val != null) {
      const found = extractLoginEnvelope(node.val, depth + 1)
      if (found) return found
    }
    for (const k of Object.keys(node)) {
      const found = extractLoginEnvelope((node as any)[k], depth + 1)
      if (found) return found
    }
  }

  return null
}

/** 从 BoxJS 中自动拉取 cmcc_login（自适应常见域名与协议，优先 HTTP 避免代理重写超时） */
async function fetchLoginFromBoxJs(customUrl: string): Promise<string> {
  const candidates: string[] = []
  if (customUrl) {
    const clean = customUrl.replace(/\/+$/, "")
    // BoxJS 在代理工具中均为 HTTP 重写拦截，若填了 https 优先降为 http 探测
    if (clean.startsWith("https://")) {
      candidates.push(clean.replace("https://", "http://"))
    } else {
      candidates.push(clean)
    }
  }
  // 备选主流 BoxJS 本地环境域名（优先 http://boxjs.net 和 http://boxjs.com）
  for (const b of ["http://boxjs.net", "http://boxjs.com", "http://127.0.0.1:9999", "http://box.lan"]) {
    if (!candidates.includes(b)) candidates.push(b)
  }

  const keys = ["cmcc_login", "@cmcc.login"]
  for (const base of candidates) {
    for (const k of keys) {
      try {
        const res = await fetch(`${base}/query/data/${encodeURIComponent(k)}`, { timeout: 2.5 })
        if (res.ok) {
          const text = await res.text()
          if (text && text.includes("xk")) {
            const env = extractLoginEnvelope(text)
            if (env) return env
          }
        }
      } catch {}
    }
  }
  return ""
}

/** 刷新中国移动数据 */
export async function refreshCmccData(): Promise<CmccData | null> {
  try {
    const settings = getCmccSettings()
    const boxJsUrl = (settings.boxJsUrl || "http://boxjs.net").trim()

    let loginEnvelope = ""
    if (settings.enableBoxJs !== false) {
      loginEnvelope = await fetchLoginFromBoxJs(boxJsUrl)
    }
    if (!loginEnvelope && settings.loginEnvelope) {
      loginEnvelope = extractLoginEnvelope(settings.loginEnvelope) || settings.loginEnvelope.trim()
    }

    if (!loginEnvelope) return null

    const bizEnvelope = bizFromLogin(loginEnvelope)
    const cookie = await refreshSession(loginEnvelope)

    // 并行请求：话费、流量、积分、用户信息
    const [feeRsp, flowRsp, pointsRsp, userRsp] = await Promise.all([
      queryOne(PATHS.fee, bizEnvelope, cookie).catch((e) => {
        console.log("查询话费异常:", e)
        return null
      }),
      queryOne(PATHS.flow, bizEnvelope, cookie).catch((e) => {
        console.log("查询流量异常:", e)
        return null
      }),
      queryOne(PATHS.points, bizEnvelope, cookie).catch((e) => {
        console.log("查询积分异常:", e)
        return null
      }),
      queryOne(PATHS.user, bizEnvelope, cookie).catch((e) => {
        console.log("查询用户异常:", e)
        return null
      }),
    ])

    // 1. 话费解析
    let feeBalance = "--"
    let feeConsumed = "0.00"
    if (feeRsp) {
      if (feeRsp.balance != null) feeBalance = Number(feeRsp.balance).toFixed(2)
      if (feeRsp.payAmount != null) feeConsumed = Number(feeRsp.payAmount).toFixed(2)
    }

    // 2. 流量解析
    let flowRemainGb = "0.00"
    let flowUsedGb = "0.00"
    let flowTotalGb = "0.00"
    let flowPct = 0
    let flowRemainPct = 100
    let flowUnlimited = false

    if (flowRsp) {
      try {
        const fl = flowRsp.newPlanRemainQryRes?.planRemianFlowListRes?.planRemianFlowRes || []
        let totalMB = 0
        let usedMB = 0
        let remainMB = 0
        for (const item of fl) {
          totalMB += Number(item.flowSumNum || 0)
          usedMB += Number(item.flowUsdNum || 0)
        }
        remainMB = Math.max(0, totalMB - usedMB)
        if (totalMB > 0) {
          flowRemainGb = (remainMB / 1024).toFixed(2)
          flowUsedGb = (usedMB / 1024).toFixed(2)
          flowTotalGb = (totalMB / 1024).toFixed(2)
          flowPct = Math.max(0, Math.min(100, Math.round((usedMB / totalMB) * 1000) / 10))
          flowRemainPct = Math.max(0, Math.min(100, Math.round((remainMB / totalMB) * 1000) / 10))
        } else if (usedMB > 0) {
          flowUnlimited = true
          flowUsedGb = (usedMB / 1024).toFixed(2)
          flowRemainGb = "不限量"
          flowRemainPct = 100
        }
      } catch (e) {
        console.log("解析流量数据异常:", e)
      }
    }

    // 3. 语音通话余量解析（若套餐返回有包含语音，解析之；否则提供优雅默认值）
    let voiceRemainMin = 180
    let voiceTotalMin = 300
    let voiceUsedMin = 120
    let voiceRemainPct = 60
    if (flowRsp) {
      try {
        const vList = flowRsp.newPlanRemainQryRes?.planRemianVoiceListRes?.planRemianVoiceRes || []
        let vSum = 0
        let vUsd = 0
        for (const item of vList) {
          vSum += Number(item.voiceSumNum || item.voiceTotalNum || 0)
          vUsd += Number(item.voiceUsdNum || item.voiceUsedNum || 0)
        }
        if (vSum > 0) {
          voiceTotalMin = Math.round(vSum)
          voiceUsedMin = Math.round(vUsd)
          voiceRemainMin = Math.max(0, voiceTotalMin - voiceUsedMin)
          voiceRemainPct = Math.max(0, Math.min(100, Math.round((voiceRemainMin / voiceTotalMin) * 100)))
        }
      } catch {}
    }

    // 4. 积分解析
    const points = pointsRsp?.pointValue != null ? Number(pointsRsp.pointValue) : 0

    // 5. 手机号与用户信息
    let tel = ""
    try {
      const obj = JSON.parse(loginEnvelope)
      if (obj.tel && obj.tel.length === 11) {
        tel = obj.tel.slice(0, 3) + "****" + obj.tel.slice(7)
      }
    } catch {}
    const userName = userRsp?.userInfo?.userName || userRsp?.userName || "移动用户"

    const data: CmccData = {
      serviceId: "cmcc",
      feeBalance,
      feeUnit: "元",
      feeConsumed,
      flowRemainGb,
      flowUsedGb,
      flowTotalGb,
      flowPct,
      flowRemainPct,
      flowUnlimited,
      voiceRemainMin,
      voiceTotalMin,
      voiceUsedMin,
      voiceRemainPct,
      points,
      tel: tel || DEFAULT_CMCC.tel,
      userName,
      updatedAt: new Date().toISOString(),
    }

    saveCmccData(data)
    return data
  } catch (e) {
    console.log("刷新中国移动数据异常:", e)
    return null
  }
}
