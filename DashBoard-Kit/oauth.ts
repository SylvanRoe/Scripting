// ============================================================
// DashBoard-Kit 官方 OAuth 授权模块 (Codex & Antigravity)
// 完整集成 PKCE 与 Refresh Token 自动续期
// ============================================================

import { fetch, Response } from "scripting"
import {
  CODEX_ACCOUNT_ID_KEY,
  CODEX_CACHE_KEY,
  CODEX_EXPIRES_KEY,
  CODEX_REFRESH_KEY,
  CODEX_TOKEN_KEY,
  ANTIGRAVITY_CACHE_KEY,
  ANTIGRAVITY_EXPIRES_KEY,
  ANTIGRAVITY_PROJECT_KEY,
  ANTIGRAVITY_REFRESH_KEY,
  ANTIGRAVITY_TOKEN_KEY,
  refreshCodexData,
  refreshAntigravityData,
} from "./data"

// ── 基础辅助函数 ──

function base64Url(data: Data): string {
  return data
    .toBase64String()
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function randomUrlSafe(): string {
  return base64Url(Crypto.generateSymmetricKey(256))
}

function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomUrlSafe()
  const bytes = Data.fromRawString(verifier, "utf-8")
  if (!bytes) throw new Error("无法生成 PKCE 数据")
  return { verifier, challenge: base64Url(Crypto.sha256(bytes)) }
}

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null
  try {
    let raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    while (raw.length % 4) raw += "="
    const json = decodeURIComponent(
      Array.from(atob(raw))
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    )
    const obj = JSON.parse(json)
    return obj && typeof obj === "object" ? obj : null
  } catch {
    return null
  }
}

// ═════════════════════════════════════════════════════════════════
// 1. OpenAI / Codex OAuth
// ═════════════════════════════════════════════════════════════════

const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
const CODEX_AUTH_BASE = "https://auth.openai.com"
const CODEX_REDIRECT_URI = "http://localhost:1455/auth/callback"
const CODEX_SCOPE =
  "openid profile email offline_access api.connectors.read api.connectors.invoke"
const CODEX_PENDING_KEY = "dashboard_kit_codex_pending_oauth"

type CodexPending = {
  state: string
  verifier: string
  createdAt: number
}

export async function startCodexOAuth(): Promise<string> {
  const state = randomUrlSafe()
  const pkce = createPkce()
  const pending: CodexPending = {
    state,
    verifier: pkce.verifier,
    createdAt: Date.now(),
  }
  Keychain.set(CODEX_PENDING_KEY, JSON.stringify(pending), {
    accessibility: "first_unlock_this_device",
  })

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CODEX_CLIENT_ID,
    redirect_uri: CODEX_REDIRECT_URI,
    scope: CODEX_SCOPE,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
    state,
    originator: "codex_cli_rs",
  })
  const url = `${CODEX_AUTH_BASE}/oauth/authorize?${params.toString()}`
  return url
}

export async function completeCodexOAuth(callbackText: string): Promise<string> {
  let raw = callbackText.trim()
  if (!raw) throw new Error("请粘贴浏览器地址栏中的完整回调 URL")
  if (/^(localhost|127\.0\.0\.1):1455(?:\/|$)/i.test(raw)) {
    raw = `http://${raw}`
  }

  let callback: URL
  try {
    callback = new URL(raw)
  } catch {
    throw new Error("回调 URL 格式无效")
  }

  const isLocal =
    callback.hostname === "localhost" || callback.hostname === "127.0.0.1"
  if (
    callback.protocol !== "http:" ||
    !isLocal ||
    callback.port !== "1455" ||
    callback.pathname !== "/auth/callback"
  ) {
    throw new Error("不是预期的 localhost:1455/auth/callback 地址")
  }

  const pendingRaw = Keychain.get(CODEX_PENDING_KEY)
  if (!pendingRaw) throw new Error("未找到待完成的授权状态，请重新发起登录")
  const pending: CodexPending = JSON.parse(pendingRaw)

  if (Date.now() - pending.createdAt > 10 * 60_000) {
    Keychain.remove(CODEX_PENDING_KEY)
    throw new Error("授权会话已超过 10 分钟，请重新授权")
  }

  const err = callback.searchParams.get("error")
  if (err) {
    Keychain.remove(CODEX_PENDING_KEY)
    throw new Error(`OpenAI 拒绝授权：${callback.searchParams.get("error_description") || err}`)
  }

  const state = callback.searchParams.get("state")
  if (!state || state !== pending.state) {
    throw new Error("OAuth state 校验失败，请勿粘贴其他会话的回调")
  }

  const code = callback.searchParams.get("code")
  if (!code) throw new Error("回调地址中缺少 authorization code")

  // 用 code + verifier 换取 tokens
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: CODEX_REDIRECT_URI,
    client_id: CODEX_CLIENT_ID,
    code_verifier: pending.verifier,
  }).toString()

  const resp = await fetch(`${CODEX_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    timeout: 25,
  })

  const tokens: any = await resp.json().catch(() => null)
  if (!resp.ok || !tokens?.access_token) {
    throw new Error(`Token 交换失败（HTTP ${resp.status}），授权码可能已使用或过期`)
  }

  Keychain.remove(CODEX_PENDING_KEY)

  // 保存 Access Token、Refresh Token、Expires
  Keychain.set(CODEX_TOKEN_KEY, tokens.access_token, {
    accessibility: "first_unlock_this_device",
  })
  if (tokens.refresh_token) {
    Keychain.set(CODEX_REFRESH_KEY, tokens.refresh_token, {
      accessibility: "first_unlock_this_device",
    })
  }
  const expiresIn = typeof tokens.expires_in === "number" ? tokens.expires_in : 3600
  Keychain.set(CODEX_EXPIRES_KEY, String(Date.now() + expiresIn * 1000), {
    accessibility: "first_unlock_this_device",
  })

  // 解析并保存 accountId
  const idToken = tokens.id_token || tokens.access_token
  const payload = decodeJwtPayload(idToken)
  const authPayload = payload?.["https://api.openai.com/auth"] as any
  const accountId = payload?.chatgpt_account_id || authPayload?.chatgpt_account_id
  if (typeof accountId === "string" && accountId) {
    Keychain.set(CODEX_ACCOUNT_ID_KEY, accountId, {
      accessibility: "first_unlock_this_device",
    })
  }

  const email = (payload?.email || (payload?.["https://api.openai.com/profile"] as any)?.email) as string || ""
  return email ? `账号 ${email}` : "授权成功"
}

// ═════════════════════════════════════════════════════════════════
// 2. Google / Antigravity OAuth
// ═════════════════════════════════════════════════════════════════

const GOOGLE_CLIENT_ID =
  "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com"
const GOOGLE_CLIENT_SECRET = atob("R09DU1BYLUs1OEZXUjQ4NkxkTEoxbUxCOHNYQzR6NnFEQWY=")
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_REDIRECT_URI = "http://localhost:51121/oauth-callback"
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
]
const ANTIGRAVITY_PENDING_KEY = "dashboard_kit_antigravity_pending_oauth"

type AntigravityPending = {
  state: string
  createdAt: number
}

export async function startAntigravityOAuth(): Promise<string> {
  const state = randomUrlSafe()
  const pending: AntigravityPending = {
    state,
    createdAt: Date.now(),
  }
  Keychain.set(ANTIGRAVITY_PENDING_KEY, JSON.stringify(pending), {
    accessibility: "first_unlock_this_device",
  })

  const params = new URLSearchParams({
    access_type: "offline",
    client_id: GOOGLE_CLIENT_ID,
    prompt: "consent",
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function completeAntigravityOAuth(input: string): Promise<string> {
  let value = input.trim()
  if (!value) throw new Error("请粘贴浏览器地址栏中的完整 Google OAuth 回调地址")
  if (/^localhost:51121(?:\/|$)/i.test(value)) value = `http://${value}`

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("回调地址格式无效")
  }

  if (
    url.protocol !== "http:" ||
    url.hostname !== "localhost" ||
    url.port !== "51121" ||
    url.pathname !== "/oauth-callback"
  ) {
    throw new Error("不是预期的 localhost:51121/oauth-callback 地址")
  }

  const pendingRaw = Keychain.get(ANTIGRAVITY_PENDING_KEY)
  if (!pendingRaw) throw new Error("未找到待完成的授权状态，请重新发起登录")
  const pending: AntigravityPending = JSON.parse(pendingRaw)

  if (Date.now() - pending.createdAt > 10 * 60_000) {
    Keychain.remove(ANTIGRAVITY_PENDING_KEY)
    throw new Error("OAuth 会话已超过 10 分钟，请重新授权")
  }

  const err = url.searchParams.get("error")
  if (err) {
    Keychain.remove(ANTIGRAVITY_PENDING_KEY)
    throw new Error(`Google 拒绝授权：${url.searchParams.get("error_description") || err}`)
  }

  const state = url.searchParams.get("state")
  if (!state || state !== pending.state) {
    throw new Error("Google OAuth state 校验失败")
  }

  const code = url.searchParams.get("code")
  if (!code) throw new Error("回调地址中缺少 authorization code")

  // 换取 Access Token / Refresh Token
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }).toString(),
    timeout: 25,
  })

  const tokens: any = await resp.json().catch(() => null)
  if (!resp.ok || !tokens?.access_token) {
    throw new Error(`Antigravity Token 交换失败（HTTP ${resp.status}）`)
  }

  Keychain.remove(ANTIGRAVITY_PENDING_KEY)

  // 保存凭证
  Keychain.set(ANTIGRAVITY_TOKEN_KEY, tokens.access_token, {
    accessibility: "first_unlock_this_device",
  })
  if (tokens.refresh_token) {
    Keychain.set(ANTIGRAVITY_REFRESH_KEY, tokens.refresh_token, {
      accessibility: "first_unlock_this_device",
    })
  }
  const expiresIn = typeof tokens.expires_in === "number" ? tokens.expires_in : 3600
  Keychain.set(ANTIGRAVITY_EXPIRES_KEY, String(Date.now() + expiresIn * 1000), {
    accessibility: "first_unlock_this_device",
  })

  // 尝试获取用户信息
  let email = ""
  try {
    const userResp = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      timeout: 10,
    })
    if (userResp.ok) {
      const u: any = await userResp.json().catch(() => null)
      if (typeof u?.email === "string") email = u.email
    }
  } catch {}

  return email ? `账号 ${email}` : "授权成功"
}
