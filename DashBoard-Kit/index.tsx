import {
  Button,
  Circle,
  HStack,
  Image,
  List,
  Navigation,
  NavigationStack,
  RoundedRectangle,
  Script,
  Section,
  Spacer,
  Text,
  useEffect,
  VStack,
  Widget,
  ZStack,
} from "scripting"
import { BrandHeaderIcon } from "./cards"
import {
  ANTIGRAVITY_CACHE_KEY,
  ANTIGRAVITY_EXPIRES_KEY,
  ANTIGRAVITY_PROJECT_KEY,
  ANTIGRAVITY_REFRESH_KEY,
  ANTIGRAVITY_TOKEN_KEY,
  CODEX_ACCOUNT_ID_KEY,
  CODEX_CACHE_KEY,
  CODEX_EXPIRES_KEY,
  CODEX_REFRESH_KEY,
  CODEX_TOKEN_KEY,
  CPAMP_CACHE_KEY,
  CPAMP_ENDPOINT_KEY,
  CPAMP_KEY,
  DEEPSEEK_CACHE_KEY,
  DEEPSEEK_TOKEN_KEY,
  findDiscoveredDeepSeekToken,
  MEDIA_API_KEY,
  MEDIA_ENDPOINT_KEY,
  MEDIA_TYPE_KEY,
  VPN_CACHE_KEY,
  WB_API_KEY,
  WB_ENDPOINT_KEY,
  getMediaType,
  hasAntigravityConfigured,
  hasCodexConfigured,
  hasCpampConfigured,
  hasDeepSeekConfigured,
  hasMediaConfigured,
  hasWbConfigured,
  normalizeUrl,
  refreshAntigravityData,
  refreshCodexData,
  refreshCpampData,
  refreshDeepSeekData,
  refreshEmbyData,
  refreshMediaData,
  refreshVpnData,
  refreshWorkBuddyData,
} from "./data"
import {
  completeAntigravityOAuth,
  completeCodexOAuth,
  startAntigravityOAuth,
  startCodexOAuth,
} from "./oauth"
import { THEME, formatTime, remainColor } from "./theme"
import {
  CPAMP_LOGO_SVG,
  DEFAULT_ANTIGRAVITY,
  DEFAULT_CODEX,
  DEFAULT_WORKBUDDY,
  DEEPSEEK_WHALE_SVG,
  WIDGET_OPTIONS,
} from "./types"

// 引用系统标准全局 Dialog 对话框（Scripting 官方标准 API）
const gPrompt = (options: any) => Dialog.prompt(options)
const gAlert = (message: string) => Dialog.alert(message)
const gConfirm = (message: string) => Dialog.confirm(message)

const COLOR_SUCCESS = THEME.green
const COLOR_WARN = THEME.yellow
const BG_BOX = { light: "#F1F5F9", dark: "#1E293B" } as any

const C_TITLE = { light: "#111827", dark: "#F9FAFB" } as any
const C_SUBTITLE = { light: "#6B7280", dark: "#9CA3AF" } as any
const C_SECTION_HEADER = { light: "#4B5563", dark: "#9CA3AF" } as any

const PROMO_DISMISSED_KEY = "dashboard_kit_promo_dismissed"

export async function triggerPromo(force = false) {
  try {
    if (!force) {
      const dismissed = Storage.get<boolean>(PROMO_DISMISSED_KEY)
      if (dismissed) return
    }

    const res = await Dialog.actionSheet({
      title: "欢迎使用 DashBoard-Kit 👋",
      message:
        "感谢使用 DashBoard-Kit！\n如果这个项目对你有帮助，欢迎前往 GitHub 点点关注、点个 Star ⭐️ 支持一下作者！",
      actions: [
        { label: "⭐️ 前往 GitHub 支持作者" },
        { label: "不再提醒", destructive: true },
      ],
      cancelButton: true,
    })

    if (res === 0) {
      try {
        await Safari.openURL("https://github.com/SylvanRoe")
      } catch {}
    } else if (res === 1) {
      Storage.set(PROMO_DISMISSED_KEY, true)
    }
  } catch {}
}

function OptionBrandIcon({ id }: { id: string }) {
  if (id === "deepseek") {
    return <BrandHeaderIcon svgCode={DEEPSEEK_WHALE_SVG} size={20} />
  }
  if (id === "codex") {
    return <BrandHeaderIcon iconImage={DEFAULT_CODEX.iconImage} size={20} />
  }
  if (id === "antigravity") {
    return <BrandHeaderIcon iconImage={DEFAULT_ANTIGRAVITY.iconImage} size={20} />
  }
  if (id === "media") {
    return (
      <Image
        systemName="play.tv.fill"
        font={{ name: "system", size: 16 }}
        foregroundStyle="#38BDF8"
      />
    )
  }
  if (id === "workbuddy") {
    return (
      <Image
        image={DEFAULT_WORKBUDDY.wordmarkImage}
        resizable={true}
        frame={{ width: 30, height: Math.round(30 * (57 / 248)) }}
      />
    )
  }
  if (id === "cpamp") {
    return <BrandHeaderIcon svgCode={CPAMP_LOGO_SVG} size={20} />
  }
  if (id === "vpn") {
    return (
      <Image
        systemName="antenna.radiowaves.left.and.right"
        font={{ name: "system", size: 16 }}
        foregroundStyle="#10B981"
      />
    )
  }
  return (
    <Image
      systemName="square.grid.2x2.fill"
      font={{ name: "system", size: 16 }}
      foregroundStyle="#6B7280"
    />
  )
}

/** 引导录入 WorkBuddy 配置 */
async function configureWorkBuddy() {
  const currentUrl = Keychain.contains(WB_ENDPOINT_KEY)
    ? Keychain.get(WB_ENDPOINT_KEY) || ""
    : ""
  const currentKey = Keychain.contains(WB_API_KEY)
    ? Keychain.get(WB_API_KEY) || ""
    : ""

  const url = await gPrompt({
    title: "配置 WorkBuddy · 后台地址",
    message: "请输入 workbuddy2api-panel 服务地址\n例如 http://192.168.1.100:7863",
    defaultValue: currentUrl,
    placeholder: "http://192.168.1.100:7863",
    keyboardType: "URL",
    confirmLabel: "下一步",
    cancelLabel: "取消",
  })
  if (url === null) return

  const key = await gPrompt({
    title: "配置 WorkBuddy · API Key (密钥)",
    message: "请输入配置文件中的 api_key 密钥\n（若 config.json 中未设置 api_key 可直接留空跳过）",
    defaultValue: currentKey,
    placeholder: "api_key（选填，未设则留空）",
    obscureText: true,
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  })
  if (key === null) return

  if (!url.trim()) {
    await gAlert("后台服务地址不能为空")
    return
  }

  const cleanUrl = normalizeUrl(url.trim())
  Keychain.set(WB_ENDPOINT_KEY, cleanUrl, {
    accessibility: "first_unlock_this_device",
  })
  if (key.trim()) {
    Keychain.set(WB_API_KEY, key.trim(), {
      accessibility: "first_unlock_this_device",
    })
  } else {
    Keychain.remove(WB_API_KEY)
  }

  const res = await refreshWorkBuddyData()
  if (res) {
    Widget.reloadAll()
    await gAlert(
      `✓ 连接成功！\n\n剩余积分：${res.mainValue}\n已签到：${res.subValue1} · 已用：${res.subValue2}\n\n小组件与看板现已直接展示你的真实账号池数据！`
    )
  } else {
    await gAlert(
      "已保存配置，但首次连接测试未通过。\n请检查：\n1. 手机与后台是否在同一局域网（或已打通穿透）\n2. api_key 是否与 config.json 中的一致"
    )
  }
}

/** 清理 WorkBuddy 配置 */
async function clearWorkBuddyConfig() {
  const ok = await gConfirm("确定要清除本机保存的 WorkBuddy 后台配置吗？")
  if (!ok) return
  Keychain.remove(WB_ENDPOINT_KEY)
  Keychain.remove(WB_API_KEY)
  await gAlert("已清除配置，WorkBuddy 卡片已恢复为默认演示数据。")
}

/** 引导录入 MoviePilot / Emby 媒体库配置 */
async function configureMedia() {
  const currentType = getMediaType()
  const currentUrl = Keychain.contains(MEDIA_ENDPOINT_KEY)
    ? Keychain.get(MEDIA_ENDPOINT_KEY) || ""
    : ""
  const currentKey = Keychain.contains(MEDIA_API_KEY)
    ? Keychain.get(MEDIA_API_KEY) || ""
    : ""

  const actionIdx = await Dialog.actionSheet({
    title: "选择媒体服务类型",
    message: "Media Nexus 支持对接 MoviePilot 或 Emby/Jellyfin",
    cancelButton: true,
    actions: [
      { label: "MoviePilot（支持入库统计与转移记录）" },
      { label: "Emby / Jellyfin（媒体库统计）" },
    ],
  })
  if (actionIdx === null || actionIdx === undefined || actionIdx < 0) return

  const isMP = actionIdx === 0
  const chosenType = isMP ? "moviepilot" : "emby"

  const defaultUrl = currentUrl
  const defaultKey = currentKey

  const url = await gPrompt({
    title: isMP ? "配置 MoviePilot · 地址" : "配置 Emby · 地址",
    message: isMP
      ? "请输入 MoviePilot 服务器地址\n例如 http://192.168.1.100:3068"
      : "请输入 Emby / Jellyfin 服务器地址\n例如 http://192.168.1.100:8096",
    defaultValue: defaultUrl,
    placeholder: isMP ? "http://192.168.1.100:3068" : "http://192.168.1.100:8096",
    keyboardType: "URL",
    confirmLabel: "下一步",
    cancelLabel: "取消",
  })
  if (url === null) return

  const key = await gPrompt({
    title: isMP ? "配置 MoviePilot · API Key" : "配置 Emby · API Key",
    message: isMP
      ? "请输入 MoviePilot 的 API 密钥 (apikey)"
      : "请输入 Emby 生成的 API 密钥",
    defaultValue: defaultKey,
    placeholder: "API Key",
    obscureText: true,
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  })
  if (key === null) return

  if (!url.trim() || !key.trim()) {
    await gAlert("地址和 API Key 不能为空")
    return
  }

  const cleanUrl = normalizeUrl(url.trim())
  Keychain.set(MEDIA_TYPE_KEY, chosenType, {
    accessibility: "first_unlock_this_device",
  })
  Keychain.set(MEDIA_ENDPOINT_KEY, cleanUrl, {
    accessibility: "first_unlock_this_device",
  })
  Keychain.set(MEDIA_API_KEY, key.trim(), {
    accessibility: "first_unlock_this_device",
  })

  const res = await refreshMediaData()
  if (res) {
    Widget.reloadAll()
    await gAlert(
      `✓ 连接成功！\n\n来源：${res.title}\n电影：${res.movies.toLocaleString()} 部 · 剧集：${res.shows.toLocaleString()} 部\n分集：${res.episodes.toLocaleString()} 集\n\n小组件与看板现已直接展示你的真实媒体数据！`
    )
  } else {
    await gAlert(
      "已保存配置，但首次连接测试未通过。\n请检查：\n1. 手机与该地址是否处于同一局域网\n2. API Key 是否正确"
    )
  }
}

/** 清理媒体库配置 */
async function clearMediaConfig() {
  const ok = await gConfirm("确定要清除本机保存的 Media Nexus 媒体库配置吗？")
  if (!ok) return
  Keychain.remove(MEDIA_TYPE_KEY)
  Keychain.remove(MEDIA_ENDPOINT_KEY)
  Keychain.remove(MEDIA_API_KEY)
  await gAlert("已清除配置，媒体看板卡片已恢复为默认演示数据。")
}

/** 引导录入 DeepSeek 官方 User Token / API Key（支持一键导入已配置小组件） */
async function configureDeepSeek() {
  const discovered = findDiscoveredDeepSeekToken()

  // 如果在其他小组件（DeepSeek Usage / DeepSeek Panel）中找到了密钥，优先提示一键导入
  if (discovered) {
    const choice = await Dialog.actionSheet({
      title: "配置 DeepSeek",
      message: "检测到本机其他 DeepSeek 小组件中已有可用密钥/Token",
      actions: [
        { label: "⚡️ 直接一键导入并连接 (推荐)" },
        { label: "✍️ 手动输入其他 Token / API Key" },
      ],
    })
    if (choice === null) return

    if (choice === 0) {
      Keychain.set(DEEPSEEK_TOKEN_KEY, discovered, {
        accessibility: "first_unlock_this_device",
      })
      const res = await refreshDeepSeekData()
      if (res) {
        Widget.reloadAll()
        await gAlert(
          `✓ 一键导入并连接成功！\n\n当前总余额：${res.prefix}${res.mainValue}\n可用状态：${res.subValue1}\n来源：${res.footerLeft}\n\n小组件现已直接展示真实 DeepSeek 数据！`
        )
      } else {
        await gAlert("已导入密钥，但首次拉取失败，请检查网络或重新配置。")
      }
      return
    }
  }

  const currentToken = Keychain.contains(DEEPSEEK_TOKEN_KEY)
    ? Keychain.get(DEEPSEEK_TOKEN_KEY) || ""
    : discovered

  const token = await gPrompt({
    title: "配置 DeepSeek · Token / API Key",
    message: "请输入 DeepSeek 网页 User Token 或开放平台 API Key (sk-...)：",
    defaultValue: currentToken,
    placeholder: "sk-... 或 eyJhbGciOi...",
    obscureText: true,
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  })
  if (token === null) return

  if (!token.trim()) {
    await gAlert("Token 不能为空")
    return
  }

  Keychain.set(DEEPSEEK_TOKEN_KEY, token.trim(), {
    accessibility: "first_unlock_this_device",
  })

  const res = await refreshDeepSeekData()
  if (res) {
    Widget.reloadAll()
    await gAlert(
      `✓ 连接成功！\n\n当前总余额：${res.prefix}${res.mainValue}\n近 7 日消费：${res.subValue2}\n可用状态：${res.subValue1}\n\n小组件现已直接展示真实 DeepSeek 用量！`
    )
  } else {
    await gAlert(
      "已保存配置，但首次拉取数据失败。\n请确认：\n1. Token/Key 是否正确有效\n2. 网络是否能正常访问 DeepSeek 官方接口"
    )
  }
}

/** 清理 DeepSeek 配置 */
async function clearDeepSeekConfig() {
  const ok = await gConfirm("确定要清除本机保存的 DeepSeek 凭证吗？")
  if (!ok) return
  Keychain.remove(DEEPSEEK_TOKEN_KEY)
  Storage.remove(DEEPSEEK_CACHE_KEY, { shared: true })
  Storage.remove(DEEPSEEK_CACHE_KEY)
  await gAlert("已清除配置，DeepSeek 卡片已恢复为默认数据。")
}

/** 引导配置 Codex (支持官方网页 OAuth 授权 或 手动粘贴 Token) */
async function configureCodex() {
  const choice = await Dialog.actionSheet({
    title: "配置 Codex (ChatGPT)",
    message: "选择获取凭证的方式（网页授权支持 Token 自动续期）",
    actions: [
      { label: "🌐 网页授权" },
      { label: "🔑 手动粘贴 Access Token" },
    ],
  })
  if (choice === null) return

  if (choice === 0) {
    // 官方网页授权流程
    try {
      const authUrl = await startCodexOAuth()
      // 打开 Safari 进行授权
      try {
        await Safari.present(authUrl, true)
      } catch {
        await Safari.openURL(authUrl)
      }

      // 等待用户完成并粘贴回调 URL
      const callbackUrl = await gPrompt({
        title: "完成 Codex 授权",
        message: "在 Safari 登录并授权后，地址栏将跳转到 localhost:1455...\n请复制地址栏全部内容粘贴到下方：",
        placeholder: "http://localhost:1455/auth/callback?code=...",
        confirmLabel: "完成登录",
        cancelLabel: "取消",
      })
      if (!callbackUrl) return

      const accountLabel = await completeCodexOAuth(callbackUrl)
      const res = await refreshCodexData()
      if (res) {
        Widget.reloadAll()
        await gAlert(
          `✓ ${accountLabel} 连接成功！\n\n5 小时额度：${res.item1.pct}% (${res.item1.timer})\n周额度：${res.item2.pct}% (${res.item2.timer})\n可重置次数：${res.stat1.value}\n\n已成功获取凭证与自动刷新密钥，小组件已同步生效！`
        )
      } else {
        await gAlert("已完成登录换取凭证，但拉取用量失败，请检查网络或稍后重试。")
      }
    } catch (e: any) {
      await gAlert(`授权失败：${e?.message || e}`)
    }
    return
  }

  // 手动录入模式
  const currentToken = Keychain.contains(CODEX_TOKEN_KEY)
    ? Keychain.get(CODEX_TOKEN_KEY) || ""
    : ""
  const currentAccountId = Keychain.contains(CODEX_ACCOUNT_ID_KEY)
    ? Keychain.get(CODEX_ACCOUNT_ID_KEY) || ""
    : ""

  const token = await gPrompt({
    title: "配置 Codex · Access Token",
    message: "请输入 ChatGPT 的 Access Token (Bearer Token)\n可从浏览器控制台或抓包中获取",
    defaultValue: currentToken,
    placeholder: "ey...",
    obscureText: true,
    confirmLabel: "下一步",
    cancelLabel: "取消",
  })
  if (token === null) return

  const accountId = await gPrompt({
    title: "配置 Codex · ChatGPT-Account-Id",
    message: "若为 Team/Enterprise 账号请输入 Account ID，个人账号直接留空即可",
    defaultValue: currentAccountId,
    placeholder: "可选，个人账号留空",
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  })
  if (accountId === null) return

  if (!token.trim()) {
    await gAlert("Access Token 不能为空")
    return
  }

  Keychain.set(CODEX_TOKEN_KEY, token.trim(), {
    accessibility: "first_unlock_this_device",
  })
  if (accountId.trim()) {
    Keychain.set(CODEX_ACCOUNT_ID_KEY, accountId.trim(), {
      accessibility: "first_unlock_this_device",
    })
  } else {
    Keychain.remove(CODEX_ACCOUNT_ID_KEY)
  }

  const res = await refreshCodexData()
  if (res) {
    Widget.reloadAll()
    await gAlert(
      `✓ 连接成功！\n\n5 小时额度：${res.item1.pct}% (${res.item1.timer})\n周额度：${res.item2.pct}% (${res.item2.timer})\n可重置次数：${res.stat1.value}\n\n小组件现已直接展示真实 Codex 配额！`
    )
  } else {
    await gAlert(
      "已保存配置，但首次拉取配额未成功。\n请确认：\n1. Token 是否未过期\n2. 网络是否能正常访问 ChatGPT 后台"
    )
  }
}

/** 清理 Codex 配置 */
async function clearCodexConfig() {
  const ok = await gConfirm("确定要清除本机保存的 Codex 授权凭证吗？")
  if (!ok) return
  Keychain.remove(CODEX_TOKEN_KEY)
  Keychain.remove(CODEX_REFRESH_KEY)
  Keychain.remove(CODEX_EXPIRES_KEY)
  Keychain.remove(CODEX_ACCOUNT_ID_KEY)
  Storage.remove(CODEX_CACHE_KEY, { shared: true })
  Storage.remove(CODEX_CACHE_KEY)
  await gAlert("已清除配置，Codex 卡片已恢复为默认数据。")
}

/** 引导配置 Antigravity (支持官方网页 Google OAuth 授权 或 手动粘贴 Token) */
async function configureAntigravity() {
  const choice = await Dialog.actionSheet({
    title: "配置 Antigravity (Google)",
    message: "选择获取凭证的方式（网页授权支持 Token 自动续期）",
    actions: [
      { label: "🌐 网页授权" },
      { label: "🔑 手动粘贴 Access Token" },
    ],
  })
  if (choice === null) return

  if (choice === 0) {
    // 官方网页授权流程
    try {
      const authUrl = await startAntigravityOAuth()
      try {
        await Safari.present(authUrl, true)
      } catch {
        await Safari.openURL(authUrl)
      }

      const callbackUrl = await gPrompt({
        title: "完成 Antigravity 授权",
        message: "在 Google 完成登录并同意权限后，浏览器将跳转到 localhost:51121...\n请复制地址栏全部内容粘贴到下方：",
        placeholder: "http://localhost:51121/oauth-callback?code=...",
        confirmLabel: "完成登录",
        cancelLabel: "取消",
      })
      if (!callbackUrl) return

      const accountLabel = await completeAntigravityOAuth(callbackUrl)
      const res = await refreshAntigravityData()
      if (res) {
        Widget.reloadAll()
        await gAlert(
          `✓ ${accountLabel} 连接成功！\n\nGemini 5h：${res.item1.pct}% (${res.item1.timer})\nClaude/GPT 5h：${res.item2.pct}% (${res.item2.timer})\nGem 周：${res.stat1.value} · C/G 周：${res.stat2.value}\n\n已成功获取凭证与自动刷新密钥，小组件已同步生效！`
        )
      } else {
        await gAlert("已完成登录换取凭证，但拉取配额失败，请检查网络或稍后重试。")
      }
    } catch (e: any) {
      await gAlert(`授权失败：${e?.message || e}`)
    }
    return
  }

  // 手动录入模式
  const currentToken = Keychain.contains(ANTIGRAVITY_TOKEN_KEY)
    ? Keychain.get(ANTIGRAVITY_TOKEN_KEY) || ""
    : ""
  const currentProj = Keychain.contains(ANTIGRAVITY_PROJECT_KEY)
    ? Keychain.get(ANTIGRAVITY_PROJECT_KEY) || ""
    : ""

  const token = await gPrompt({
    title: "配置 Antigravity · OAuth Access Token",
    message: "请输入 Google Cloud Code 插件的 Access Token (Bearer Token)",
    defaultValue: currentToken,
    placeholder: "ya29....",
    obscureText: true,
    confirmLabel: "下一步",
    cancelLabel: "取消",
  })
  if (token === null) return

  const project = await gPrompt({
    title: "配置 Antigravity · Project ID (可选)",
    message: "若有指定 Google Cloud 项目 ID 可填入，默认留空即可",
    defaultValue: currentProj,
    placeholder: "可选，一般直接留空",
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  })
  if (project === null) return

  if (!token.trim()) {
    await gAlert("Access Token 不能为空")
    return
  }

  Keychain.set(ANTIGRAVITY_TOKEN_KEY, token.trim(), {
    accessibility: "first_unlock_this_device",
  })
  if (project.trim()) {
    Keychain.set(ANTIGRAVITY_PROJECT_KEY, project.trim(), {
      accessibility: "first_unlock_this_device",
    })
  } else {
    Keychain.remove(ANTIGRAVITY_PROJECT_KEY)
  }

  const res = await refreshAntigravityData()
  if (res) {
    Widget.reloadAll()
    await gAlert(
      `✓ 连接成功！\n\nGemini 5h：${res.item1.pct}% (${res.item1.timer})\nClaude/GPT 5h：${res.item2.pct}% (${res.item2.timer})\nGem 周：${res.stat1.value} · C/G 周：${res.stat2.value}\n\n小组件现已直接展示真实 Antigravity 配额！`
    )
  } else {
    await gAlert(
      "已保存配置，但首次拉取配额未成功。\n请确认：\n1. Token 是否包含 Cloud Code / Antigravity 权限\n2. 网络是否畅通"
    )
  }
}

/** 清理 Antigravity 配置 */
async function clearAntigravityConfig() {
  const ok = await gConfirm("确定要清除本机保存的 Antigravity 凭证吗？")
  if (!ok) return
  Keychain.remove(ANTIGRAVITY_TOKEN_KEY)
  Keychain.remove(ANTIGRAVITY_REFRESH_KEY)
  Keychain.remove(ANTIGRAVITY_EXPIRES_KEY)
  Keychain.remove(ANTIGRAVITY_PROJECT_KEY)
  Storage.remove(ANTIGRAVITY_CACHE_KEY, { shared: true })
  Storage.remove(ANTIGRAVITY_CACHE_KEY)
  await gAlert("已清除配置，Antigravity 卡片已恢复为默认数据。")
}

/** 引导配置 CPA-Manager-Plus (CPAMP) */
async function configureCpamp() {
  const currentEndpoint = Keychain.contains(CPAMP_ENDPOINT_KEY)
    ? Keychain.get(CPAMP_ENDPOINT_KEY) || ""
    : ""
  const currentKey = Keychain.contains(CPAMP_KEY)
    ? Keychain.get(CPAMP_KEY) || ""
    : ""

  const endpoint = await gPrompt({
    title: "配置 CPA-Manager-Plus · 服务地址",
    message: "请输入 CPAMP 服务地址\n例如 http://192.168.1.100:8317 或 https://cpamp.yourdomain.com",
    defaultValue: currentEndpoint,
    placeholder: "http://192.168.1.100:8317",
    keyboardType: "URL",
    confirmLabel: "下一步",
    cancelLabel: "取消",
  })
  if (endpoint === null) return

  const key = await gPrompt({
    title: "配置 CPA-Manager-Plus · 管理密钥",
    message: "请输入 Management Key (管理密钥)\n对应服务端的 ADMIN_KEY 或 MANAGEMENT_KEY\n（若未开启鉴权可直接留空跳过）",
    defaultValue: currentKey,
    placeholder: "Management Key（选填，未设则留空）",
    obscureText: true,
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  })
  if (key === null) return

  if (!endpoint.trim()) {
    await gAlert("服务地址不能为空")
    return
  }

  Keychain.set(CPAMP_ENDPOINT_KEY, endpoint.trim(), {
    accessibility: "first_unlock_this_device",
  })
  if (key.trim()) {
    Keychain.set(CPAMP_KEY, key.trim(), {
      accessibility: "first_unlock_this_device",
    })
  } else {
    Keychain.remove(CPAMP_KEY)
  }

  const res = await refreshCpampData()
  if (res) {
    Widget.reloadAll()
    await gAlert(
      `✓ 连接成功！\n\n今日调用：${res.mainValue} 次\n成功：${res.subValue1} · 失败：${res.subValue2}\n成功率：${res.progressPct}%\n消耗 Token：${res.footerLeft}\n消耗金额：${res.costStr || "—"}\n\n小组件现已直接展示真实 CPAMP 用量！`
    )
  } else {
    await gAlert(
      "已保存配置，但首次拉取数据失败。\n请确认：\n1. 服务地址与端口是否正确（默认 8317 端口）\n2. Management Key 是否匹配\n3. 手机与服务端网络是否连通"
    )
  }
}

/** 清理 CPAMP 配置 */
async function clearCpampConfig() {
  const ok = await gConfirm("确定要清除本机保存的 CPAMP 配置吗？")
  if (!ok) return
  Keychain.remove(CPAMP_ENDPOINT_KEY)
  Keychain.remove(CPAMP_KEY)
  Storage.remove(CPAMP_CACHE_KEY, { shared: true })
  Storage.remove(CPAMP_CACHE_KEY)
  await gAlert("已清除配置，CPAMP 卡片已恢复为默认数据。")
}

/** 一键重新检测当前 IP 与 VPN 节点状态 */
async function triggerVpnDetection() {
  const res = await refreshVpnData()
  if (res) {
    Widget.reloadAll()
    await gAlert(
      `✓ IP 检测完成！\n\n出口 IP：${res.ip}\n节点状态：${res.statusTitle}\n归属地：${res.location}\n运营商：${res.isp}\n风险指数：${res.riskPct}%\n网络属性：${res.tag1} · ${res.tag2}\n\n小组件已同步刷新最新节点！`
    )
  } else {
    await gAlert("网络连接超时或无法检测出口 IP，请检查手机网络后重试。")
  }
}

export default function ConfigView() {
  const dismiss = Navigation.useDismiss()
  const hasMedia = hasMediaConfigured()
  const mediaType = getMediaType()
  const hasWb = hasWbConfigured()
  const hasDeepSeek = hasDeepSeekConfigured()
  const hasCodex = hasCodexConfigured()
  const hasAntigravity = hasAntigravityConfigured()
  const hasCpamp = hasCpampConfigured()

  useEffect(() => {
    // 首次进入设置面板后 500ms 轻量触发
    const timer = setTimeout(() => {
      triggerPromo(false).catch(() => {})
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const mediaLabel = hasMedia
    ? `Media Nexus (${mediaType === "moviepilot" ? "MoviePilot" : "Emby"})`
    : "Media Nexus (影视媒体库)"

  return (
    <NavigationStack>
      <List
        navigationTitle="DashBoard-Kit"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          cancellationAction: (
            <Button
              title="完成"
              action={() => {
                dismiss()
              }}
            />
          ),
          confirmationAction: (
            <Button
              title="刷新桌面"
              action={async () => {
                try {
                  await Promise.all([
                    refreshWorkBuddyData().catch(() => null),
                    refreshEmbyData().catch(() => null),
                    refreshDeepSeekData().catch(() => null),
                    refreshCodexData().catch(() => null),
                    refreshAntigravityData().catch(() => null),
                    refreshCpampData().catch(() => null),
                    refreshVpnData().catch(() => null),
                  ])
                  Widget.reloadAll()
                  await gAlert("✓ 桌面小组件刷新指令已触发！\n已同步更新本机缓存并通知 iOS 桌面重新渲染。")
                } catch (e: any) {
                  await gAlert(`刷新异常：${e?.message || e}`)
                }
              }}
            />
          ),
        }}
      >
        {/* 数据源状态汇总 */}
        <Section header={<Text>数据源状态（真实数据优先）</Text>}>
          <HStack spacing={10} alignment="center">
            <Image
              systemName="circle.fill"
              font={{ name: "system", size: 8 }}
              foregroundStyle={hasWb ? "#10B981" : "#F59E0B"}
            />
            <Text font={14} fontWeight="medium">WorkBuddy (Panel)</Text>
            <Spacer />
            <Button
              title={hasWb ? "已配置 · 修改" : "去配置"}
              buttonStyle="bordered"
              controlSize="mini"
              action={async () => {
                await configureWorkBuddy()
              }}
            />
            {hasWb ? (
              <Button
                title="清除"
                role="destructive"
                buttonStyle="bordered"
                controlSize="mini"
                action={async () => {
                  await clearWorkBuddyConfig()
                }}
              />
            ) : null}
          </HStack>
          <HStack spacing={10} alignment="center">
            <Image
              systemName="circle.fill"
              font={{ name: "system", size: 8 }}
              foregroundStyle={hasDeepSeek ? "#10B981" : "#F59E0B"}
            />
            <Text font={14} fontWeight="medium">DeepSeek</Text>
            <Spacer />
            <Button
              title={hasDeepSeek ? "已配置 · 修改" : "去配置"}
              buttonStyle="bordered"
              controlSize="mini"
              action={async () => {
                await configureDeepSeek()
              }}
            />
            {hasDeepSeek ? (
              <Button
                title="清除"
                role="destructive"
                buttonStyle="bordered"
                controlSize="mini"
                action={async () => {
                  await clearDeepSeekConfig()
                }}
              />
            ) : null}
          </HStack>
          <HStack spacing={10} alignment="center">
            <Image
              systemName="circle.fill"
              font={{ name: "system", size: 8 }}
              foregroundStyle={hasCodex ? "#10B981" : "#F59E0B"}
            />
            <Text font={14} fontWeight="medium">Codex</Text>
            <Spacer />
            <Button
              title={hasCodex ? "已配置 · 修改" : "去配置"}
              buttonStyle="bordered"
              controlSize="mini"
              action={async () => {
                await configureCodex()
              }}
            />
            {hasCodex ? (
              <Button
                title="清除"
                role="destructive"
                buttonStyle="bordered"
                controlSize="mini"
                action={async () => {
                  await clearCodexConfig()
                }}
              />
            ) : null}
          </HStack>
          <HStack spacing={10} alignment="center">
            <Image
              systemName="circle.fill"
              font={{ name: "system", size: 8 }}
              foregroundStyle={hasAntigravity ? "#10B981" : "#F59E0B"}
            />
            <Text font={14} fontWeight="medium">Antigravity</Text>
            <Spacer />
            <Button
              title={hasAntigravity ? "已配置 · 修改" : "去配置"}
              buttonStyle="bordered"
              controlSize="mini"
              action={async () => {
                await configureAntigravity()
              }}
            />
            {hasAntigravity ? (
              <Button
                title="清除"
                role="destructive"
                buttonStyle="bordered"
                controlSize="mini"
                action={async () => {
                  await clearAntigravityConfig()
                }}
              />
            ) : null}
          </HStack>
          <HStack spacing={10} alignment="center">
            <Image
              systemName="circle.fill"
              font={{ name: "system", size: 8 }}
              foregroundStyle={hasMedia ? "#10B981" : "#F59E0B"}
            />
            <Text font={14} fontWeight="medium">{mediaLabel}</Text>
            <Spacer />
            <Button
              title={hasMedia ? "已配置 · 修改" : "去配置"}
              buttonStyle="bordered"
              controlSize="mini"
              action={async () => {
                await configureMedia()
              }}
            />
            {hasMedia ? (
              <Button
                title="清除"
                role="destructive"
                buttonStyle="bordered"
                controlSize="mini"
                action={async () => {
                  await clearMediaConfig()
                }}
              />
            ) : null}
          </HStack>
          <HStack spacing={10} alignment="center">
            <Image
              systemName="circle.fill"
              font={{ name: "system", size: 8 }}
              foregroundStyle={hasCpamp ? "#10B981" : "#F59E0B"}
            />
            <Text font={14} fontWeight="medium">CPA-Manager-Plus</Text>
            <Spacer />
            <Button
              title={hasCpamp ? "已配置 · 修改" : "去配置"}
              buttonStyle="bordered"
              controlSize="mini"
              action={async () => {
                await configureCpamp()
              }}
            />
            {hasCpamp ? (
              <Button
                title="清除"
                role="destructive"
                buttonStyle="bordered"
                controlSize="mini"
                action={async () => {
                  await clearCpampConfig()
                }}
              />
            ) : null}
          </HStack>
          <HStack spacing={10} alignment="center">
            <Image
              systemName="circle.fill"
              font={{ name: "system", size: 8 }}
              foregroundStyle="#10B981"
            />
            <Text font={14} fontWeight="medium">IP / 节点检测</Text>
            <Spacer />
            <Button
              title="立即检测"
              buttonStyle="bordered"
              controlSize="mini"
              action={async () => {
                await triggerVpnDetection()
              }}
            />
          </HStack>
          <HStack spacing={10} alignment="center" padding={{ top: 4 }}>
            <Image
              systemName="arrow.clockwise.circle.fill"
              font={{ name: "system", size: 16 }}
              foregroundStyle="#3B82F6"
            />
            <VStack alignment="leading" spacing={2}>
              <Text font={14} fontWeight="medium">强制刷新所有桌面小组件</Text>
              <Text font={11} foregroundStyle={C_SUBTITLE}>重新拉取所有在线凭证并触发 Widget 重新渲染</Text>
            </VStack>
            <Spacer />
            <Button
              title="立即刷新"
              buttonStyle="borderedProminent"
              controlSize="small"
              action={async () => {
                try {
                  await Promise.all([
                    refreshWorkBuddyData().catch(() => null),
                    refreshEmbyData().catch(() => null),
                    refreshDeepSeekData().catch(() => null),
                    refreshCodexData().catch(() => null),
                    refreshAntigravityData().catch(() => null),
                    refreshCpampData().catch(() => null),
                    refreshVpnData().catch(() => null),
                  ])
                  Widget.reloadAll()
                  await gAlert("✓ 桌面小组件已全部刷新！\n已更新全部数据源缓存并通知 iOS 桌面。")
                } catch (e: any) {
                  await gAlert(`刷新异常：${e?.message || e}`)
                }
              }}
            />
          </HStack>
        </Section>

        {/* 方案 A 使用说明 */}
        <Section header={<Text>桌面多组件配置说明（方案 A）</Text>}>
          <VStack alignment="leading" spacing={6} padding={{ top: 4, bottom: 4 }}>
            <Text font={14} fontWeight="semibold" foregroundStyle={C_SECTION_HEADER}>
              如何在桌面添加不同组件？
            </Text>
            <Text font={12} foregroundStyle={C_SUBTITLE}>
              1. 在手机桌面长按空白处 → 点击左上角「+」→ 找到「DashBoard-Kit」小组件。
            </Text>
            <Text font={12} foregroundStyle={C_SUBTITLE}>
              2. 长按已添加的小组件，点击「编辑小组件」。
            </Text>
            <Text font={12} foregroundStyle={C_SUBTITLE}>
              3. 在「参数 (Parameter)」一栏输入下方对应的组件 ID（例如 deepseek、workbuddy 或 media）即可切换。
            </Text>
          </VStack>
        </Section>

        {/* 各看板列表与预览入口 */}
        <Section header={<Text>支持的看板模版（点击即刻预览）</Text>}>
          {WIDGET_OPTIONS.map((opt) => (
            <HStack
              key={opt.id}
              spacing={12}
              padding={{ top: 6, bottom: 6 }}
              alignment="center"
            >
              <ZStack
                frame={{ width: 36, height: 36 }}
                alignment="center"
              >
                <RoundedRectangle
                  fill={BG_BOX}
                  cornerRadius={10}
                  frame={{ width: 36, height: 36 }}
                />
                <OptionBrandIcon id={opt.id} />
              </ZStack>

              <VStack alignment="leading" spacing={3}>
                <HStack spacing={6}>
                  <Text font={15} fontWeight="bold" foregroundStyle={C_TITLE}>
                    {opt.name}
                  </Text>
                  <Text
                    font={11}
                    fontWeight="medium"
                    foregroundStyle="#6366F1"
                  >
                    {`ID: ${opt.id}`}
                  </Text>
                </HStack>
                <Text font={12} foregroundStyle={C_SUBTITLE}>
                  {opt.desc}
                </Text>
              </VStack>
              <Spacer />
              <Button
                title="预览"
                buttonStyle="borderedProminent"
                controlSize="small"
                action={async () => {
                  const paramOptions = Object.fromEntries(
                    WIDGET_OPTIONS.map((o) => [o.name, o.id])
                  )
                  await Widget.preview({
                    family: opt.defaultFamily as any,
                    parameters: {
                      options: paramOptions,
                      default: opt.name,
                    },
                  })
                }}
              />
            </HStack>
          ))}
        </Section>

        {/* 开源与作者信息 */}
        <Section>
          <HStack spacing={10} alignment="center">
            <Image
              systemName="star.fill"
              font={{ name: "system", size: 14 }}
              foregroundStyle="#F59E0B"
            />
            <VStack alignment="leading" spacing={2}>
              <Text font={14} fontWeight="medium">开源主页 · GitHub</Text>
              <Text font={11} foregroundStyle={C_SUBTITLE}>关注作者 & 给项目点个 Star ⭐️</Text>
            </VStack>
            <Spacer />
            <Button
              title="去支持"
              buttonStyle="borderedProminent"
              controlSize="mini"
              action={async () => {
                try {
                  await Safari.openURL("https://github.com/SylvanRoe")
                } catch {}
              }}
            />
          </HStack>
        </Section>
      </List>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present(<ConfigView />)
  Script.exit()
}

run()
