import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import {
  refreshAntigravityData,
  refreshCodexData,
  refreshCpampData,
  refreshDeepSeekData,
  refreshEmbyData,
  refreshFuelData,
  refreshQbittorrentData,
  refreshQxData,
  refreshVpnData,
  refreshWorkBuddyData,
  switchQxPolicyNode,
  switchQxRunningMode,
} from "./data"

// 统一刷新 Intent
export const RefreshWidgetIntent = AppIntentManager.register({
  name: "RefreshDashboardKitWidget",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    try {
      console.log("[DashBoard-Kit] Widget refresh triggered")
      await Promise.all([
        refreshWorkBuddyData().catch(() => null),
        refreshEmbyData().catch(() => null),
        refreshDeepSeekData().catch(() => null),
        refreshCodexData().catch(() => null),
        refreshAntigravityData().catch(() => null),
        refreshCpampData().catch(() => null),
        refreshVpnData().catch(() => null),
        refreshFuelData().catch(() => null),
        refreshQbittorrentData().catch(() => null),
        refreshQxData().catch(() => null),
      ])
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
