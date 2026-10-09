import { Script } from "scripting"

// ============================================================
// 各看板数据模型定义（预留接入接口，当前内置标准 Mock 数据）
// ============================================================

// 官方 DeepSeek 蓝色小鲸鱼矢量 SVG（64x64）
export const DEEPSEEK_WHALE_SVG = `<svg viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M63.328,11.952c-0.677,-0.331 -0.971,0.301 -1.365,0.624c-0.136,0.104 -0.251,0.24 -0.365,0.363c-0.992,1.059 -2.149,1.752 -3.661,1.669c-2.211,-0.123 -4.099,0.571 -5.768,2.261c-0.355,-2.085 -1.533,-3.328 -3.325,-4.128c-0.939,-0.416 -1.888,-0.829 -2.547,-1.733c-0.459,-0.643 -0.584,-1.36 -0.813,-2.064c-0.147,-0.427 -0.293,-0.861 -0.781,-0.933c-0.533,-0.083 -0.741,0.363 -0.949,0.736c-0.835,1.525 -1.157,3.205 -1.125,4.907c0.072,3.829 1.688,6.88 4.901,9.048c0.365,0.248 0.459,0.499 0.344,0.861c-0.219,0.747 -0.48,1.472 -0.709,2.221c-0.147,0.477 -0.365,0.579 -0.877,0.373c-1.73,-0.743 -3.301,-1.812 -4.629,-3.147c-2.285,-2.208 -4.349,-4.645 -6.925,-6.555c-0.597,-0.441 -1.21,-0.86 -1.837,-1.256c-2.627,-2.552 0.347,-4.648 1.035,-4.896c0.72,-0.261 0.248,-1.152 -2.077,-1.141c-2.325,0.011 -4.453,0.787 -7.165,1.824c-0.403,0.154 -0.818,0.277 -1.24,0.365c-2.534,-0.478 -5.126,-0.569 -7.688,-0.272c-5.027,0.56 -9.04,2.939 -11.992,6.995c-3.547,4.875 -4.381,10.416 -3.36,16.192c1.075,6.091 4.184,11.133 8.96,15.075c4.955,4.088 10.659,6.091 17.168,5.707c3.952,-0.227 8.355,-0.757 13.317,-4.96c1.253,0.624 2.565,0.872 4.747,1.059c1.68,0.157 3.296,-0.08 4.547,-0.341c1.96,-0.416 1.824,-2.232 1.117,-2.563c-5.747,-2.677 -4.485,-1.587 -5.635,-2.469c2.923,-3.456 7.323,-7.045 9.045,-18.675c0.133,-0.925 0.019,-1.507 0,-2.253c-0.011,-0.453 0.093,-0.632 0.613,-0.683c1.443,-0.15 2.842,-0.58 4.12,-1.267c3.723,-2.035 5.227,-5.373 5.581,-9.379c0.053,-0.613 -0.011,-1.245 -0.659,-1.568l0,0.003Zm-32.445,36.048c-5.571,-4.379 -8.272,-5.821 -9.387,-5.76c-1.045,0.064 -0.856,1.256 -0.627,2.035c0.24,0.768 0.552,1.296 0.989,1.971c0.304,0.445 0.512,1.109 -0.301,1.608c-1.795,1.109 -4.912,-0.373 -5.059,-0.445c-3.629,-2.139 -6.667,-4.96 -8.803,-8.819c-2.064,-3.715 -3.264,-7.699 -3.461,-11.952c-0.053,-1.029 0.248,-1.392 1.272,-1.579c1.344,-0.257 2.722,-0.292 4.077,-0.104c5.685,0.832 10.523,3.373 14.581,7.397c2.315,2.293 4.067,5.035 5.867,7.712c1.92,2.859 3.987,5.552 6.613,7.771c.928.779 1.667,1.371 2.376,1.808c-2.139.24-5.707.293 -8.147-1.637l0,-.002Zm2.667,-17.173c-.021,.816 -.693,1.456 -1.509,1.435c-.816,-.021 -1.456,-.693 -1.435,-1.509c.021,-.816 .693,-1.456 1.509,-1.435c.816,.021 1.456,.693 1.435,1.509Zm8.293,4.256c-.533,.213 -1.064,.405 -1.573,.427c-.773,.032 -1.52,-.192 -2.133,-.672c-.731,-.613 -1.253-.955 -1.472,-2.021c-.027,-.128 -.043,-.261 -.043,-.395c.027,-.869 -.021,-1.435 -.64,-1.941c-.501,-.416 -1.136,-.533 -1.835,-.533c-.224,0 -.443,-.043 -.672,-.208c-.299,-.144 -.533,-.507 -.304,-.955c.075,-.144 .427,-.496 .512,-.56c.949,-.539 2.048,-.363 3.056,.043c.939,.384 1.648,1.088 2.667,2.085c1.045,1.205 1.237,1.536 1.835,2.437c.469,.704 .896,1.435 1.189,2.261c.181,.523 -.048,.944 -.667,1.079z" fill="#4D6BFE"/></svg>`

// 官方 CPA-Manager-Plus 矢量六边形棱镜 Logo SVG
export const CPAMP_LOGO_SVG = `<svg viewBox="12 8 272 302" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#005CFF" d="M129 18 54 65C34 77 22 85 22 99v49c0 2.2 1.8 4 4 4h20c2.1 0 3.2-.8 4.7-2.3l8-8c1.5-1.5 2.3-3.5 2.3-5.7v-21c0-3.7 1.5-6.3 4-8.7L140 56V26c0-4.4-4.4-8-11-8Zm38 0 75 47c20 12 32 20 32 34v49c0 2.2-1.8 4-4 4h-20c-2.1 0-3.2-.8-4.7-2.3l-8-8c-1.5-1.5-2.3-3.5-2.3-5.7v-21c0-3.7-1.5-6.3-4-8.7L156 56V26c0-4.4 4.4-8 11-8ZM26 168h20c2.1 0 3.2.8 4.7 2.3l6.3 6.3c2.6 2.6 3 4.4 3 7.4v16c0 4 .4 7.5 2 11L140 263v26c0 4.8-2.3 7-5.5 8.8-3.1 1.8-6.3 2-10 .2l-84-50.7C28 239.7 22 232.5 22 219v-47c0-2.2 1.8-4 4-4Zm244 0h-20c-2.1 0-3.2.8-4.7 2.3l-6.3 6.3c-2.6 2.6-3 4.4-3 7.4v16c0 4-.4 7.5-2 11L156 263v26c0 4.8 2.3 7 5.5 8.8 3.1 1.8 6.3 2 10 .2l84-50.7C268 239.7 274 232.5 274 219v-47c0-2.2-1.8-4-4-4Z"/><path d="m148 102 55 58-55 57-55-57 55-58Z" fill="#0878EE"/><path d="m93 160 27.5-28 27.5 28H93Z" fill="#38C8FF"/><path d="m120.5 132 27.5-30v58l-27.5-28Z" fill="#66DFFF"/><path d="m148 102 27.5 30-27.5 28v-58Z" fill="#126CFF"/><path d="m175.5 132 27.5 28h-55l27.5-28Z" fill="#075CFF"/><path d="m203 160-27.5 28-27.5-28h55Z" fill="#0044C7"/><path d="m175.5 188-27.5 29v-57l27.5 28Z" fill="#003BB8"/><path d="m148 217-27.5-29 27.5-28v57Z" fill="#075EDC"/><path d="m120.5 188-27.5-28h55l-27.5 28Z" fill="#078DF3"/></svg>`

function loadIcon(relLight: string, relDark?: string) {
  try {
    const base = Script.directory
    const light = (globalThis as any).UIImage?.fromFile(`${base}/${relLight}`)
    const dark = relDark ? (globalThis as any).UIImage?.fromFile(`${base}/${relDark}`) : light
    if (light && dark) return { light, dark }
    return light || null
  } catch {
    return null
  }
}

export interface MediaNexusData {
  title: string
  statusText: string
  recent7Days: number
  todayAdded: number
  movies: number
  shows: number
  episodes: number
  recentItems: { id: string; title: string; year: string }[]
  footerTag: string
  updatedAt: string
}

export interface MetricBalanceData {
  serviceId: "workbuddy" | "deepseek" | "cpamp"
  brandTitle: string
  brandTitleColor?: any
  wordmarkImage?: any
  iconName?: string
  iconColor?: any
  iconImage?: any
  svgCode?: string
  statusText: string
  mainLabel: string
  mainValue: string
  prefix?: string
  costStr?: string
  progressPct: number
  subLabel1: string
  subValue1: string
  subLabel2: string
  subValue2: string
  footerLeft: string
  updatedAt: string
}

export interface DualQuotaData {
  serviceId: "antigravity" | "codex"
  brandTitle: string
  iconName?: string
  iconColor?: any
  iconImage?: any
  svgCode?: string
  tagDotColor?: any
  item1: { label: string; timer: string; pct: number }
  item2: { label: string; timer: string; pct: number }
  stat1: { label: string; value: string }
  stat2: { label: string; value: string }
  footerStatus: string
  footerStatusColor?: any
  updatedAt: string
}

// 默认内置的精美 Mock 数据，与截图完全对齐
export const DEFAULT_MEDIA_NEXUS: MediaNexusData = {
  title: "Media Nexus",
  statusText: "就绪",
  recent7Days: 0,
  todayAdded: 0,
  movies: 0,
  shows: 0,
  episodes: 0,
  recentItems: [],
  footerTag: "未连接媒体库",
  updatedAt: new Date().toISOString(),
}

export const DEFAULT_DEEPSEEK: MetricBalanceData = {
  serviceId: "deepseek",
  brandTitle: "deepseek",
  brandTitleColor: "#4D6BFE",
  svgCode: DEEPSEEK_WHALE_SVG,
  statusText: "就绪",
  mainLabel: "账户余额",
  mainValue: "0.00",
  prefix: "¥",
  progressPct: 0,
  subLabel1: "可用模型",
  subValue1: "--",
  subLabel2: "响应延迟",
  subValue2: "--",
  footerLeft: "未配置",
  updatedAt: new Date().toISOString(),
}

export const DEFAULT_WORKBUDDY: MetricBalanceData = {
  serviceId: "workbuddy",
  brandTitle: "WORKBUDDY",
  wordmarkImage: loadIcon("assets/workbuddy.png", "assets/workbuddy-dark.png"),
  statusText: "就绪",
  mainLabel: "积分剩余",
  mainValue: "0",
  progressPct: 0,
  subLabel1: "已签",
  subValue1: "--",
  subLabel2: "已用",
  subValue2: "--",
  footerLeft: "未配置",
  updatedAt: new Date().toISOString(),
}

export const DEFAULT_CPAMP: MetricBalanceData = {
  serviceId: "cpamp",
  brandTitle: "CPAMP",
  svgCode: CPAMP_LOGO_SVG,
  statusText: "就绪",
  mainLabel: "今日调用",
  mainValue: "0",
  prefix: "",
  costStr: "$0.00",
  progressPct: 0,
  subLabel1: "成功",
  subValue1: "--",
  subLabel2: "失败",
  subValue2: "--",
  footerLeft: "未配置",
  updatedAt: new Date().toISOString(),
}

export const DEFAULT_CODEX: DualQuotaData = {
  serviceId: "codex",
  brandTitle: "Codex",
  iconImage: loadIcon("assets/codex-light.png", "assets/codex-dark.png"),
  item1: { label: "5 小时额度", timer: "--", pct: 0 },
  item2: { label: "周额度", timer: "--", pct: 0 },
  stat1: { label: "可重置次数", value: "0" },
  stat2: { label: "到期", value: "--" },
  footerStatus: "等待更新",
  updatedAt: new Date().toISOString(),
}

export const DEFAULT_ANTIGRAVITY: DualQuotaData = {
  serviceId: "antigravity",
  brandTitle: "Antigravity",
  iconImage: loadIcon("assets/antigravity-light.png", "assets/antigravity-dark.png"),
  item1: { label: "Gemini 5h", timer: "--", pct: 0 },
  item2: { label: "Claude/GPT 5h", timer: "--", pct: 0 },
  stat1: { label: "Gem 周", value: "0%" },
  stat2: { label: "C/G 周", value: "0%" },
  footerStatus: "等待更新",
  updatedAt: new Date().toISOString(),
}

export interface VpnNodeData {
  serviceId: "vpn"
  statusTitle: string
  ip: string
  location: string
  isp: string
  riskPct: number
  tag1: string
  tag2: string
  updatedAt: string
}

export const DEFAULT_VPN: VpnNodeData = {
  serviceId: "vpn",
  statusTitle: "待检测",
  ip: "--",
  location: "未连接",
  isp: "--",
  riskPct: 0,
  tag1: "--",
  tag2: "--",
  updatedAt: new Date().toISOString(),
}

export interface QbittorrentData {
  serviceId: "qbittorrent"
  statusText: string // "运行中" | "已连接"
  serverName?: string
  dlSpeed: string // "24.5 MB/s"
  upSpeed: string // "3.8 MB/s"
  dlSpeedBytes: number
  upSpeedBytes: number
  activeCount: number // 下载中任务数
  seedingCount: number // 做种中任务数
  totalCount: number // 总任务数
  allTimeDl: string // 累计下载 "1.2 TB"
  allTimeUl: string // 累计上传 "4.5 TB"
  shareRatio: string // "3.75"
  freeSpace: string // 剩余磁盘空间 "2.4 TB"
  connectionStatus: "connected" | "firewalled" | "disconnected"
  updatedAt: string
}

export const DEFAULT_QBITTORRENT: QbittorrentData = {
  serviceId: "qbittorrent",
  statusText: "运行中",
  serverName: "qBittorrent",
  dlSpeed: "28.6 MB/s",
  upSpeed: "5.2 MB/s",
  dlSpeedBytes: 28600000,
  upSpeedBytes: 5200000,
  activeCount: 3,
  seedingCount: 42,
  totalCount: 45,
  allTimeDl: "1.4 TB",
  allTimeUl: "5.8 TB",
  shareRatio: "4.14",
  freeSpace: "3.2 TB",
  connectionStatus: "connected",
  updatedAt: new Date().toISOString(),
}

export interface FuelCardData {
  serviceId: "fuel"
  province: string
  focusOilKey: "oil92" | "oil95" | "oil98" | "oil0"
  oilName: string
  oilFullName: string
  subTitle: string
  focusPrice: string
  prices: {
    oil92: string
    oil95: string
    oil98: string
    oil0: string
  }
  cleanDateText: string
  smallTrend: string
  mediumForecast?: string
  trendType: "down" | "up" | "flat"
  trendColor: string
  rawForecast?: string
  updatedAt: string
}

export const DEFAULT_FUEL: FuelCardData = {
  serviceId: "fuel",
  province: "北京",
  focusOilKey: "oil92",
  oilName: "92#",
  oilFullName: "92 号汽油",
  subTitle: "北京 92 号汽油",
  focusPrice: "7.88",
  prices: {
    oil92: "7.88",
    oil95: "8.39",
    oil98: "9.89",
    oil0: "7.59",
  },
  cleanDateText: "近期调价",
  smallTrend: "预计下调",
  mediumForecast: "近期调价 预计下调",
  trendType: "down",
  trendColor: "#2FB350",
  updatedAt: new Date().toISOString(),
}

// 支持在桌面小组件参数 (Widget.parameter) 中识别的 key 与列表
export const WIDGET_OPTIONS = [
  { id: "media", name: "Media Nexus", desc: "中号影视与媒体库总览看板", defaultFamily: "systemMedium" },
  { id: "deepseek", name: "DeepSeek", desc: "小号余额与模型延迟看板", defaultFamily: "systemSmall" },
  { id: "codex", name: "Codex", desc: "小号双周期额度与重置看板", defaultFamily: "systemSmall" },
  { id: "antigravity", name: "Antigravity", desc: "小号 Gemini/Claude 配额看板", defaultFamily: "systemSmall" },
  { id: "workbuddy", name: "WorkBuddy", desc: "小号账号池积分剩余看板", defaultFamily: "systemSmall" },
  { id: "cpamp", name: "CPAMP", desc: "小号今日调用与 Token 看板", defaultFamily: "systemSmall" },
  { id: "vpn", name: "VPN 节点", desc: "小号出口 IP 与风险检测看板", defaultFamily: "systemSmall" },
  { id: "qbittorrent", name: "qBittorrent", desc: "自适应下载器看板（小号速度与做种 / 中号全面监控）", defaultFamily: "systemSmall" },
  { id: "fuel", name: "今日油价", desc: "自适应油价行情（小号 Shell 高光 / 中号 4联卡片）", defaultFamily: "systemSmall" },
]
