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
  FUEL_OIL_KEY,
  FUEL_PROVINCE_KEY,
  FUEL_PROVINCE_MAP,
  QB_CACHE_KEY,
  QB_PASS_KEY,
  QB_SID_KEY,
  QB_URL_KEY,
  QB_USER_KEY,
  VPN_CACHE_KEY,
  WB_API_KEY,
  WB_ENDPOINT_KEY,
  getMediaType,
  hasAntigravityConfigured,
  hasCodexConfigured,
  hasCpampConfigured,
  hasDeepSeekConfigured,
  hasMediaConfigured,
  hasQbConfigured,
  hasWbConfigured,
  normalizeUrl,
  refreshAntigravityData,
  refreshCodexData,
  refreshCpampData,
  refreshDeepSeekData,
  refreshEmbyData,
  refreshFuelData,
  refreshMediaData,
  refreshQbittorrentData,
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
const gActionSheet = async (title: string, options: string[]) => {
  const actions = options.filter((o) => o !== "取消").map((o) => ({ label: o }))
  const idx = await Dialog.actionSheet({
    title,
    actions,
    cancelButton: true,
  })
  if (idx === -1 || idx === undefined || idx === null || idx >= actions.length) return "取消"
  return actions[idx].label
}

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
  if (id === "fuel") {
    return (
      <Image
        systemName="fuelpump.fill"
        font={{ name: "system", size: 16 }}
        foregroundStyle="#F59E0B"
      />
    )
  }
  if (id === "qbittorrent") {
    const qbImg = (globalThis as any).UIImage?.fromFile(
      `${FileManager.documentsDirectory}/scripts/DashBoard-Kit/assets/qbittorrent.png`
    )
    if (qbImg) {
      return (
        <Image
          image={qbImg}
          resizable={true}
          frame={{ width: 18, height: 18 }}
          clipShape={{ type: "rect", cornerRadius: 4 }}
        />
      )
    }
    return (
      <Image
        systemName="arrow.down.circle.fill"
        font={{ name: "system", size: 16 }}
        foregroundStyle="#2563EB"
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
  const hasConfig = hasCodexConfigured()
  const actions = hasConfig
    ? [
        { label: "⚡️ 重新测试并拉取最新用量" },
        { label: "🌐 重新进行网页授权" },
        { label: "🔑 手动粘贴 Access Token" },
      ]
    : [
        { label: "🌐 网页授权" },
        { label: "🔑 手动粘贴 Access Token" },
      ]

  const choice = await Dialog.actionSheet({
    title: "配置 Codex (ChatGPT)",
    message: "选择获取凭证的方式（网页授权支持 Token 自动续期）",
    actions,
  })
  if (choice === null) return

  if (hasConfig && choice === 0) {
    const res = await refreshCodexData()
    if (res) {
      Widget.reloadAll()
      await gAlert(
        `✓ 用量更新成功！\n\n5 小时额度：${res.item1.pct}% (${res.item1.timer})\n周额度：${res.item2.pct}% (${res.item2.timer})\n可重置次数：${res.stat1.value}\n\n小组件已同步生效！`
      )
    } else {
      await gAlert("未能拉取到最新用量。\n请确认当前网络/VPN 节点是否在 OpenAI 支持的可用地区。")
    }
    return
  }

  const selectedWebAuth = (!hasConfig && choice === 0) || (hasConfig && choice === 1)

  if (selectedWebAuth) {
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
  const hasConfig = hasAntigravityConfigured()
  const actions = hasConfig
    ? [
        { label: "⚡️ 重新测试并拉取最新配额" },
        { label: "🌐 重新进行网页授权" },
        { label: "🔑 手动粘贴 Access Token" },
      ]
    : [
        { label: "🌐 网页授权" },
        { label: "🔑 手动粘贴 Access Token" },
      ]

  const choice = await Dialog.actionSheet({
    title: "配置 Antigravity (Google)",
    message: "选择获取凭证的方式（网页授权支持 Token 自动续期）",
    actions,
  })
  if (choice === null) return

  // 如果已有配置且选择了第一个选项：立即重新拉取
  if (hasConfig && choice === 0) {
    const res = await refreshAntigravityData()
    if (res) {
      Widget.reloadAll()
      await gAlert(
        `✓ 配额更新成功！\n\nGemini 5h：${res.item1.pct}% (${res.item1.timer})\nClaude/GPT 5h：${res.item2.pct}% (${res.item2.timer})\nGem 周：${res.stat1.value} · C/G 周：${res.stat2.value}\n\n小组件已同步刷新！`
      )
    } else {
      await gAlert("未能拉取到最新配额。\n请检查当前设备是否已连接代理/VPN 并能正常访问 Google 接口。")
    }
    return
  }

  const selectedWebAuth = (!hasConfig && choice === 0) || (hasConfig && choice === 1)

  if (selectedWebAuth) {
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

/** 配置今日油价监测省份与主力关注油品 */
async function configureFuelSettings() {
  const currentProv =
    Storage.get<string>(FUEL_PROVINCE_KEY, { shared: true }) ||
    Storage.get<string>(FUEL_PROVINCE_KEY) ||
    "北京"
  const currentOil =
    Storage.get<string>(FUEL_OIL_KEY, { shared: true }) ||
    Storage.get<string>(FUEL_OIL_KEY) ||
    "oil92"

  const provList = Object.keys(FUEL_PROVINCE_MAP)
  const selectedProv = await gActionSheet("请选择油价监测省份", [
    ...provList.map((p) => (p === currentProv ? `${p} (当前)` : p)),
    "取消",
  ])
  if (!selectedProv || selectedProv === "取消") return

  const cleanProv = selectedProv.replace(" (当前)", "").trim()

  const oilOptions = [
    { label: "92# 汽油", key: "oil92" },
    { label: "95# 汽油", key: "oil95" },
    { label: "98# 汽油", key: "oil98" },
    { label: "0# 柴油", key: "oil0" },
  ]
  const selectedOilLabel = await gActionSheet("请选择主力关注油品（小号组件高光展示）", [
    ...oilOptions.map((o) => (o.key === currentOil ? `${o.label} (当前)` : o.label)),
    "取消",
  ])
  if (!selectedOilLabel || selectedOilLabel === "取消") return

  const cleanOilKey =
    oilOptions.find((o) => selectedOilLabel.startsWith(o.label))?.key || "oil92"

  Storage.set(FUEL_PROVINCE_KEY, cleanProv, { shared: true })
  Storage.set(FUEL_PROVINCE_KEY, cleanProv)
  Storage.set(FUEL_OIL_KEY, cleanOilKey, { shared: true })
  Storage.set(FUEL_OIL_KEY, cleanOilKey)

  // 同时也写入独立脚本使用的 fuel_price_settings.json，实现双向兼容
  try {
    const fuelSettingsPath = `${FileManager.appGroupDocumentsDirectory}/fuel_price_settings.json`
    let s: any = {}
    if (FileManager.existsSync(fuelSettingsPath)) {
      try {
        s = JSON.parse(FileManager.readAsStringSync(fuelSettingsPath))
      } catch {}
    }
    s.selectedProvince = cleanProv
    s.focusOil = cleanOilKey
    FileManager.writeAsStringSync(fuelSettingsPath, JSON.stringify(s))
  } catch {}

  const res = await refreshFuelData()
  if (res) {
    Widget.reloadAll()
    await gAlert(
      `✓ 今日油价配置成功！\n\n省份：${res.province}\n主力油品：${res.oilFullName} (现价 ¥${res.focusPrice})\n预测：${res.smallTrend}\n\n桌面小组件已同步刷新最新油价！`
    )
  } else {
    await gAlert("已保存设置，但拉取油价数据超时，请检查网络后重试。")
  }
}

/** 引导配置 qBittorrent 服务地址与账号密码 */
async function configureQbittorrent() {
  const currentUrl = Keychain.contains(QB_URL_KEY)
    ? Keychain.get(QB_URL_KEY) || ""
    : ""
  const currentUser = Keychain.contains(QB_USER_KEY)
    ? Keychain.get(QB_USER_KEY) || ""
    : ""
  const currentPass = Keychain.contains(QB_PASS_KEY)
    ? Keychain.get(QB_PASS_KEY) || ""
    : ""

  const url = await gPrompt({
    title: "配置 qBittorrent · 服务地址",
    message: "请输入 qBittorrent WebUI 地址（如 http://192.168.1.100:8080 或 https://qb.domain.com）",
    defaultValue: currentUrl,
    placeholder: "http://192.168.1.100:8080",
    keyboardType: "URL",
    confirmLabel: "下一步",
    cancelLabel: "取消",
  })
  if (url === null) return

  if (!url.trim()) {
    await gAlert("服务地址不能为空")
    return
  }

  const user = await gPrompt({
    title: "配置 qBittorrent · 用户名",
    message: "请输入 WebUI 用户名（默认通常为 admin，若免密请留空）",
    defaultValue: currentUser || "admin",
    placeholder: "admin",
    confirmLabel: "下一步",
    cancelLabel: "取消",
  })
  if (user === null) return

  const pass = await gPrompt({
    title: "配置 qBittorrent · 密码",
    message: "请输入 WebUI 密码（若免密请留空）",
    defaultValue: currentPass,
    placeholder: "密码（若免密请留空）",
    obscureText: true,
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  })
  if (pass === null) return

  Keychain.set(QB_URL_KEY, url.trim(), {
    accessibility: "first_unlock_this_device",
  })
  Keychain.set(QB_USER_KEY, user.trim(), {
    accessibility: "first_unlock_this_device",
  })
  Keychain.set(QB_PASS_KEY, pass.trim(), {
    accessibility: "first_unlock_this_device",
  })

  // 清除旧会话 Cookie，促使重新鉴权
  Storage.remove(QB_SID_KEY, { shared: true })
  Storage.remove(QB_SID_KEY)

  const res = await refreshQbittorrentData()
  if (res) {
    Widget.reloadAll()
    await gAlert(
      `✓ 连接成功！\n\n状态：${res.statusText}\n下载速度：${res.dlSpeed}\n上传速度：${res.upSpeed}\n活跃任务：${res.activeCount} 个 · 做种：${res.seedingCount} 个\n磁盘余量：${res.freeSpace}\n\n小组件现已直接展示真实 qBittorrent 数据！`
    )
  } else {
    await gAlert(
      "已保存配置，但首次连接失败。\n请确认：\n1. WebUI 地址与端口是否正确\n2. 账号密码是否正确\n3. 手机与 qBittorrent 是否处于相同网络（或已连接 VPN）"
    )
  }
}

/** 清理 qBittorrent 配置 */
async function clearQbittorrentConfig() {
  const ok = await gConfirm("确定要清除本机保存的 qBittorrent 配置吗？")
  if (!ok) return
  Keychain.remove(QB_URL_KEY)
  Keychain.remove(QB_USER_KEY)
  Keychain.remove(QB_PASS_KEY)
  Storage.remove(QB_SID_KEY, { shared: true })
  Storage.remove(QB_SID_KEY)
  Storage.remove(QB_CACHE_KEY, { shared: true })
  Storage.remove(QB_CACHE_KEY)
  await gAlert("已清除配置，qBittorrent 卡片已恢复为默认数据。")
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
  const hasQb = hasQbConfigured()

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
          confirmationAction: (
            <Button
              title="保存"
              action={() => {
                Widget.reloadAll()
                dismiss()
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
              foregroundStyle={hasQb ? "#10B981" : "#F59E0B"}
            />
            <Text font={14} fontWeight="medium">qBittorrent (下载器)</Text>
            <Spacer />
            <Button
              title={hasQb ? "已配置 · 修改" : "去配置"}
              buttonStyle="bordered"
              controlSize="mini"
              action={async () => {
                await configureQbittorrent()
              }}
            />
            {hasQb ? (
              <Button
                title="清除"
                role="destructive"
                buttonStyle="bordered"
                controlSize="mini"
                action={async () => {
                  await clearQbittorrentConfig()
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
          <HStack spacing={10} alignment="center">
            <Image
              systemName="circle.fill"
              font={{ name: "system", size: 8 }}
              foregroundStyle="#10B981"
            />
            <Text font={14} fontWeight="medium">今日油价 (省份/油品)</Text>
            <Spacer />
            <Button
              title="设置省份"
              buttonStyle="bordered"
              controlSize="mini"
              action={async () => {
                await configureFuelSettings()
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
                  const tasks: Promise<any>[] = []
                  if (hasWb) tasks.push(refreshWorkBuddyData().catch((e) => console.log("wb err:", e)))
                  if (hasMedia) tasks.push(refreshEmbyData().catch((e) => console.log("media err:", e)))
                  if (hasDeepSeek) tasks.push(refreshDeepSeekData().catch((e) => console.log("ds err:", e)))
                  if (hasCodex) tasks.push(refreshCodexData().catch((e) => console.log("codex err:", e)))
                  if (hasAntigravity) tasks.push(refreshAntigravityData().catch((e) => console.log("ag err:", e)))
                  if (hasCpamp) tasks.push(refreshCpampData().catch((e) => console.log("cpamp err:", e)))
                  if (hasQb) tasks.push(refreshQbittorrentData().catch((e) => console.log("qb err:", e)))
                  tasks.push(refreshVpnData().catch((e) => console.log("vpn err:", e)))
                  tasks.push(refreshFuelData().catch((e) => console.log("fuel err:", e)))

                  await Promise.all(tasks)
                  Widget.reloadAll()
                  await gAlert("✓ 桌面小组件刷新完成！\n已同步更新数据源缓存并通知 iOS 桌面重新渲染。")
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
                  // 针对带账号的在线看板，在启动预览前触发一次数据准备
                  if (opt.id === "antigravity") {
                    await refreshAntigravityData().catch(() => null)
                  } else if (opt.id === "codex") {
                    await refreshCodexData().catch(() => null)
                  } else if (opt.id === "deepseek") {
                    await refreshDeepSeekData().catch(() => null)
                  } else if (opt.id === "workbuddy") {
                    await refreshWorkBuddyData().catch(() => null)
                  } else if (opt.id === "cpamp") {
                    await refreshCpampData().catch(() => null)
                  } else if (opt.id === "vpn") {
                    await refreshVpnData().catch(() => null)
                  } else if (opt.id === "fuel") {
                    await refreshFuelData().catch(() => null)
                  } else if (opt.id === "qbittorrent") {
                    await refreshQbittorrentData().catch(() => null)
                  } else if (opt.id === "media") {
                    await refreshMediaData().catch(() => null)
                  }

                  // 保存当前预览卡片 ID 供预览渲染时优先读取
                  try {
                    Storage.set("dashboard_kit_preview_active_id", opt.id, { shared: true })
                    Storage.set("dashboard_kit_preview_active_id", opt.id)
                    FileManager.writeAsStringSync(
                      FileManager.appGroupDocumentsDirectory + "/dashboard_kit_preview_active.txt",
                      opt.id
                    )
                  } catch {}

                  let previewFamily = opt.defaultFamily as any
                  if (opt.id === "fuel") {
                    const chosen = await gActionSheet("请选择油价小组件预览尺寸", [
                      "小号组件 (Shell 贝壳高光)",
                      "中号组件 (4联卡片极简行情)",
                      "取消",
                    ])
                    if (!chosen || chosen === "取消") return
                    previewFamily = chosen.includes("中号") ? "systemMedium" : "systemSmall"
                  } else if (opt.id === "qbittorrent") {
                    const chosen = await gActionSheet("请选择 qBittorrent 预览尺寸", [
                      "小号组件 (实时速率与任务)",
                      "中号组件 (全面传输与磁盘监控)",
                      "取消",
                    ])
                    if (!chosen || chosen === "取消") return
                    previewFamily = chosen.includes("中号") ? "systemMedium" : "systemSmall"
                  }

                  await Widget.preview({
                    family: previewFamily,
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
