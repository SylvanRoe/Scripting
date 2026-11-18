import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import {
  refreshAntigravityData,
  refreshCodexData,
  refreshCpampData,
  refreshMagpieData,
  refreshDeepSeekData,
  refreshEmbyData,
  refreshFuelData,
  refreshLoonData,
  refreshQbittorrentData,
  refreshQxData,
  refreshVpnData,
  refreshWorkBuddyData,
  switchLoonPolicyNode,
  switchLoonRunningMode,
  switchQxPolicyNode,
  switchQxRunningMode,
  refreshUnicomData,
  refreshCmccData,
  hasWbConfigured,
  hasDeepSeekConfigured,
  hasCodexConfigured,
  hasAntigravityConfigured,
  hasCpampConfigured,
  hasMagpieConfigured,
  hasMediaConfigured,
  hasQbConfigured,
  hasQxConfigured,
  hasLoonConfigured,
  hasUnicomConfigured,
  hasCmccConfigured,
} from "./data"

// 单个 serviceId 刷新映射：只刷新目标组件，且未配置的组件直接跳过（不请求已停服务端）
const REFRESHERS: Record<string, { has?: () => boolean; run: () => Promise<any> }> = {
  workbuddy: { has: hasWbConfigured, run: refreshWorkBuddyData },
  deepseek: { has: hasDeepSeekConfigured, run: refreshDeepSeekData },
  codex: { has: hasCodexConfigured, run: refreshCodexData },
  antigravity: { has: hasAntigravityConfigured, run: refreshAntigravityData },
  cpamp: { has: hasCpampConfigured, run: refreshCpampData },
  magpie: { has: hasMagpieConfigured, run: refreshMagpieData },
  media: { has: hasMediaConfigured, run: refreshEmbyData },
  vpn: { run: refreshVpnData },
  fuel: { run: refreshFuelData },
  qbittorrent: { has: hasQbConfigured, run: refreshQbittorrentData },
  qx: { has: hasQxConfigured, run: refreshQxData },
  qx_traffic: { has: hasQxConfigured, run: refreshQxData },
  loon: { has: hasLoonConfigured, run: refreshLoonData },
  loon_traffic: { has: hasLoonConfigured, run: refreshLoonData },
  unicom: { has: hasUnicomConfigured, run: refreshUnicomData },
  cmcc: { has: hasCmccConfigured, run: refreshCmccData },
}

/** 统一刷新 Intent：
 *  - 传入 serviceId 时只刷新该组件（未配置则跳过，杜绝请求已停服务端）
 *  - 不传时兼容旧行为：只刷新"已配置"的组件
 */
export const RefreshWidgetIntent = AppIntentManager.register({
  name: "RefreshDashboardKitWidget",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (serviceId?: string) => {
    try {
      const id = (serviceId || "").trim().toLowerCase()
      if (id && REFRESHERS[id]) {
        const item = REFRESHERS[id]
        if (!item.has || item.has()) {
          await item.run().catch(() => null)
        }
      } else if (id) {
        // 未知 id：什么都不刷新
      } else {
        // 未指定：只刷新已配置的组件（再也不会碰停用的 WorkBuddy）
        await Promise.all(
          Object.values(REFRESHERS).map((item) =>
            (!item.has || item.has()) ? item.run().catch(() => null) : Promise.resolve(null)
          )
        )
      }
    } finally {
      Widget.reloadAll()
    }
  },
})

// Quantumult X 桌面交互：点击切换运行模式（规则分流 / 全部代理 / 全部直连）
export const SwitchQxModeIntent = AppIntentManager.register({
  name: "SwitchQxRunningMode",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    try {
      await switchQxRunningMode()
    } finally {
      Widget.reloadAll()
    }
  },
})

// Quantumult X 桌面交互：点击策略组卡片切换下一个候选节点
export const SwitchQxPolicyIntent = AppIntentManager.register({
  name: "SwitchQxPolicyNode",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (policyId: string) => {
    try {
      await switchQxPolicyNode(policyId || "Proxy")
    } finally {
      Widget.reloadAll()
    }
  },
})

// Loon 桌面交互：点击切换运行模式（分流模式 / 全局代理 / 全局直连）
export const SwitchLoonModeIntent = AppIntentManager.register({
  name: "SwitchLoonRunningMode",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    try {
      await switchLoonRunningMode()
    } finally {
      Widget.reloadAll()
    }
  },
})

// Loon 桌面交互：点击策略组卡片切换下一个候选节点
export const SwitchLoonPolicyIntent = AppIntentManager.register({
  name: "SwitchLoonPolicyNode",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (policyId: string) => {
    try {
      await switchLoonPolicyNode(policyId || "节点选择")
    } finally {
      Widget.reloadAll()
    }
  },
})
