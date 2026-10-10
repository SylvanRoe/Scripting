import { Widget } from "scripting"
import {
  DualQuotaCard,
  FuelPriceCard,
  MediaNexusCard,
  MetricBalanceCard,
  QbittorrentCard,
  QuantumultXCard,
  QuantumultXTrafficCard,
  VpnNodeCard,
} from "./cards"
import {
  getAntigravityData,
  getCodexData,
  getCpampData,
  getDeepSeekData,
  getFuelData,
  getMediaNexusData,
  getQbittorrentData,
  getQxData,
  getVpnData,
  getWorkBuddyData,
  refreshAntigravityData,
  refreshCodexData,
  refreshCpampData,
  refreshDeepSeekData,
  refreshFuelData,
  refreshMediaData,
  refreshQbittorrentData,
  refreshQxData,
  refreshVpnData,
  refreshWorkBuddyData,
} from "./data"

/**
 * 方案 A 实现逻辑：
 * 桌面小组件读取用户在长按小组件选择的参数（Widget.parameter）
 * 若未设置或设置为 "media" 则默认展示 Media Nexus，
 * 若设置为 "deepseek" / "codex" / "antigravity" / "workbuddy" / "cpamp" 则渲染对应卡片。
 */
export function getWidgetView(paramOverride?: string, familyOverride?: string) {
  let p = (paramOverride || Widget.parameter || "").trim().toLowerCase()

  // 尝试解析 Widget.parameter（如果是 JSON 字符串）
  if (p.startsWith("{") && p.endsWith("}")) {
    try {
      const parsed = JSON.parse(p)
      const val = String(parsed.id || parsed.name || parsed.default || Object.values(parsed)[0] || "").toLowerCase()
      if (val) p = val
    } catch {}
  }

  // 若仍为空，优先读取文件与 Storage 中最近一次点击预览激活的组件 ID
  const activePath = FileManager.appGroupDocumentsDirectory + "/dashboard_kit_preview_active.txt"
  if (!p && FileManager.existsSync(activePath)) {
    try {
      p = (FileManager.readAsStringSync(activePath) || "").trim().toLowerCase()
    } catch {}
  }

  if (!p) {
    p = (
      Storage.get<string>("dashboard_kit_preview_active_id", { shared: true }) ||
      Storage.get<string>("dashboard_kit_preview_active_id") ||
      ""
    ).trim().toLowerCase()
  }
  const family = familyOverride || Widget.family

  let param = p
  if (param.startsWith("{") && param.endsWith("}")) {
    try {
      const parsed = JSON.parse(param)
      const val = String(parsed.id || parsed.name || parsed.default || Object.values(parsed)[0] || "").toLowerCase()
      if (val) param = val
    } catch {}
  }

  // 0. 支持直接匹配 ID 或中文名称
  const target = param || p
  if (target.includes("antigravity") || target === "ag" || target.includes("anti-gravity")) param = "antigravity"
  else if (target.includes("codex")) param = "codex"
  else if (target.includes("workbuddy") || target === "wb") param = "workbuddy"
  else if (target.includes("deepseek") || target === "ds") param = "deepseek"
  else if (target.includes("media") || target.includes("moviepilot") || target.includes("emby") || target.includes("jellyfin")) param = "media"
  else if (target.includes("cpamp") || target.includes("cpa")) param = "cpamp"
  else if (target.includes("vpn") || target.includes("node") || target.includes("ip") || target.includes("节点")) param = "vpn"
  else if (target.includes("qbittorrent") || target.includes("qb") || target.includes("qbit")) param = "qbittorrent"
  else if (target.includes("fuel") || target.includes("oil") || target.includes("油价")) param = "fuel"
  else if (
    target === "qx_traffic" ||
    target === "qx2" ||
    target.includes("qx-traffic") ||
    target.includes("qxtraffic") ||
    target.includes("圈x流量") ||
    target.includes("qx流量")
  )
    param = "qx_traffic"
  else if (target.includes("qx") || target.includes("quantumult") || target.includes("圈x")) param = "qx"

  // 1. 如果传入参数是指定 id
  if (param === "qx_traffic") {
    return <QuantumultXTrafficCard data={getQxData()} family={family} />
  } else if (param === "qx") {
    return <QuantumultXCard data={getQxData()} family={family} />
  } else if (param === "deepseek") {
    return <MetricBalanceCard data={getDeepSeekData()} />
  } else if (param === "workbuddy") {
    return <MetricBalanceCard data={getWorkBuddyData()} />
  } else if (param === "cpamp") {
    return <MetricBalanceCard data={getCpampData()} />
  } else if (param === "vpn") {
    return <VpnNodeCard data={getVpnData()} />
  } else if (param === "qbittorrent") {
    return <QbittorrentCard data={getQbittorrentData()} family={family} />
  } else if (param === "fuel") {
    return <FuelPriceCard data={getFuelData()} family={family} />
  } else if (param === "codex") {
    return <DualQuotaCard data={getCodexData()} />
  } else if (param === "antigravity") {
    return <DualQuotaCard data={getAntigravityData()} />
  } else if (param === "media") {
    return <MediaNexusCard data={getMediaNexusData()} />
  }

  // 2. 如果未指定 parameter，根据小组件尺寸自适应默认展示：
  // 中号/大号默认展示 Media Nexus，小号默认展示 WorkBuddy 看板
  if (family === "systemMedium" || family === "systemLarge") {
    return <MediaNexusCard data={getMediaNexusData()} />
  } else {
    return <MetricBalanceCard data={getWorkBuddyData()} />
  }
}

export default function DefaultWidget() {
  return getWidgetView()
}

async function main() {
  // 小组件唤醒执行时，后台轻量触发一次全局配额静默刷新（若有配置），拉取最新真实数据
  try {
    let p = (Widget.parameter || "").trim().toLowerCase()
    if (!p) {
      p = (
        Storage.get<string>("dashboard_kit_preview_active_id", { shared: true }) ||
        Storage.get<string>("dashboard_kit_preview_active_id") ||
        ""
      ).trim().toLowerCase()
    }
    const activePath = FileManager.appGroupDocumentsDirectory + "/dashboard_kit_preview_active.txt"
    if (!p && FileManager.existsSync(activePath)) {
      try {
        p = (FileManager.readAsStringSync(activePath) || "").trim().toLowerCase()
      } catch {}
    }
    if (p.includes("antigravity") || p === "ag" || p.includes("anti-gravity")) {
      await refreshAntigravityData().catch(() => null)
    } else if (p.includes("codex")) {
      await refreshCodexData().catch(() => null)
    } else if (p.includes("deepseek") || p === "ds") {
      await refreshDeepSeekData().catch(() => null)
    } else if (p.includes("workbuddy") || p === "wb") {
      await refreshWorkBuddyData().catch(() => null)
    } else if (p.includes("media") || p.includes("moviepilot") || p.includes("emby") || p.includes("jellyfin")) {
      await refreshMediaData().catch(() => null)
    } else if (p.includes("cpamp")) {
      await refreshCpampData().catch(() => null)
    } else if (p.includes("vpn") || p.includes("node") || p.includes("ip")) {
      await refreshVpnData().catch(() => null)
    } else if (p.includes("qbittorrent") || p.includes("qb") || p.includes("qbit")) {
      await refreshQbittorrentData().catch(() => null)
    } else if (p.includes("fuel") || p.includes("oil") || p.includes("油价")) {
      await refreshFuelData().catch(() => null)
    } else if (p.includes("qx") || p.includes("quantumult") || p.includes("圈x")) {
      // 如果刚在桌面点击了切换模式/节点（8秒内已更新缓存），跳过耗时网络请求，直接秒级渲染 UI
      const curQx = getQxData()
      const elapsed = Date.now() - (Date.parse(curQx.updatedAt || "") || 0)
      if (elapsed > 8000) {
        await refreshQxData().catch(() => null)
      }
    } else {
      // 未带参数时，优先按默认组件刷新
      if (Widget.family === "systemMedium" || Widget.family === "systemLarge") {
        await refreshMediaData().catch(() => null)
      } else {
        await refreshWorkBuddyData().catch(() => null)
      }
    }
  } catch {}

  const view = getWidgetView()
  // 设置 15 分钟系统 timeline 自动刷新（policy: "after"）
  Widget.present(view, {
    policy: "after",
    date: new Date(Date.now() + 15 * 60 * 1000),
  })
}

main().catch((e) => {
  console.log("Widget render error:", e)
})
