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
  useState,
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
  MAGPIE_ENDPOINT_KEY,
  MAGPIE_KEY,
  MAGPIE_QUOTA_PATH_KEY,
  MAGPIE_CACHE_KEY,
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
  LOON_BRIDGE_URL_KEY,
  LOON_CACHE_KEY,
  LOON_PLUGIN_GUIDE_TEXT,
  LOON_POLICIES_KEY,
  LOON_POLICY_OVERRIDES_KEY,
  LOON_SUB_NAME_KEY,
  LOON_SUB_URL_KEY,
  QB_CACHE_KEY,
  QB_PASS_KEY,
  QB_SID_KEY,
  QB_URL_KEY,
  QB_USER_KEY,
  QX_BRIDGE_URL_KEY,
  QX_CACHE_KEY,
  QX_POLICIES_KEY,
  QX_REWRITE_GUIDE_TEXT,
  QX_SUB_NAME_KEY,
  QX_SUB_URL_KEY,
  VPN_CACHE_KEY,
  WB_API_KEY,
  WB_ENDPOINT_KEY,
  getMediaType,
  getLoonData,
  getQxData,
  getQxSettings,
  hasAntigravityConfigured,
  hasCodexConfigured,
  hasCpampConfigured,
  hasMagpieConfigured,
  hasDeepSeekConfigured,
  hasLoonConfigured,
  hasMediaConfigured,
  hasQbConfigured,
  hasQxConfigured,
  hasWbConfigured,
  normalizeUrl,
  refreshAntigravityData,
  refreshCodexData,
  refreshCpampData,
  refreshMagpieData,
  parseMagpieInput,
  refreshDeepSeekData,
  refreshEmbyData,
  refreshFuelData,
  refreshLoonData,
  refreshMediaData,
  refreshQbittorrentData,
  refreshQxData,
  refreshUnicomData,
  refreshVpnData,
  refreshWorkBuddyData,
  saveQxSettings,
  switchLoonPolicyNode,
  switchLoonRunningMode,
  switchQxPolicyNode,
  switchQxRunningMode,
  getUnicomData,
  getUnicomSettings,
  hasUnicomConfigured,
  saveUnicomSettings,
  getCmccData,
  getCmccSettings,
  hasCmccConfigured,
  refreshCmccData,
  saveCmccSettings,
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
  LOON_LOGO_IMAGE,
  QB_LOGO_IMAGE,
  QX_LOGO_IMAGE,
  UNICOM_LOGO_IMAGE,
  CMCC_LOGO_IMAGE,
  WIDGET_OPTIONS,
  WORKBUDDY_ICON_IMAGE,
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

// ── cancel-safe prompt：取消/空串一律视为取消，避免点取消还进入下一步 ──
// required=true：空串=取消；required=false：空串保留为""（选填跳过）
async function promptSafe(opts: any, required = true): Promise<string | null> {
  const v = await Dialog.prompt(opts)
  if (v === null || v === undefined) return null
  if (required && String(v).trim() === "") return null
  return String(v)
}

// ── 已启用组件列表：只显示用户添加的组件；移除只删列表、保留 Keychain 凭据 ──
const ENABLED_KEY = "dashboard_kit_enabled_services"
export function getEnabledServices(): string[] {
  try {
    const raw = Storage.get<string[]>(ENABLED_KEY, { shared: true }) || Storage.get<string[]>(ENABLED_KEY)
    return Array.isArray(raw) ? raw.filter(Boolean) : []
  } catch { return [] }
}
export function saveEnabledServices(ids: string[]) {
  try {
    const uniq = Array.from(new Set(ids.filter(Boolean)))
    Storage.set(ENABLED_KEY, uniq, { shared: true })
    Storage.set(ENABLED_KEY, uniq)
  } catch {}
}
// 旧用户迁移：已配置过的组件自动视为已启用（只迁移一次）
const ENABLED_MIGRATED_KEY = "dashboard_kit_enabled_migrated"
function migrateEnabledServices(configured: string[]) {
  try {
    if (Storage.get<boolean>(ENABLED_MIGRATED_KEY, { shared: true })) return
    const merged = Array.from(new Set([...getEnabledServices(), ...configured]))
    saveEnabledServices(merged)
    Storage.set(ENABLED_MIGRATED_KEY, true, { shared: true })
    Storage.set(ENABLED_MIGRATED_KEY, true)
  } catch {}
}

// 添加页分组（分组列表，避免平铺过大）
const WIDGET_GROUPS: { title: string; ids: string[] }[] = [
  { title: "代理 / 网络", ids: ["qx", "qx_traffic", "loon", "loon_traffic", "vpn"] },
  { title: "AI 服务", ids: ["deepseek", "codex", "antigravity", "workbuddy", "cpamp", "magpie"] },
  { title: "运营商", ids: ["cmcc", "unicom"] },
  { title: "媒体 / 下载", ids: ["media", "qbittorrent"] },
  { title: "生活", ids: ["fuel"] },
]

// 组件显示名 / 配置函数 / 预览刷新函数 映射
const OPT_BY_ID: Record<string, any> = Object.fromEntries(WIDGET_OPTIONS.map(o => [o.id, o]))
const CONFIGURE_FN: Record<string, () => Promise<void>> = {
  qx: configureQuantumultX, qx_traffic: configureQuantumultX, loon: configureLoon,
  loon_traffic: configureLoon, cmcc: configureCmcc, unicom: configureUnicom,
  workbuddy: configureWorkBuddy, deepseek: configureDeepSeek, codex: configureCodex,
  antigravity: configureAntigravity, media: configureMedia, cpamp: configureCpamp,
  magpie: configureMagpie, qbittorrent: configureQbittorrent, fuel: configureFuelSettings,
  vpn: async () => { await triggerVpnDetection() },
}
// 预览前按需刷新某个组件数据
async function preparePreview(id: string) {
  const jobs: Record<string, () => Promise<any>> = {
    antigravity: refreshAntigravityData, codex: refreshCodexData, deepseek: refreshDeepSeekData,
    workbuddy: refreshWorkBuddyData, cpamp: refreshCpampData, magpie: refreshMagpieData,
    vpn: refreshVpnData, fuel: refreshFuelData, qbittorrent: refreshQbittorrentData,
    loon: refreshLoonData, loon_traffic: refreshLoonData, cmcc: refreshCmccData,
    unicom: refreshUnicomData, qx: refreshQxData, qx_traffic: refreshQxData, media: refreshMediaData,
  }
  if (jobs[id]) await jobs[id]().catch(() => null)
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
    return <BrandHeaderIcon iconImage={WORKBUDDY_ICON_IMAGE} size={22} />
  }
  if (id === "cpamp") {
    return <BrandHeaderIcon svgCode={CPAMP_LOGO_SVG} size={20} />
  }
  if (id === "magpie") {
    return (
      <Image
        systemName="bird.fill"
        font={{ name: "system", size: 16 }}
        foregroundStyle="#8B5CF6"
      />
    )
  }
  if (id === "qx" || id === "qx_traffic") {
    return <BrandHeaderIcon iconImage={QX_LOGO_IMAGE} size={20} />
  }
  if (id === "loon" || id === "loon_traffic") {
    return <BrandHeaderIcon iconImage={LOON_LOGO_IMAGE} size={20} />
  }
  if (id === "cmcc") {
    return <BrandHeaderIcon iconImage={CMCC_LOGO_IMAGE} size={20} />
  }
  if (id === "unicom") {
    return <BrandHeaderIcon iconImage={UNICOM_LOGO_IMAGE} size={20} />
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
    return <BrandHeaderIcon iconImage={QB_LOGO_IMAGE} size={20} />
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

  const url = await promptSafe({
    title: "配置 WorkBuddy · 后台地址",
    message: "请输入 workbuddy2api-panel 服务地址\n例如 http://192.168.1.100:7863",
    defaultValue: currentUrl,
    placeholder: "http://192.168.1.100:7863",
    keyboardType: "URL",
    confirmLabel: "下一步",
    cancelLabel: "取消",
  }, true)
  if (url === null) return

  const key = await promptSafe({
    title: "配置 WorkBuddy · API Key (密钥)",
    message: "请输入配置文件中的 api_key 密钥\n（若 config.json 中未设置 api_key 可直接留空跳过）",
    defaultValue: currentKey,
    placeholder: "api_key（选填，未设则留空）",
    obscureText: true,
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  }, false)
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

  const url = await promptSafe({
    title: isMP ? "配置 MoviePilot · 地址" : "配置 Emby · 地址",
    message: isMP
      ? "请输入 MoviePilot 服务器地址\n例如 http://192.168.1.100:3068"
      : "请输入 Emby / Jellyfin 服务器地址\n例如 http://192.168.1.100:8096",
    defaultValue: defaultUrl,
    placeholder: isMP ? "http://192.168.1.100:3068" : "http://192.168.1.100:8096",
    keyboardType: "URL",
    confirmLabel: "下一步",
    cancelLabel: "取消",
  }, true)
  if (url === null) return

  const key = await promptSafe({
    title: isMP ? "配置 MoviePilot · API Key" : "配置 Emby · API Key",
    message: isMP
      ? "请输入 MoviePilot 的 API 密钥 (apikey)"
      : "请输入 Emby 生成的 API 密钥",
    defaultValue: defaultKey,
    placeholder: "API Key",
    obscureText: true,
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  }, true)
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

  const token = await promptSafe({
    title: "配置 DeepSeek · Token / API Key",
    message: "请输入 DeepSeek 网页 User Token 或开放平台 API Key (sk-...)：",
    defaultValue: currentToken,
    placeholder: "sk-... 或 eyJhbGciOi...",
    obscureText: true,
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  }, true)
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
      const callbackUrl = await promptSafe({
        title: "完成 Codex 授权",
        message: "在 Safari 登录并授权后，地址栏将跳转到 localhost:1455...\n请复制地址栏全部内容粘贴到下方：",
        placeholder: "http://localhost:1455/auth/callback?code=...",
        confirmLabel: "完成登录",
        cancelLabel: "取消",
      }, true)
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

  const token = await promptSafe({
    title: "配置 Codex · Access Token",
    message: "请输入 ChatGPT 的 Access Token (Bearer Token)\n可从浏览器控制台或抓包中获取",
    defaultValue: currentToken,
    placeholder: "ey...",
    obscureText: true,
    confirmLabel: "下一步",
    cancelLabel: "取消",
  }, true)
  if (token === null) return

  const accountId = await promptSafe({
    title: "配置 Codex · ChatGPT-Account-Id",
    message: "若为 Team/Enterprise 账号请输入 Account ID，个人账号直接留空即可",
    defaultValue: currentAccountId,
    placeholder: "可选，个人账号留空",
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  }, true)
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

      const callbackUrl = await promptSafe({
        title: "完成 Antigravity 授权",
        message: "在 Google 完成登录并同意权限后，浏览器将跳转到 localhost:51121...\n请复制地址栏全部内容粘贴到下方：",
        placeholder: "http://localhost:51121/oauth-callback?code=...",
        confirmLabel: "完成登录",
        cancelLabel: "取消",
      }, true)
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

  const token = await promptSafe({
    title: "配置 Antigravity · OAuth Access Token",
    message: "请输入 Google Cloud Code 插件的 Access Token (Bearer Token)",
    defaultValue: currentToken,
    placeholder: "ya29....",
    obscureText: true,
    confirmLabel: "下一步",
    cancelLabel: "取消",
  }, true)
  if (token === null) return

  const project = await promptSafe({
    title: "配置 Antigravity · Project ID (可选)",
    message: "若有指定 Google Cloud 项目 ID 可填入，默认留空即可",
    defaultValue: currentProj,
    placeholder: "可选，一般直接留空",
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  }, false)
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

  const endpoint = await promptSafe({
    title: "配置 CPA-Manager-Plus · 服务地址",
    message: "请输入 CPAMP 服务地址\n例如 http://192.168.1.100:8317 或 https://cpamp.yourdomain.com",
    defaultValue: currentEndpoint,
    placeholder: "http://192.168.1.100:8317",
    keyboardType: "URL",
    confirmLabel: "下一步",
    cancelLabel: "取消",
  }, true)
  if (endpoint === null) return

  const key = await promptSafe({
    title: "配置 CPA-Manager-Plus · 管理密钥",
    message: "请输入 Management Key (管理密钥)\n对应服务端的 ADMIN_KEY 或 MANAGEMENT_KEY\n（若未开启鉴权可直接留空跳过）",
    defaultValue: currentKey,
    placeholder: "Management Key（选填，未设则留空）",
    obscureText: true,
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  }, false)
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

/** 配置 Magpie —— 一个框粘贴管理台链接即可，地址与密钥自动识别 */
async function configureMagpie() {
  const curEndpoint = Keychain.contains(MAGPIE_ENDPOINT_KEY) ? Keychain.get(MAGPIE_ENDPOINT_KEY) || "" : ""
  const curKey = Keychain.contains(MAGPIE_KEY) ? Keychain.get(MAGPIE_KEY) || "" : ""
  const curExample = curEndpoint ? `${curEndpoint}${curKey ? `/?k=${curKey}` : ""}` : ""

  const raw = await promptSafe({
    title: "Magpie · 一步配置",
    message: "粘贴管理台链接即可，例如：\nhttp://host:3430/?k=你的密钥\n\n地址和密钥会自动识别（也支持 API 地址 + 单独密钥）。",
    defaultValue: curExample,
    placeholder: "http://host:3430/?k=xxx",
    keyboardType: "URL",
    confirmLabel: "保存并连接",
    cancelLabel: "取消",
  }, true)
  if (raw === null) return
  if (!raw.trim()) {
    await gAlert("链接不能为空")
    return
  }

  const parsed = parseMagpieInput(raw)
  if (!parsed.endpoint) {
    await gAlert("没能识别出地址，请检查链接格式")
    return
  }

  // 若链接里没带密钥，且已有旧密钥则保留；否则留空
  const finalKey = parsed.apiKey || curKey || ""
  Keychain.set(MAGPIE_ENDPOINT_KEY, parsed.endpoint, { accessibility: "first_unlock_this_device" })
  if (finalKey) {
    Keychain.set(MAGPIE_KEY, finalKey, { accessibility: "first_unlock_this_device" })
  } else {
    Keychain.remove(MAGPIE_KEY)
  }
  Keychain.remove(MAGPIE_QUOTA_PATH_KEY)

  const refreshStartedAt = Date.now()
  const res = await refreshMagpieData()
  const refreshedAt = Date.parse(res?.updatedAt || "") || 0
  const realSuccess = !!res && res.statusText === "在线" && res.mainValue !== "--" && refreshedAt >= refreshStartedAt - 1000
  if (realSuccess) {
    Widget.reloadAll()
    await gAlert(
      `✓ 连接成功！\n\n${res.mainLabel}：${res.mainValue}\n${res.subLabel1}：${res.subValue1}\n${res.subLabel2}：${res.subValue2}\n\n小组件现已展示今日真实用量。`
    )
  } else {
    Widget.reloadAll()
    await gAlert("配置已保存，但尚未读取到今日用量。\n请点小组件右上角刷新；若仍无数据，请确认管理台链接中的 k 值有效。")
  }
}

/** 清理 Magpie 配置 */
async function clearMagpieConfig() {
  const ok = await gConfirm("确定要清除本机保存的 Magpie 配置吗？")
  if (!ok) return
  Keychain.remove(MAGPIE_ENDPOINT_KEY)
  Keychain.remove(MAGPIE_KEY)
  Keychain.remove(MAGPIE_QUOTA_PATH_KEY)
  Storage.remove(MAGPIE_CACHE_KEY, { shared: true })
  Storage.remove(MAGPIE_CACHE_KEY)
  await gAlert("已清除配置，Magpie 卡片已恢复为默认数据。")
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

  const url = await promptSafe({
    title: "配置 qBittorrent · 服务地址",
    message: "请输入 qBittorrent WebUI 地址（如 http://192.168.1.100:8080 或 https://qb.domain.com）",
    defaultValue: currentUrl,
    placeholder: "http://192.168.1.100:8080",
    keyboardType: "URL",
    confirmLabel: "下一步",
    cancelLabel: "取消",
  }, true)
  if (url === null) return

  if (!url.trim()) {
    await gAlert("服务地址不能为空")
    return
  }

  const user = await promptSafe({
    title: "配置 qBittorrent · 用户名",
    message: "请输入 WebUI 用户名（默认通常为 admin，若免密请留空）",
    defaultValue: currentUser || "admin",
    placeholder: "admin",
    confirmLabel: "下一步",
    cancelLabel: "取消",
  }, true)
  if (user === null) return

  const pass = await promptSafe({
    title: "配置 qBittorrent · 密码",
    message: "请输入 WebUI 密码（若免密请留空）",
    defaultValue: currentPass,
    placeholder: "密码（若免密请留空）",
    obscureText: true,
    confirmLabel: "保存并测试连接",
    cancelLabel: "取消",
  }, true)
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

/** 引导配置 Quantumult X（方案三：Rewrite 本地桥接 + 机场订阅流量 + 桌面交互测试） */
async function configureQuantumultX() {
  const currentData = getQxData()
  const choice = await Dialog.actionSheet({
    title: "配置 Quantumult X (方案三联动)",
    message: `当前运行模式：${currentData.runningModeLabel} · 剩余流量：${currentData.remainGb}`,
    cancelButton: true,
    actions: [
      { label: "📋 一键复制 QX 本地重写规则与桥接脚本" },
      { label: "🔗 配置机场订阅链接 (获取真实流量/到期)" },
      { label: "🎛 自定义卡片展示的 4 个策略组" },
      { label: "🔄 立即切换运行模式 (分流/全局/直连)" },
      { label: "🎯 立即测试切换策略组节点" },
      { label: "⚡️ 立即同步状态并刷新小组件" },
    ],
  })
  if (choice === null || choice === undefined || choice < 0) return

  if (choice === 0) {
    try {
      await Pasteboard.setString(
        "https://raw.githubusercontent.com/SylvanRoe/Scripting/refs/heads/main/DashBoard-Kit/qx_dashboard.conf"
      )
    } catch {}
    await gAlert(
      "✓ 远程重写订阅链接已复制到剪贴板！\n\n直接打开 Quantumult X →「重写 (Rewrite)」→「引用」，粘贴添加该远程链接并启用即可，无需手动新建本地 JS 脚本！"
    )
    return
  }

  if (choice === 1) {
    const curSub = getQxSettings().subUrl || ""
    const subUrl = await promptSafe({
      title: "配置 Quantumult X · 机场订阅地址",
      message: "请输入机场订阅链接（用于解析响应头 subscription-userinfo 中的真实剩余流量与到期时间）：",
      defaultValue: curSub,
      placeholder: "https://sub.example.com/api/v1/client/subscribe?token=...",
      keyboardType: "URL",
      confirmLabel: "保存并同步",
      cancelLabel: "取消",
    }, true)
    if (subUrl === null) return

    saveQxSettings({ subUrl: subUrl.trim() })

    const res = await refreshQxData()
    Widget.reloadAll()
    if (res) {
      await gAlert(
        `✓ 订阅配置已更新！\n\n剩余流量：${res.remainGb} (${res.remainPct}%)\n已用/总计：${res.usedGb} / ${res.totalGb}\n周期状态：${res.expireText}\n\n桌面小组件已同步生效！`
      )
    }
    return
  }

  if (choice === 2) {
    const curCustom = getQxSettings().customPolicies || ""
    const defaultStr = curCustom || (currentData.policies || []).map((p) => p.id).join(", ")
    const input = await promptSafe({
      title: "自定义展示的 4 个策略组",
      message:
        "请输入你在圈X中的策略组名称（最多 4 个，用逗号分隔，支持模糊匹配如：proxy, 哔哩哔哩, 国际媒体, 苹果服务；留空则恢复默认排序）：",
      defaultValue: defaultStr,
      placeholder: "proxy, 全球加速, 国际媒体, 苹果服务",
      confirmLabel: "保存并同步",
      cancelLabel: "取消",
    }, true)
    if (input === null) return
    saveQxSettings({ customPolicies: input.trim() })
    const res = await refreshQxData()
    Widget.reloadAll()
    if (res) {
      await gAlert(
        `✓ 已更新展示策略组：\n${res.policies.map((p) => `• ${p.label}（${p.selected}）`).join("\n")}`
      )
    }
    return
  }

  if (choice === 3) {
    const next = await switchQxRunningMode()
    Widget.reloadAll()
    await gAlert(`✓ 已切换运行模式为：【${next.runningModeLabel}】\n桌面小组件已同步更新！`)
    return
  }

  if (choice === 4) {
    const policies = currentData.policies || []
    const pIdx = await Dialog.actionSheet({
      title: "选择要切换节点的策略组",
      message: "在桌面小组件上直接点击对应策略组卡片也可实现同样效果",
      cancelButton: true,
      actions: policies.map((p) => ({ label: `${p.label}（当前：${p.selected}）` })),
    })
    if (pIdx === null || pIdx === undefined || pIdx < 0 || pIdx >= policies.length) return
    const targetP = policies[pIdx]
    const updated = await switchQxPolicyNode(targetP.id)
    Widget.reloadAll()
    const afterP = updated.policies.find((x) => x.id === targetP.id)
    await gAlert(
      `✓ 策略组【${targetP.label}】已切换节点：\n${targetP.selected}  ➔  ${afterP?.selected}\n\n桌面小组件已同步更新！`
    )
    return
  }

  if (choice === 5) {
    const res = await refreshQxData()
    Widget.reloadAll()
    if (res) {
      await gAlert(
        `✓ Quantumult X 状态已同步！\n\n运行模式：${res.runningModeLabel}\n当前出口：${res.outboundTag} (${res.latencyMs})\n剩余流量：${res.remainGb} (${res.remainPct}%)\n主力节点：${res.policies[0]?.selected || "--"}`
      )
    }
  }
}

/** 引导配置 Loon（OpenAPI 本地桥接 + 机场订阅流量 + 桌面交互测试）*/
async function configureLoon() {
  const currentData = getLoonData()
  const choice = await Dialog.actionSheet({
    title: "配置 Loon (桌面交互联动)",
    message: `当前运行模式：${currentData.runningModeLabel} · 剩余流量：${currentData.remainGb}\n桥接状态：${currentData.bridgeConnected ? "已连接" : "未连接"}`,
    cancelButton: true,
    actions: [
      { label: "📋 一键复制 Loon 插件与桥接脚本地址" },
      { label: "🔗 配置机场订阅链接 (获取真实流量/到期)" },
      { label: "🎛 自定义卡片展示的 4 个策略组" },
      { label: "🔄 立即切换运行模式 (分流/全局代理/直连)" },
      { label: "🎯 立即测试切换策略组节点" },
      { label: "⚡️ 立即同步状态并刷新小组件" },
    ],
  })
  if (choice === null || choice === undefined || choice < 0) return

  if (choice === 0) {
    const pluginUrl =
      "https://raw.githubusercontent.com/SylvanRoe/Scripting/refs/heads/main/DashBoard-Kit/loon_dashboard.plugin"
    try {
      await Pasteboard.setString(pluginUrl)
    } catch {}
    await gAlert(
      `✓ 远程插件链接已复制到剪贴板！\n\n${pluginUrl}\n\n直接打开 Loon →「插件 (Plugin)」→ 右上角 ➕ → 添加插件，粘贴该远程链接并启用即可。\n\n【重要】桥接地址支持 1.1.1.1/loon-bridge 与 cp.cloudflare.com/loon-bridge，无需担心假域名解析失败。`
    )
    return
  }

  if (choice === 1) {
    const curSub = Keychain.contains(LOON_SUB_URL_KEY) ? Keychain.get(LOON_SUB_URL_KEY) || "" : ""
    const subUrl = await promptSafe({
      title: "配置 Loon · 机场订阅地址",
      message: "请输入机场订阅链接（用于解析响应头 subscription-userinfo 中的真实剩余流量与到期时间）：",
      defaultValue: curSub,
      placeholder: "https://sub.example.com/api/v1/client/subscribe?token=...",
      keyboardType: "URL",
      confirmLabel: "保存并同步",
      cancelLabel: "取消",
    }, true)
    if (subUrl === null) return

    if (subUrl.trim()) {
      Keychain.set(LOON_SUB_URL_KEY, subUrl.trim(), {
        accessibility: "first_unlock_this_device",
      })
    } else {
      Keychain.remove(LOON_SUB_URL_KEY)
    }

    const res = await refreshLoonData()
    Widget.reloadAll()
    if (res) {
      await gAlert(
        `✓ 订阅配置已更新！\n\n剩余流量：${res.remainGb} (${res.remainPct}%)\n已用/总计：${res.usedGb} / ${res.totalGb}\n周期状态：${res.expireText}\n\n桌面小组件已同步生效！`
      )
    }
    return
  }

  if (choice === 2) {
    const curCustom = Keychain.contains(LOON_POLICIES_KEY) ? Keychain.get(LOON_POLICIES_KEY) || "" : ""
    const defaultStr = curCustom || (currentData.policies || []).map((p) => p.id).join(", ")
    const input = await promptSafe({
      title: "自定义展示的 4 个策略组",
      message:
        "请输入你在 Loon 中的策略组名称（最多 4 个，用逗号分隔，留空则自动匹配如 节点选择、国外网站、苹果服务、漏网之鱼）：",
      defaultValue: defaultStr,
      placeholder: "节点选择, 国外网站, 苹果服务, 漏网之鱼",
      confirmLabel: "保存并同步",
      cancelLabel: "取消",
    }, true)
    if (input === null) return
    if (input.trim()) {
      Keychain.set(LOON_POLICIES_KEY, input.trim(), {
        accessibility: "first_unlock_this_device",
      })
    } else {
      Keychain.remove(LOON_POLICIES_KEY)
    }
    const res = await refreshLoonData()
    Widget.reloadAll()
    if (res) {
      await gAlert(
        `✓ 已更新展示策略组：\n${res.policies.map((p) => `• ${p.label}（${p.selected}）`).join("\n")}`
      )
    }
    return
  }

  if (choice === 3) {
    const next = await switchLoonRunningMode()
    Widget.reloadAll()
    await gAlert(`✓ 已切换运行模式为：【${next.runningModeLabel}】\n桌面小组件已同步更新！`)
    return
  }

  if (choice === 4) {
    const policies = currentData.policies || []
    const pIdx = await Dialog.actionSheet({
      title: "选择要切换节点的策略组",
      message: "在桌面小组件上直接点击对应策略组卡片也可实现同样效果",
      cancelButton: true,
      actions: policies.map((p) => ({ label: `${p.label}（当前：${p.selected}）` })),
    })
    if (pIdx === null || pIdx === undefined || pIdx < 0 || pIdx >= policies.length) return
    const targetP = policies[pIdx]
    const updated = await switchLoonPolicyNode(targetP.id)
    Widget.reloadAll()
    const afterP = updated.policies.find((x) => x.id === targetP.id)
    await gAlert(
      `✓ 策略组【${targetP.label}】已切换节点：\n${targetP.selected}  ➔  ${afterP?.selected}\n\n桌面小组件已同步更新！`
    )
    return
  }

  if (choice === 5) {
    const res = await refreshLoonData()
    Widget.reloadAll()
    if (res) {
      await gAlert(
        `✓ Loon 状态已同步！\n\n桥接：${res.bridgeConnected ? "已连接 🟢" : "未连接 🟠（" + (res.bridgeError || "未知") + "）"}\n运行模式：${res.runningModeLabel}\n当前出口：${res.outboundTag} (${res.latencyMs})\n剩余流量：${res.remainGb} (${res.remainPct}%)\n主力节点：${res.policies[0]?.selected || "--"}`
      )
    }
  }
}

/** 引导配置中国联通（Cookie 凭据 + 数据同步） */
async function configureUnicom() {
  const settings = getUnicomSettings()
  const choice = await Dialog.actionSheet({
    title: "配置 中国联通 (话费/流量/语音)",
    message:
      "默认自动从 BoxJS 同步（ZayiaComponentService），无需手动填写 Cookie。\n仅当 BoxJS 不可用时，才需要手动配置凭据。",
    cancelButton: true,
    actions: [
      { label: "🍪 手动配置凭据（可选兜底）" },
      { label: "📦 BoxJS 地址设置（默认 boxjs.com）" },
      { label: "⚡️ 立即同步话费与流量并刷新小组件" },
      { label: "🗑 清除手动凭据" },
    ],
  })
  if (choice === null || choice === undefined || choice < 0) return

  if (choice === 0) {
    const cur = settings.cookie || ""
    const input = await promptSafe({
      title: "配置 中国联通 · 手动凭据（可选）",
      message:
        "一般情况下无需填写，脚本会自动从 BoxJS 同步。\n\n仅当 BoxJS 不可用时，才需要在此手动填写，支持三种方式：\n\n1️⃣ BoxJS 路径键：\n@ZayiaComponentService.ChinaUnicom.Settings\n\n2️⃣ BoxJS 中的 JSON 值原文：\n{\"Cookie\":\"ecs_token=...; c_mobile=...\"}\n\n3️⃣ 原始 Cookie 字符串：\necs_token=...; c_mobile=1xxxxxxxxxx; ...\n\n留空则始终走 BoxJS 自动同步。",
      defaultValue: cur,
      placeholder: "留空 = 自动从 BoxJS 同步",
      confirmLabel: "保存并同步",
      cancelLabel: "取消",
    }, true)
    if (input === null) return
    saveUnicomSettings({ cookie: input.trim() })
    const res = await refreshUnicomData()
    Widget.reloadAll()
    if (res) {
      await gAlert(
        `✓ 联通数据已同步！\n\n话费余额：${res.feeBalance} ${res.feeUnit}\n通用流量：${res.flowUnlimited ? "不限量" : `${res.flowUsedGb} / ${res.flowTotalGb} GB`}\n语音：${res.voiceTotalMin > 0 ? `${res.voiceUsedMin} / ${res.voiceTotalMin} 分钟` : `已用 ${res.voiceUsedMin} 分钟`}`
      )
    } else {
      await gAlert(
        "⚠️ 同步失败，请检查：\n1. BoxJS 地址是否可访问（默认 https://boxjs.com）\n2. BoxJS 内是否存在 ZayiaComponentService\n3. 网络是否正常"
      )
    }
    return
  }

  if (choice === 1) {
    const curUrl = settings.boxJsUrl || "https://boxjs.com"
    const input = await promptSafe({
      title: "配置 BoxJS 地址",
      message:
        "脚本会自动从该地址读取 ZayiaComponentService 下的联通 Cookie。\n使用官方 BoxJS 保持默认即可；自建 BoxJS 请填写你的地址。",
      defaultValue: curUrl,
      placeholder: "https://boxjs.com",
      keyboardType: "URL",
      confirmLabel: "保存并同步",
      cancelLabel: "取消",
    }, true)
    if (input === null) return
    saveUnicomSettings({ boxJsUrl: input.trim() || "https://boxjs.com", enableBoxJs: true })
    const res = await refreshUnicomData()
    Widget.reloadAll()
    await gAlert(
      res
        ? `✓ BoxJS 地址已保存并同步成功！\n\n话费余额：${res.feeBalance} ${res.feeUnit}`
        : "⚠️ 地址已保存，但同步失败，请检查该地址是否可访问。"
    )
    return
  }

  if (choice === 2) {
    const res = await refreshUnicomData()
    Widget.reloadAll()
    if (res) {
      await gAlert(
        `✓ 联通数据已同步！\n\n话费余额：${res.feeBalance} ${res.feeUnit}\n通用流量：${res.flowUnlimited ? "不限量" : `${res.flowUsedGb} / ${res.flowTotalGb} GB`}\n语音：${res.voiceTotalMin > 0 ? `${res.voiceUsedMin} / ${res.voiceTotalMin} 分钟` : `已用 ${res.voiceUsedMin} 分钟`}`
      )
    } else {
      await gAlert("⚠️ 同步失败，请检查 BoxJS 地址是否可访问或网络是否正常。")
    }
    return
  }

  if (choice === 3) {
    const ok = await gConfirm("确定要清除手动填写的联通凭据吗？\n（清除后将仅通过 BoxJS 自动同步）")
    if (!ok) return
    saveUnicomSettings({ cookie: "" })
    await gAlert("已清除手动凭据，后续将仅通过 BoxJS 自动同步。")
    return
  }
}

/** 引导配置中国移动（登录信封/Cookie + 数据同步） */
async function configureCmcc() {
  const settings = getCmccSettings()
  const choice = await Dialog.actionSheet({
    title: "配置 中国移动 (话费/流量/积分)",
    message:
      "默认自动从 BoxJS 同步（cmcc_login），无需手动填写凭据。\n仅当 BoxJS 不可用时，才需要手动配置登录信封。",
    cancelButton: true,
    actions: [
      { label: "📱 手动配置凭据（可选兜底）" },
      { label: "📦 BoxJS 地址设置（默认 http://boxjs.net）" },
      { label: "⚡️ 立即同步话费与流量并刷新小组件" },
      { label: "🗑 清除手动凭据" },
    ],
  })
  if (choice === null || choice === undefined || choice < 0) return

  if (choice === 0) {
    const cur = settings.loginEnvelope || ""
    const input = await promptSafe({
      title: "配置 中国移动 · 登录信封（可选）",
      message:
        "一般情况下无需填写，脚本会自动从 BoxJS (cmcc_login) 同步。\n\n如需手动填写，可直接粘贴 Quantumult X 日志或 BoxJS 中的登录信封 JSON（包含 xk、tel 等），留空则始终走 BoxJS 自动同步。",
      defaultValue: cur,
      placeholder: "留空 = 自动从 BoxJS 同步",
      confirmLabel: "保存并同步",
      cancelLabel: "取消",
    }, true)
    if (input === null) return
    saveCmccSettings({ loginEnvelope: input.trim() })
    const res = await refreshCmccData()
    Widget.reloadAll()
    if (res) {
      await gAlert(
        `✓ 移动数据已同步！\n\n话费余额：${res.feeBalance} ${res.feeUnit}\n剩余流量：${res.flowUnlimited ? "不限量" : `${res.flowRemainGb} / ${res.flowTotalGb} GB`}\n移动积分：${res.points} 分\n账号：${res.tel}`
      )
    } else {
      await gAlert(
        "⚠️ 同步失败，请检查：\n1. BoxJS 地址是否可访问（默认 https://boxjs.com）\n2. BoxJS 内是否存在 cmcc_login 凭据\n3. 手动凭据格式是否正确"
      )
    }
    return
  }

  if (choice === 1) {
    const curUrl = settings.boxJsUrl || "http://boxjs.net"
    const input = await promptSafe({
      title: "配置 BoxJS 地址",
      message:
        "脚本会自动从该地址读取 cmcc_login 移动凭据。\n使用官方 BoxJS 保持默认即可；自建 BoxJS 请填写你的完整地址。",
      defaultValue: curUrl,
      placeholder: "http://boxjs.net",
      keyboardType: "URL",
      confirmLabel: "保存并同步",
      cancelLabel: "取消",
    }, true)
    if (input === null) return
    saveCmccSettings({ boxJsUrl: input.trim() || "http://boxjs.net", enableBoxJs: true })
    const res = await refreshCmccData()
    Widget.reloadAll()
    await gAlert(
      res
        ? `✓ BoxJS 地址已保存并同步成功！\n\n话费余额：${res.feeBalance} ${res.feeUnit}`
        : "⚠️ 地址已保存，但同步失败，请检查该地址是否可访问。"
    )
    return
  }

  if (choice === 2) {
    const res = await refreshCmccData()
    Widget.reloadAll()
    if (res) {
      await gAlert(
        `✓ 移动数据已同步！\n\n话费余额：${res.feeBalance} ${res.feeUnit}\n剩余流量：${res.flowUnlimited ? "不限量" : `${res.flowRemainGb} / ${res.flowTotalGb} GB`}\n移动积分：${res.points} 分`
      )
    } else {
      await gAlert("⚠️ 同步失败，请检查 BoxJS 地址是否可访问或网络是否正常。")
    }
    return
  }

  if (choice === 3) {
    const ok = await gConfirm("确定要清除手动填写的移动凭据吗？\n（清除后将仅通过 BoxJS 自动同步）")
    if (!ok) return
    saveCmccSettings({ loginEnvelope: "" })
    await gAlert("已清除手动凭据，后续将仅通过 BoxJS 自动同步。")
    return
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
  const hasMagpie = hasMagpieConfigured()
  const hasQb = hasQbConfigured()
  const hasQx = hasQxConfigured()
  const hasLoon = hasLoonConfigured()
  const hasUnicom = hasUnicomConfigured()
  const hasCmcc = hasCmccConfigured()

  // 已启用组件（用户主动添加），已配置的旧组件自动迁移进来
  const configuredIds = [
    hasQx ? "qx" : "", hasLoon ? "loon" : "", hasCmcc ? "cmcc" : "",
    hasUnicom ? "unicom" : "", hasWb ? "workbuddy" : "", hasDeepSeek ? "deepseek" : "",
    hasCodex ? "codex" : "", hasAntigravity ? "antigravity" : "", hasMedia ? "media" : "",
    hasCpamp ? "cpamp" : "", hasMagpie ? "magpie" : "", hasQb ? "qbittorrent" : "",
    "vpn", "fuel", // 无需配置的组件默认可启用
  ].filter(Boolean)
  migrateEnabledServices(configuredIds)
  const [enabledIds, setEnabledIds] = useState<string[]>(() => getEnabledServices())

  // 每个组件的“是否已配置/可用”
  const configuredMap: Record<string, boolean> = {
    qx: hasQx, qx_traffic: hasQx, loon: hasLoon, loon_traffic: hasLoon,
    cmcc: hasCmcc, unicom: hasUnicom, workbuddy: hasWb, deepseek: hasDeepSeek,
    codex: hasCodex, antigravity: hasAntigravity, media: hasMedia, cpamp: hasCpamp,
    magpie: hasMagpie, qbittorrent: hasQb, vpn: true, fuel: true,
  }
  const enabledSet = new Set(enabledIds)
  const toggleEnabled = (id: string, on: boolean) => {
    const next = on ? Array.from(new Set([...enabledIds, id])) : enabledIds.filter(x => x !== id)
    saveEnabledServices(next)
    setEnabledIds(next)
  }

  useEffect(() => {
    // 首次进入设置面板后 500ms 轻量触发
    const timer = setTimeout(() => {
      triggerPromo(false).catch(() => {})
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // 统一预览：传入组件 id，按需刷新 → 选尺寸 → 预览
  const previewOpt = async (id: string) => {
    const opt = OPT_BY_ID[id]
    if (!opt) return
    await preparePreview(id)
    try {
      Storage.set("dashboard_kit_preview_active_id", id, { shared: true })
      Storage.set("dashboard_kit_preview_active_id", id)
      FileManager.writeAsStringSync(
        FileManager.appGroupDocumentsDirectory + "/dashboard_kit_preview_active.txt", id)
    } catch {}
    let family = (opt.defaultFamily || "systemSmall") as any
    if (["cmcc", "unicom", "loon", "loon_traffic", "qx", "qx_traffic", "fuel", "qbittorrent"].includes(id)) {
      const dualSize = ["cmcc", "unicom", "loon", "loon_traffic", "qx", "qx_traffic"].includes(id)
      const choices = dualSize
        ? [`中号组件 (${opt.name} 全面监控)`, "小号组件 (精简)", "取消"]
        : ["小号组件", "中号组件", "取消"]
      const chosen = await gActionSheet(`请选择 ${opt.name} 预览尺寸`, choices)
      if (!chosen || chosen === "取消") return
      family = chosen.includes("小号") ? "systemSmall" : "systemMedium"
    }
    await Widget.preview({
      family,
      parameters: {
        options: Object.fromEntries(WIDGET_OPTIONS.map(o => [o.name, o.id])),
        default: opt.name,
      },
    })
  }

  // 添加组件：分组列表 → 选组件 → 加入启用并进入配置
  const addComponent = async () => {
    const groupNames = WIDGET_GROUPS.map(g => g.title)
    const gName = await gActionSheet("选择要添加的组件类别", [...groupNames, "取消"])
    if (!gName || gName === "取消") return
    const group = WIDGET_GROUPS.find(g => g.title === gName)
    if (!group) return
    const options = group.ids.map(id => OPT_BY_ID[id]?.name || id)
    const picked = await gActionSheet("选择组件", [...options, "取消"])
    if (!picked || picked === "取消") return
    const pickedId = group.ids[options.indexOf(picked)]
    if (!pickedId) return
    toggleEnabled(pickedId, true)
    const fn = CONFIGURE_FN[pickedId]
    if (fn) await fn()
  }

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
        {/* 我的组件：只显示用户添加的组件 */}
        <Section header={<Text>我的组件</Text>}>
          {/* 添加组件：整行主操作卡片 */}
          <Button action={addComponent}>
            <HStack spacing={12} alignment="center" padding={{ top: 6, bottom: 6 }}>
              <ZStack frame={{ width: 40, height: 40 }} alignment="center">
                <RoundedRectangle
                  fill={{ light: "#EEF2FF", dark: "#312E81" } as any}
                  cornerRadius={11}
                  frame={{ width: 40, height: 40 }}
                />
                <Image
                  systemName="plus.circle.fill"
                  font={{ name: "system", size: 22 }}
                  foregroundStyle={{ light: "#4F46E5", dark: "#818CF8" } as any}
                />
              </ZStack>
              <VStack alignment="leading" spacing={2}>
                <Text font={15} fontWeight="bold" foregroundStyle={{ light: "#4F46E5", dark: "#818CF8" } as any}>
                  添加组件
                </Text>
                <Text font={11} foregroundStyle={C_SUBTITLE}>
                  从分类中选择并配置新的看板
                </Text>
              </VStack>
              <Spacer />
              <Image
                systemName="chevron.right"
                font={{ name: "system", size: 14 }}
                foregroundStyle={C_SUBTITLE}
              />
            </HStack>
          </Button>

          {/* 预览：次要操作，已添加组件时可点 */}
          {enabledIds.length > 0 ? (
            <HStack spacing={8} alignment="center">
              <Image
                systemName="eye.fill"
                font={{ name: "system", size: 13 }}
                foregroundStyle={C_SUBTITLE}
              />
              <Text font={12} foregroundStyle={C_SUBTITLE}>预览已添加的组件</Text>
              <Spacer />
              <Button
                title="选择预览"
                buttonStyle="bordered"
                controlSize="mini"
                action={async () => {
                  const names = enabledIds.map(id => OPT_BY_ID[id]?.name || id)
                  const picked = await gActionSheet("选择要预览的组件", [...names, "取消"])
                  if (!picked || picked === "取消") return
                  const id = enabledIds[names.indexOf(picked)]
                  if (id) await previewOpt(id)
                }}
              />
            </HStack>
          ) : null}

          {enabledIds.length === 0 ? (
            <VStack alignment="leading" spacing={6} padding={{ top: 10, bottom: 10 }}>
              <Text font={13} fontWeight="semibold" foregroundStyle={C_SECTION_HEADER}>
                还没有添加组件
              </Text>
              <Text font={12} foregroundStyle={C_SUBTITLE}>
                点上方「添加组件」卡片，按分类选择你需要的看板。已配置过的组件会自动出现在这里。
              </Text>
            </VStack>
          ) : null}

          {enabledIds.map((id) => {
            const opt = OPT_BY_ID[id]
            const name = opt?.name || id
            const isOn = !!configuredMap[id]
            return (
              <HStack key={id} spacing={8} alignment="center">
                <ZStack frame={{ width: 30, height: 30 }} alignment="center">
                  <RoundedRectangle fill={BG_BOX} cornerRadius={8} frame={{ width: 30, height: 30 }} />
                  <OptionBrandIcon id={id} />
                </ZStack>
                <VStack alignment="leading" spacing={2}>
                  <Text font={13.5} fontWeight="semibold" foregroundStyle={C_TITLE} lineLimit={1}>
                    {name}
                  </Text>
                  <Text font={10} foregroundStyle={isOn ? COLOR_SUCCESS : COLOR_WARN} lineLimit={1}>
                    {isOn ? "已配置" : "待配置"}
                  </Text>
                </VStack>
                <Spacer />
                <Button
                  title={isOn ? "管理" : "去配置"}
                  buttonStyle="bordered"
                  controlSize="mini"
                  action={async () => {
                    const fn = CONFIGURE_FN[id]
                    if (fn) await fn()
                  }}
                />
                <Button
                  title="移除"
                  role="destructive"
                  buttonStyle="bordered"
                  controlSize="mini"
                  action={async () => {
                    const ok = await gConfirm(`从「我的组件」移除 ${name}？\n（只移除列表，不会删除已保存的凭据）`)
                    if (!ok) return
                    toggleEnabled(id, false)
                  }}
                />
              </HStack>
            )
          })}

          <HStack spacing={10} alignment="center" padding={{ top: 6 }}>
            <Image
              systemName="arrow.clockwise.circle.fill"
              font={{ name: "system", size: 16 }}
              foregroundStyle="#3B82F6"
            />
            <VStack alignment="leading" spacing={2}>
              <Text font={14} fontWeight="medium">刷新已启用组件</Text>
              <Text font={11} foregroundStyle={C_SUBTITLE}>只刷新「我的组件」，不请求未添加的服务</Text>
            </VStack>
            <Spacer />
            <Button
              title="立即刷新"
              buttonStyle="borderedProminent"
              controlSize="small"
              action={async () => {
                try {
                  const refreshers: Record<string, () => Promise<any>> = {
                    workbuddy: refreshWorkBuddyData, deepseek: refreshDeepSeekData,
                    codex: refreshCodexData, antigravity: refreshAntigravityData,
                    cpamp: refreshCpampData, magpie: refreshMagpieData,
                    media: refreshEmbyData, qbittorrent: refreshQbittorrentData,
                    qx: refreshQxData, qx_traffic: refreshQxData,
                    loon: refreshLoonData, loon_traffic: refreshLoonData,
                    cmcc: refreshCmccData, unicom: refreshUnicomData,
                    vpn: refreshVpnData, fuel: refreshFuelData,
                  }
                  const tasks = enabledIds
                    .map(id => refreshers[id])
                    .filter(Boolean)
                    .map(fn => fn().catch((e: any) => console.log("refresh err:", e)))
                  await Promise.all(tasks)
                  Widget.reloadAll()
                  await gAlert("✓ 已启用组件刷新完成！")
                } catch (e: any) {
                  await gAlert(`刷新异常：${e?.message || e}`)
                }
              }}
            />
          </HStack>
        </Section>

        {/* 方案 A 使用说明 */}
        <Section header={<Text>桌面小组件使用说明</Text>}>
          <VStack alignment="leading" spacing={6} padding={{ top: 4, bottom: 4 }}>
            <Text font={14} fontWeight="semibold" foregroundStyle={C_SECTION_HEADER}>
              如何在桌面添加不同组件？
            </Text>
            <Text font={12} foregroundStyle={C_SUBTITLE}>
              1. 桌面长按空白处 → 左上角「+」→ 添加「DashBoard-Kit」小组件。
            </Text>
            <Text font={12} foregroundStyle={C_SUBTITLE}>
              2. 长按已添加的小组件 →「编辑小组件」。
            </Text>
            <Text font={12} foregroundStyle={C_SUBTITLE}>
              3. 在「参数 (Parameter)」填组件 ID（如 magpie、deepseek、media）即可切换。
            </Text>
          </VStack>
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

