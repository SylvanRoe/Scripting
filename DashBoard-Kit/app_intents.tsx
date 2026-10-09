import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import {
  refreshAntigravityData,
  refreshCodexData,
  refreshCpampData,
  refreshDeepSeekData,
  refreshEmbyData,
  refreshFuelData,
  refreshQbittorrentData,
  refreshVpnData,
  refreshWorkBuddyData,
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
      ])
    } finally {
      Widget.reloadAll()
    }
  },
})
