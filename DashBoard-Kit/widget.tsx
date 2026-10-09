import { Widget } from "scripting"
import { DualQuotaCard, MediaNexusCard, MetricBalanceCard, VpnNodeCard } from "./cards"
import {
  getAntigravityData,
  getCodexData,
  getCpampData,
  getDeepSeekData,
  getMediaNexusData,
  getVpnData,
  getWorkBuddyData,
  refreshAntigravityData,
  refreshCodexData,
  refreshCpampData,
  refreshDeepSeekData,
  refreshMediaData,
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
  const p = (paramOverride || Widget.parameter || "").trim().toLowerCase()
  const family = familyOverride || Widget.family

  // 支持通过参数名称或 id 匹配（兼容中英文与大小写）
  let param = p
  if (p.includes("workbuddy")) param = "workbuddy"
  else if (p.includes("deepseek")) param = "deepseek"
  else if (p.includes("codex")) param = "codex"
  else if (p.includes("antigravity")) param = "antigravity"
  else if (p.includes("media")) param = "media"
  else if (p.includes("cpamp")) param = "cpamp"
  else if (p.includes("vpn")) param = "vpn"

  // 1. 如果传入参数是指定 id
  if (param === "deepseek") {
    return <MetricBalanceCard data={getDeepSeekData()} />
  } else if (param === "workbuddy") {
    return <MetricBalanceCard data={getWorkBuddyData()} />
  } else if (param === "cpamp") {
    return <MetricBalanceCard data={getCpampData()} />
  } else if (param === "vpn") {
    return <VpnNodeCard data={getVpnData()} />
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
    const p = (Widget.parameter || "").trim().toLowerCase()
    if (p.includes("antigravity")) {
      await refreshAntigravityData().catch(() => null)
    } else if (p.includes("codex")) {
      await refreshCodexData().catch(() => null)
    } else if (p.includes("deepseek")) {
      await refreshDeepSeekData().catch(() => null)
    } else if (p.includes("workbuddy")) {
      await refreshWorkBuddyData().catch(() => null)
    } else if (p.includes("media")) {
      await refreshMediaData().catch(() => null)
    } else if (p.includes("cpamp")) {
      await refreshCpampData().catch(() => null)
    } else if (p.includes("vpn")) {
      await refreshVpnData().catch(() => null)
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
