// ============================================================
// DashBoard-Kit 设计主题与常量
// 统一复刻经典卡片式 iOS 数据看板视觉规范
// ============================================================

export const THEME = {
  text: { light: "#172033", dark: "#F4F7FC" } as any,
  muted: { light: "#68758A", dark: "#9AA8BE" } as any,
  dim: { light: "#8A96A9", dark: "#647189" } as any,
  accent: { light: "#1A13ED", dark: "#7B77FF" } as any,
  blue: { light: "#2563EB", dark: "#60A5FA" } as any,
  green: { light: "#18A875", dark: "#42D39A" } as any,
  orange: { light: "#D98212", dark: "#F6A83B" } as any,
  yellow: { light: "#E5A101", dark: "#FFD23F" } as any,
  red: { light: "#DC2626", dark: "#F87171" } as any,
  purple: { light: "#7C3AED", dark: "#A78BFA" } as any,
  track: { light: "#E2E8F0", dark: "#272F3D" } as any,
  border: { light: "rgba(23,32,51,0.08)", dark: "rgba(255,255,255,0.10)" } as any,
  bg: {
    light: {
      gradient: [
        { color: "#FFFFFF", location: 0 },
        { color: "#F4F7FB", location: 1 },
      ],
      startPoint: { x: 0.5, y: 0 },
      endPoint: { x: 0.5, y: 1 },
    },
    dark: {
      gradient: [
        { color: "#161D2B", location: 0 },
        { color: "#0B1019", location: 1 },
      ],
      startPoint: { x: 0.5, y: 0 },
      endPoint: { x: 0.5, y: 1 },
    },
  } as any,
}

// 线性插值颜色（随数值平滑变色）
export function lerpHex(a: string, b: string, t: number): string {
  const px = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [r1, g1, b1] = px(a)
  const [r2, g2, b2] = px(b)
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0")
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`
}

const REMAIN_STOPS: [number, string][] = [
  [0, "#DC2626"],
  [25, "#D98212"],
  [45, "#E5A101"],
  [70, "#18A875"],
  [100, "#18A875"],
]

export function remainColor(pct: number): any {
  const v = Math.max(0, Math.min(100, pct))
  for (let i = 0; i < REMAIN_STOPS.length - 1; i++) {
    const [p0, c0] = REMAIN_STOPS[i]
    const [p1, c1] = REMAIN_STOPS[i + 1]
    if (v >= p0 && v <= p1) {
      const t = p1 > p0 ? (v - p0) / (p1 - p0) : 0
      return lerpHex(c0, c1, t) as any
    }
  }
  return REMAIN_STOPS[REMAIN_STOPS.length - 1][1] as any
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function formatTime(isoOrTimestamp: string | number): string {
  const d =
    typeof isoOrTimestamp === "number"
      ? new Date(isoOrTimestamp)
      : new Date(isoOrTimestamp)
  if (Number.isNaN(d.getTime())) return "--:--"
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function formatNumber(v: number): string {
  return Number(v || 0).toLocaleString("en-US")
}
