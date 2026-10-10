import {
  Button,
  Circle,
  GeometryReader,
  HStack,
  Image,
  RoundedRectangle,
  SVG,
  Script,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "scripting"
import { RefreshWidgetIntent, SwitchQxModeIntent, SwitchQxPolicyIntent } from "./app_intents"
import { THEME, formatTime, remainColor } from "./theme"
import {
  DualQuotaData,
  FuelCardData,
  MediaNexusData,
  MetricBalanceData,
  QB_LOGO_IMAGE,
  QX_LOGO_IMAGE,
  QbittorrentData,
  QuantumultXData,
  VpnNodeData,
} from "./types"

// ── 品牌图标渲染（支持 SVG、UIImage、本地图片、SF Symbol）──
export function BrandHeaderIcon({
  iconName,
  iconColor,
  iconImage,
  iconPath,
  svgCode,
  size = 16,
}: {
  iconName?: string
  iconColor?: any
  iconImage?: any
  iconPath?: { light: string; dark: string } | string
  svgCode?: string
  size?: number
}) {
  if (svgCode) {
    return (
      <SVG
        code={svgCode}
        resizable={true}
        frame={{ width: size, height: size }}
      />
    )
  }
  if (iconImage) {
    return (
      <Image
        image={iconImage}
        resizable={true}
        frame={{ width: size, height: size }}
      />
    )
  }
  if (iconPath) {
    return (
      <Image
        filePath={iconPath}
        resizable={true}
        frame={{ width: size, height: size }}
      />
    )
  }
  return (
    <Image
      systemName={iconName || "circle.fill"}
      font={{ name: "system", size: size }}
      foregroundStyle={iconColor || THEME.blue}
    />
  )
}

// ── 统一轻量刷新按钮（圆角微胶囊质感，完美复刻原图）──
export function RefreshButton() {
  return (
    <Button intent={RefreshWidgetIntent(undefined)} buttonStyle="plain">
      <ZStack frame={{ width: 22, height: 22 }}>
        <Circle
          fill={{ light: "rgba(0,0,0,0.04)", dark: "rgba(255,255,255,0.08)" } as any}
        />
        <Circle
          stroke={{
            shapeStyle: { light: "rgba(0,0,0,0.06)", dark: "rgba(255,255,255,0.12)" } as any,
            strokeStyle: { lineWidth: 0.8 },
          }}
        />
        <Image
          systemName="arrow.triangle.2.circlepath"
          font={{ name: "system", size: 10.5 }}
          foregroundStyle={{ light: "#64748B", dark: "#94A3B8" } as any}
        />
      </ZStack>
    </Button>
  )
}

// ── 胶囊动态进度条 ──
export function ProgressBar({
  value,
  color,
  height = 4.5,
}: {
  value: number
  color?: any
  height?: number
}) {
  const v = Math.max(0, Math.min(100, value)) / 100
  const barColor = color || remainColor(value)
  const r = height / 2

  return (
    <ZStack alignment="leading" frame={{ maxWidth: "infinity", height }}>
      <RoundedRectangle
        fill={{ light: "#E2E8F0", dark: "#1E293B" } as any}
        cornerRadius={r}
        frame={{ maxWidth: "infinity", height }}
      />
      <GeometryReader>
        {(p: any) =>
          v > 0 ? (
            <RoundedRectangle
              fill={barColor}
              cornerRadius={r}
              frame={{ width: Math.max(height, Math.round(p.size.width * v)), height }}
            />
          ) : (
            <VStack />
          )
        }
      </GeometryReader>
    </ZStack>
  )
}

// ═════════════════════════════════════════════════════════════════
// 1. 中号媒体看板：Media Nexus 风格（精确像素级复刻原图）
// ═════════════════════════════════════════════════════════════════
export function MediaNexusCard({ data }: { data: MediaNexusData }) {
  const cTitle = { light: "#1D64E8", dark: "#3B82F6" } as any
  const cGreen = { light: "#10B981", dark: "#34D399" } as any
  const cBlue = { light: "#1D64E8", dark: "#3B82F6" } as any
  const cLabel = { light: "#64748B", dark: "#94A3B8" } as any
  const cText = { light: "#1E293B", dark: "#F1F5F9" } as any
  const cDim = { light: "#94A3B8", dark: "#64748B" } as any
  const cDivider = { light: "#CBD5E1", dark: "#334155" } as any
  const cFilm = { light: "#D97706", dark: "#FBBF24" } as any

  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ top: 15, bottom: 13, leading: 18, trailing: 18 }}
      widgetBackground={{ light: "#FFFFFF", dark: "#0F172A" } as any}
    >
      {/* 1. 顶部标题栏 */}
      <HStack spacing={7} alignment="center">
        <Text font={18} fontWeight="bold" foregroundStyle={cTitle}>
          {data.title}
        </Text>
        <Circle fill={cGreen} frame={{ width: 7, height: 7 }} />
        <Spacer />
        <Text font={11.5} fontWeight="regular" foregroundStyle={cLabel}>
          {data.statusText || "当前空闲"}
        </Text>
        <RefreshButton />
      </HStack>

      <Spacer minLength={10} />

      {/* 2. 核心数据网格：[左半区：靠左对齐] | 分割线 (~37%) | [右半区：均分撑满] */}
      <HStack alignment="center" spacing={0}>
        {/* 左半区：近7日入库（靠左贴齐标题） + 今日入库 */}
        <HStack alignment="center" spacing={18}>
          <VStack alignment="center" spacing={3}>
            <Text font={21} fontWeight="bold" foregroundStyle={cGreen} monospacedDigit lineLimit={1}>
              {`+${data.recent7Days}`}
            </Text>
            <Text font={10.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
              近7日入库
            </Text>
          </VStack>
          <VStack alignment="center" spacing={3}>
            <Text font={21} fontWeight="bold" foregroundStyle={cGreen} monospacedDigit lineLimit={1}>
              {`+${data.todayAdded}`}
            </Text>
            <Text font={10.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
              今日入库
            </Text>
          </VStack>
        </HStack>

        <Spacer minLength={16} />

        {/* 细纵向分割线（自然落在约 37% 黄金分割位置） */}
        <RoundedRectangle
          fill={cDivider}
          cornerRadius={0.5}
          frame={{ width: 1, height: 28 }}
        />

        <Spacer minLength={16} />

        {/* 右半区：电影 / 剧集 / 分集 往中间聚合，两边留有适度边距 */}
        <HStack alignment="center" spacing={0} frame={{ maxWidth: "infinity" }} padding={{ leading: 8, trailing: 8 }}>
          <VStack alignment="center" spacing={3}>
            <Text font={20} fontWeight="bold" foregroundStyle={cBlue} monospacedDigit lineLimit={1}>
              {data.movies.toLocaleString("en-US")}
            </Text>
            <Text font={10.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
              电影
            </Text>
          </VStack>
          <Spacer />
          <VStack alignment="center" spacing={3}>
            <Text font={20} fontWeight="bold" foregroundStyle={cBlue} monospacedDigit lineLimit={1}>
              {data.shows.toLocaleString("en-US")}
            </Text>
            <Text font={10.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
              剧集
            </Text>
          </VStack>
          <Spacer />
          <VStack alignment="center" spacing={3}>
            <Text font={20} fontWeight="bold" foregroundStyle={cBlue} monospacedDigit lineLimit={1}>
              {data.episodes.toLocaleString("en-US")}
            </Text>
            <Text font={10.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
              分集
            </Text>
          </VStack>
        </HStack>
      </HStack>

      <Spacer minLength={10} />

      {/* 3. 最近入库板块 */}
      <VStack alignment="leading" spacing={5}>
        <Text font={11} fontWeight="medium" foregroundStyle={cLabel}>
          最近入库
        </Text>
        {data.recentItems.slice(0, 2).map((item) => (
          <HStack key={item.id} spacing={6} alignment="center">
            <Text font={10.5} fontWeight="medium" foregroundStyle={cDim} monospacedDigit>
              {item.id}
            </Text>
            <Image
              systemName="film"
              font={{ name: "system", size: 10 }}
              foregroundStyle={cFilm}
            />
            <Text
              font={11}
              fontWeight="regular"
              foregroundStyle={cText}
              lineLimit={1}
            >
              {item.title}
            </Text>
            <Spacer />
            <Text font={10.5} fontWeight="regular" foregroundStyle={cDim} monospacedDigit>
              {item.year}
            </Text>
          </HStack>
        ))}
      </VStack>

      <Spacer minLength={8} />

      {/* 4. 底栏：左侧版本/Slogan · 右侧更新时间 */}
      <HStack spacing={6} alignment="center">
        <Text font={10} fontWeight="regular" foregroundStyle={cDim} lineLimit={1}>
          {data.footerTag}
        </Text>
        <Spacer />
        <Text font={10} fontWeight="regular" foregroundStyle={cDim} monospacedDigit>
          {`更新于 ${formatTime(data.updatedAt)}`}
        </Text>
      </HStack>
    </VStack>
  )
}

// ═════════════════════════════════════════════════════════════════
// 2. 小号大额度/余额卡片：DeepSeek / WorkBuddy / CPAMP 风格
// ═════════════════════════════════════════════════════════════════
export function MetricBalanceCard({ data }: { data: MetricBalanceData }) {
  const pColor = remainColor(data.progressPct)
  const isWorkBuddy = data.serviceId === "workbuddy"
  const isDeepSeek = data.serviceId === "deepseek"
  const isCpamp = data.serviceId === "cpamp"

  // 主数值颜色：WorkBuddy与DeepSeek原图均为绿色大字，CPAMP为深蓝大字
  const mainNumColor = isCpamp
    ? ({ light: "#4338CA", dark: "#6366F1" } as any)
    : THEME.green

  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ top: 14, bottom: 12, leading: 14, trailing: 14 }}
      widgetBackground={THEME.bg}
    >
      {/* 顶栏：字标或 图标+标题 + 纯轻量刷新图标 */}
      <HStack spacing={6} alignment="center" frame={{ height: 18 }}>
        {data.wordmarkImage && !data.iconImage ? (
          <Image
            image={data.wordmarkImage}
            resizable={true}
            frame={{ width: Math.round(19 * (248 / 57)), height: 19 }}
          />
        ) : (
          <HStack spacing={5} alignment="center">
            <BrandHeaderIcon
              iconName={data.iconName}
              iconColor={data.iconColor}
              iconImage={data.iconImage}
              svgCode={data.svgCode}
              size={isWorkBuddy ? 18 : 16}
            />
            {data.brandTitle ? (
              <Text
                font={13}
                fontWeight="bold"
                foregroundStyle={data.brandTitleColor || THEME.text}
                lineLimit={1}
                minScaleFactor={0.8}
                allowsTightening={true}
              >
                {data.brandTitle}
              </Text>
            ) : null}
          </HStack>
        )}
        <Spacer />
        <RefreshButton />
      </HStack>

      <Spacer minLength={7} />

      {/* 标签 */}
      <Text font={10.5} fontWeight="medium" foregroundStyle={THEME.dim}>
        {data.mainLabel}
      </Text>

      {/* 主大数值 */}
      <HStack alignment="lastTextBaseline" spacing={2}>
        {data.prefix ? (
          <Text font={19} fontWeight="bold" foregroundStyle={mainNumColor}>
            {data.prefix}
          </Text>
        ) : null}
        <Text
          font={27}
          fontWeight="bold"
          foregroundStyle={mainNumColor}
          monospacedDigit
          lineLimit={1}
        >
          {data.mainValue}
        </Text>
        {isCpamp && (
          <Text
            font={14}
            fontWeight="bold"
            foregroundStyle={THEME.orange}
            monospacedDigit
          >
            {` ${data.costStr || "$85.06"}`}
          </Text>
        )}
      </HStack>

      <Spacer minLength={7} />

      {/* 进度条 + 右侧百分比 (单行并排对齐，绝不错行) */}
      <HStack spacing={6} alignment="center">
        <ProgressBar value={data.progressPct} color={pColor} height={4.5} />
        <Text font={10.5} fontWeight="bold" foregroundStyle={pColor} monospacedDigit>
          {`${Math.round(data.progressPct)}%`}
        </Text>
      </HStack>

      <Spacer minLength={7} />

      {/* 中间统计行 */}
      <HStack spacing={6} alignment="center">
        {isWorkBuddy ? (
          <>
            <HStack spacing={3} alignment="center">
              <Text font={10} foregroundStyle={THEME.dim} lineLimit={1}>已签</Text>
              <Text font={10.5} fontWeight="bold" foregroundStyle={THEME.green} monospacedDigit lineLimit={1}>
                {data.subValue1}
              </Text>
            </HStack>
            <Spacer />
            <HStack spacing={3} alignment="center">
              <Text font={10} foregroundStyle={THEME.dim} lineLimit={1}>已用</Text>
              <Text font={10.5} fontWeight="bold" foregroundStyle={THEME.orange} monospacedDigit lineLimit={1}>
                {data.subValue2}
              </Text>
            </HStack>
          </>
        ) : isDeepSeek ? (
          <HStack spacing={0} alignment="center" frame={{ maxWidth: "infinity" }}>
            <HStack spacing={3} alignment="center">
              <Text font={9.5} foregroundStyle={THEME.dim} lineLimit={1}>
                {data.subLabel1 || "状态"}
              </Text>
              <Text font={10} fontWeight="medium" foregroundStyle={THEME.green} lineLimit={1}>
                {data.subValue1 || "正常"}
              </Text>
            </HStack>
            <Spacer />
            <HStack spacing={3} alignment="center">
              <Text font={9.5} foregroundStyle={THEME.dim} lineLimit={1}>
                {data.subLabel2 || "近7日消费"}
              </Text>
              <Text
                font={10}
                fontWeight="semibold"
                foregroundStyle={THEME.text}
                monospacedDigit
                lineLimit={1}
                minScaleFactor={0.75}
              >
                {data.subValue2}
              </Text>
            </HStack>
          </HStack>
        ) : (
          <>
            <HStack spacing={3} alignment="center">
              <Text font={10} foregroundStyle={THEME.dim} lineLimit={1}>成功</Text>
              <Text font={10.5} fontWeight="bold" foregroundStyle={THEME.dim} monospacedDigit lineLimit={1}>
                {data.subValue1 || "893"}
              </Text>
            </HStack>
            <Spacer />
            <HStack spacing={3} alignment="center">
              <Text font={10} foregroundStyle={THEME.dim} lineLimit={1}>失败</Text>
              <Text font={10.5} fontWeight="bold" foregroundStyle={THEME.red} monospacedDigit lineLimit={1}>
                {data.subValue2 || "63"}
              </Text>
            </HStack>
          </>
        )}
      </HStack>

      <Spacer minLength={0} />

      {/* 底栏 */}
      <HStack spacing={2} alignment="center" frame={{ maxWidth: "infinity" }}>
        <Text
          font={8.5}
          fontWeight={isDeepSeek ? "medium" : "regular"}
          foregroundStyle={isDeepSeek ? THEME.green : THEME.dim}
          lineLimit={1}
          minScaleFactor={0.75}
        >
          {data.footerLeft}
        </Text>
        <Spacer minLength={4} />
        <Text
          font={8.5}
          foregroundStyle={THEME.dim}
          monospacedDigit
          lineLimit={1}
          minScaleFactor={0.8}
        >
          {`更新于 ${formatTime(data.updatedAt)}`}
        </Text>
      </HStack>
    </VStack>
  )
}

// ═════════════════════════════════════════════════════════════════
// 3. 小号双周期配额卡片：Codex / Antigravity 风格（彻底根治小字错行）
// ═════════════════════════════════════════════════════════════════
export function DualQuotaCard({ data }: { data: DualQuotaData }) {
  const c1 = remainColor(data.item1.pct)
  const c2 = remainColor(data.item2.pct)
  const isAntigravity = data.serviceId === "antigravity"

  // Antigravity 统计项颜色
  const val1Num = parseInt(data.stat1.value) || 0
  const val2Num = parseInt(data.stat2.value) || 0
  const cStat1 = val1Num > 0 ? THEME.green : THEME.red
  const cStat2 = val2Num > 0 ? THEME.green : THEME.red

  // 最紧百分比颜色
  const tightNum = parseInt(data.footerStatus.replace(/[^0-9]/g, "")) || 0
  const cTight = tightNum > 0 ? THEME.green : THEME.red

  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ top: 14, bottom: 12, leading: 14, trailing: 14 }}
      widgetBackground={THEME.bg}
    >
      {/* 顶栏：图标 + 标题 + 纯轻量刷新图标 */}
      <HStack spacing={6} alignment="center" frame={{ height: 18 }}>
        <BrandHeaderIcon
          iconName={data.iconName}
          iconColor={data.iconColor}
          iconImage={data.iconImage}
          svgCode={data.svgCode}
          size={16}
        />
        <Text font={13.5} fontWeight="bold" foregroundStyle={THEME.text}>
          {data.brandTitle}
        </Text>
        <Spacer />
        <RefreshButton />
      </HStack>

      <Spacer minLength={6} />

      {/* 第 1 段额度：上行纯文字标签+倒计时靠右对齐，下行进度条+百分比 */}
      <VStack alignment="leading" spacing={3}>
        <HStack spacing={5} alignment="center">
          <Text font={10.5} fontWeight="medium" foregroundStyle={THEME.dim} lineLimit={1}>
            {data.item1.label}
          </Text>
          <Spacer />
          <Text font={9.5} foregroundStyle={THEME.dim} monospacedDigit lineLimit={1}>
            {data.item1.timer.replace(/后?刷新$/, "").trim()}
          </Text>
        </HStack>
        <HStack spacing={6} alignment="center">
          <ProgressBar value={data.item1.pct} color={c1} height={4.5} />
          <Text font={10.5} fontWeight="bold" foregroundStyle={c1} monospacedDigit lineLimit={1}>
            {`${Math.round(data.item1.pct)}%`}
          </Text>
        </HStack>
      </VStack>

      <Spacer minLength={6} />

      {/* 第 2 段额度：上行纯文字标签+倒计时靠右对齐，下行进度条+百分比 */}
      <VStack alignment="leading" spacing={3}>
        <HStack spacing={5} alignment="center">
          <Text font={10.5} fontWeight="medium" foregroundStyle={THEME.dim} lineLimit={1}>
            {data.item2.label}
          </Text>
          <Spacer />
          <Text font={9.5} foregroundStyle={THEME.dim} monospacedDigit lineLimit={1}>
            {data.item2.timer.replace(/后?刷新$/, "").trim()}
          </Text>
        </HStack>
        <HStack spacing={6} alignment="center">
          <ProgressBar value={data.item2.pct} color={c2} height={4.5} />
          <Text font={10.5} fontWeight="bold" foregroundStyle={c2} monospacedDigit lineLimit={1}>
            {`${Math.round(data.item2.pct)}%`}
          </Text>
        </HStack>
      </VStack>

      <Spacer minLength={6} />

      {/* 底部指标项：Antigravity 与 Codex 精确分流 */}
      {isAntigravity ? (
        <HStack alignment="center" frame={{ maxWidth: "infinity" }}>
          {/* 左侧：Gem 周 % */}
          <HStack spacing={4} alignment="center">
            <Text font={9} foregroundStyle={THEME.dim} lineLimit={1} minScaleFactor={0.8}>
              {data.stat1.label}
            </Text>
            <Text font={9.5} fontWeight="bold" foregroundStyle={cStat1} monospacedDigit lineLimit={1}>
              {data.stat1.value}
            </Text>
          </HStack>
          <Spacer />
          {/* 右侧：C/G 周 % */}
          <HStack spacing={4} alignment="center">
            <Text font={9} foregroundStyle={THEME.dim} lineLimit={1} minScaleFactor={0.8}>
              {data.stat2.label}
            </Text>
            <Text font={9.5} fontWeight="bold" foregroundStyle={cStat2} monospacedDigit lineLimit={1}>
              {data.stat2.value}
            </Text>
          </HStack>
        </HStack>
      ) : (
        <HStack spacing={3} alignment="center">
          <Text font={9} foregroundStyle={THEME.dim} lineLimit={1}>
            {data.stat1.label}
          </Text>
          <Text font={9.5} fontWeight="bold" foregroundStyle={THEME.text} monospacedDigit lineLimit={1}>
            {data.stat1.value.replace(/[^0-9]/g, "") || data.stat1.value}
          </Text>
          <Text font={9} foregroundStyle={THEME.dim} lineLimit={1}>
            次
          </Text>
          <Spacer />
        </HStack>
      )}

      <Spacer minLength={0} />

      {/* 底栏 */}
      <HStack spacing={4} alignment="center">
        {isAntigravity ? (
          <HStack spacing={3} alignment="center">
            <Text font={9} foregroundStyle={THEME.dim} lineLimit={1}>最紧</Text>
            <Text font={9} fontWeight="bold" foregroundStyle={cTight} monospacedDigit lineLimit={1}>
              {data.footerStatus.replace(/最紧|最低/g, "").trim() || "0%"}
            </Text>
          </HStack>
        ) : (
          <Text font={9} foregroundStyle={THEME.dim} lineLimit={1}>
            {data.footerStatus}
          </Text>
        )}
        <Spacer />
        <Text font={9} foregroundStyle={THEME.dim} monospacedDigit lineLimit={1}>
          {`更新于 ${formatTime(data.updatedAt)}`}
        </Text>
      </HStack>
    </VStack>
  )
}

// ═════════════════════════════════════════════════════════════════
// 4. 小号网络与出口看板：VPN 节点风格（复刻原图右下角）
// ═════════════════════════════════════════════════════════════════
export function VpnNodeCard({ data }: { data: VpnNodeData }) {
  const cGreen = { light: "#10B981", dark: "#34D399" } as any
  const cIp = { light: "#1D4ED8", dark: "#60A5FA" } as any

  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ top: 14, bottom: 12, leading: 14, trailing: 14 }}
      widgetBackground={THEME.bg}
    >
      {/* 顶栏：广播图标 + 状态标题 + 刷新 */}
      <HStack spacing={6} alignment="center" frame={{ height: 18 }}>
        <Image
          systemName="antenna.radiowaves.left.and.right"
          font={{ name: "system", size: 14 }}
          foregroundStyle={cGreen}
        />
        <Text font={13.5} fontWeight="bold" foregroundStyle={cGreen}>
          {data.statusTitle}
        </Text>
        <Spacer />
        <RefreshButton />
      </HStack>

      <Spacer minLength={8} />

      {/* 主 IP 地址 */}
      <Text
        font={19}
        fontWeight="bold"
        foregroundStyle={cIp}
        monospacedDigit
        lineLimit={1}
      >
        {data.ip}
      </Text>

      <Spacer minLength={6} />

      {/* 归属地与 ISP 服务商 */}
      <VStack alignment="leading" spacing={2}>
        <Text font={12} fontWeight="bold" foregroundStyle={THEME.text} lineLimit={1}>
          {data.location}
        </Text>
        <Text font={10} foregroundStyle={THEME.dim} lineLimit={1}>
          {data.isp}
        </Text>
      </VStack>

      <Spacer minLength={6} />

      {/* 风险条 */}
      <HStack spacing={6} alignment="center">
        <Text font={10} foregroundStyle={THEME.dim}>
          风险
        </Text>
        <ProgressBar value={data.riskPct} color={THEME.orange} height={4.5} />
        <Text font={10.5} fontWeight="bold" foregroundStyle={THEME.orange} monospacedDigit>
          {`${Math.round(data.riskPct)}%`}
        </Text>
      </HStack>

      <Spacer minLength={0} />

      {/* 底栏 */}
      <HStack spacing={8} alignment="center">
        <Text font={9.5} fontWeight="medium" foregroundStyle={cGreen} lineLimit={1}>
          {data.tag1}
        </Text>
        <Text font={9.5} foregroundStyle={THEME.dim} lineLimit={1}>
          {data.tag2}
        </Text>
        <Spacer />
        <Text font={9.5} foregroundStyle={THEME.dim} monospacedDigit lineLimit={1}>
          {`更新于 ${formatTime(data.updatedAt)}`}
        </Text>
      </HStack>
    </VStack>
  )
}

// ============================================================
// 7. 今日油价小组件（小号：白底 Shell 贝壳高光小组件，1:1 精确复刻）
// ============================================================
export function FuelPriceSmallCard({ data }: { data: FuelCardData }) {
  const logoPath = `${Script.directory}/assets/shell_logo.png`
  const hasLogoFile = FileManager.existsSync(logoPath)

  return (
    <ZStack
      alignment="topLeading"
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={{
        light: "#FFFFFF",
        dark: "#161719",
      }}
    >
      {/* 底层左上角贝壳水印：放大并超出边框，更靠左上偏置，清爽淡雅防重叠 */}
      <HStack alignment="top">
        {hasLogoFile ? (
          <Image
            filePath={logoPath}
            resizable={true}
            scaleToFit={true}
            opacity={0.18}
            frame={{ width: 150, height: 150 }}
            offset={{ x: -40, y: -30 }}
          />
        ) : (
          <Image
            systemName="fuelpump.fill"
            font={85}
            opacity={0.09}
            foregroundStyle="#F59E0B"
            offset={{ x: -25, y: -20 }}
          />
        )}
        <Spacer />
      </HStack>

      {/* 前景层：自然靠右，保留合适内边距避免超出边界 */}
      <HStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        <Spacer />
        <VStack
          alignment="trailing"
          spacing={0}
          padding={{ top: 12, bottom: 12, trailing: 10 }}
        >
          {/* 顶部标签 + 油品名 */}
          <HStack alignment="center" spacing={3}>
            <HStack
              alignment="center"
              padding={{ top: 1.5, bottom: 1.5, leading: 4, trailing: 4 }}
              background="rgba(245, 158, 11, 0.16)"
              clipShape={{ type: "rect", cornerRadius: 3.5 }}
            >
              <Text
                font="caption2"
                fontWeight="bold"
                foregroundStyle="#D97706"
              >
                OIL
              </Text>
            </HStack>
            <Text
              font="title3"
              fontWeight="heavy"
              foregroundStyle={{
                light: "#000000",
                dark: "#FFFFFF",
              }}
            >
              {data.oilName}
            </Text>
          </HStack>

          {/* 省份油品全称 */}
          <Text
            font="caption2"
            fontWeight="medium"
            foregroundStyle={{
              light: "#8E8E93",
              dark: "rgba(255, 255, 255, 0.55)",
            }}
            padding={{ top: 1.5 }}
          >
            {data.subTitle}
          </Text>

          <Spacer />

          {/* 调价预测 */}
          <Text
            font="footnote"
            fontWeight="bold"
            foregroundStyle={data.trendColor as any}
          >
            {data.smallTrend}
          </Text>

          {/* 现价大字 */}
          <HStack alignment="lastTextBaseline" spacing={1.5} padding={{ top: 1 }}>
            <Text
              font="subheadline"
              fontWeight="bold"
              foregroundStyle={{
                light: "#000000",
                dark: "#FFFFFF",
              }}
            >
              ¥
            </Text>
            <Text
              font="title"
              fontWeight="heavy"
              foregroundStyle={{
                light: "#000000",
                dark: "#FFFFFF",
              }}
            >
              {data.focusPrice}
            </Text>
          </HStack>

          <Spacer />

          {/* 调价日期 */}
          <Text
            font="caption2"
            fontWeight="medium"
            foregroundStyle={{
              light: "#8E8E93",
              dark: "rgba(255, 255, 255, 0.45)",
            }}
          >
            {data.cleanDateText}
          </Text>
        </VStack>
      </HStack>
    </ZStack>
  )
}

// ============================================================
// 8. 今日油价中号小组件（风格一：4联卡片极简行情，双尺寸自适应）
// ============================================================
export function FuelPriceMediumCard({ data }: { data: FuelCardData }) {
  const cardItems = [
    {
      name: "92 号",
      price: data.prices?.oil92 || "--",
      textColor: "#E5933A",
      tagBg: "rgba(229, 147, 58, 0.18)",
    },
    {
      name: "95 号",
      price: data.prices?.oil95 || "--",
      textColor: "#E6674E",
      tagBg: "rgba(230, 103, 78, 0.18)",
    },
    {
      name: "98 号",
      price: data.prices?.oil98 || "--",
      textColor: "#E05268",
      tagBg: "rgba(224, 82, 104, 0.18)",
    },
    {
      name: "柴油",
      price: data.prices?.oil0 || "--",
      textColor: "#34C759",
      tagBg: "rgba(52, 199, 89, 0.18)",
    },
  ]

  const mediumForecast = data.mediumForecast || `${data.cleanDateText} ${data.smallTrend}`

  return (
    <VStack
      alignment="leading"
      padding={{ top: 12, bottom: 10, leading: 6, trailing: 6 }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={{
        light: "#FFFFFF",
        dark: "#161719",
      }}
    >
      {/* 顶部 Header：左侧省份靠最左，右侧时间靠最右 */}
      <HStack alignment="center" padding={{ leading: 4, trailing: 4 }}>
        <HStack alignment="center" spacing={4}>
          <Image
            systemName="fuelpump.fill"
            font="caption"
            foregroundStyle="#F59E0B"
          />
          <Text
            font="caption"
            fontWeight="bold"
            foregroundStyle={{
              light: "#1C1C1E",
              dark: "#FFFFFF",
            }}
          >
            {data.province}实时油价
          </Text>
        </HStack>
        <Spacer />
        <Text
          font="caption2"
          fontWeight="medium"
          foregroundStyle={{
            light: "rgba(60, 60, 67, 0.85)",
            dark: "rgba(255, 255, 255, 0.85)",
          }}
        >
          {mediumForecast}
        </Text>
      </HStack>

      <Spacer />

      {/* 中部 4 联卡片 */}
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        {cardItems.map((item) => (
          <VStack
            key={item.name}
            alignment="center"
            spacing={6}
            frame={{ maxWidth: "infinity" }}
          >
            {/* 上层：油号色块 */}
            <HStack
              alignment="center"
              padding={{ top: 2.5, bottom: 2.5, leading: 7, trailing: 7 }}
              background={item.tagBg as any}
              clipShape={{ type: "rect", cornerRadius: 5 }}
            >
              <Text
                font="caption2"
                fontWeight="bold"
                foregroundStyle={item.textColor as any}
                lineLimit={1}
                allowsTightening={true}
              >
                {item.name}
              </Text>
            </HStack>

            {/* 下层：价格底块 */}
            <HStack
              alignment="center"
              padding={{ top: 6, bottom: 6, leading: 4, trailing: 4 }}
              background={{
                light: "rgba(0, 0, 0, 0.05)",
                dark: "rgba(255, 255, 255, 0.09)",
              }}
              clipShape={{ type: "rect", cornerRadius: 8 }}
              frame={{ maxWidth: "infinity" }}
            >
              <Spacer />
              <Text
                font="headline"
                fontWeight="bold"
                foregroundStyle={{
                  light: "#000000",
                  dark: "#FFFFFF",
                }}
                lineLimit={1}
                allowsTightening={true}
                minScaleFactor={0.8}
              >
                {item.price}
              </Text>
              <Spacer />
            </HStack>
          </VStack>
        ))}
      </HStack>

      <Spacer />

      {/* 底部 Footer */}
      <HStack alignment="center" padding={{ leading: 4, trailing: 4 }}>
        <Text
          font="caption2"
          fontWeight="regular"
          foregroundStyle={{
            light: "rgba(60, 60, 67, 0.45)",
            dark: "rgba(255, 255, 255, 0.45)",
          }}
        >
          {formatTime(data.updatedAt)} 更新
        </Text>
        <Spacer />
        <Text
          font="caption2"
          fontWeight="regular"
          foregroundStyle={{
            light: "rgba(60, 60, 67, 0.45)",
            dark: "rgba(255, 255, 255, 0.45)",
          }}
        >
          元/升
        </Text>
      </HStack>
    </VStack>
  )
}

// 统一根据尺寸自适应的 FuelPriceCard
export function FuelPriceCard({ data, family }: { data: FuelCardData; family?: string }) {
  if (family === "systemMedium" || family === "systemLarge") {
    return <FuelPriceMediumCard data={data} />
  }
  return <FuelPriceSmallCard data={data} />
}

// ============================================================
// 9. qBittorrent 小号看板（传输速率、做种/活跃、空间）
// ============================================================
export function QbittorrentSmallCard({ data }: { data: QbittorrentData }) {
  const isOnline = data.connectionStatus !== "disconnected"
  const cSpeed = { light: "#2563EB", dark: "#3B82F6" } as any
  const cUp = { light: "#059669", dark: "#10B981" } as any

  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ top: 13, bottom: 11, leading: 13, trailing: 13 }}
      widgetBackground={THEME.bg}
    >
      {/* 顶栏：图标 + 标题 + 运行状态圆点 + 刷新按钮 */}
      <HStack spacing={5} alignment="center" frame={{ height: 18 }}>
        <BrandHeaderIcon iconImage={QB_LOGO_IMAGE} size={15} />
        <Text font={12} fontWeight="bold" foregroundStyle={THEME.text} lineLimit={1}>
          qBittorrent
        </Text>
        <Circle
          fill={isOnline ? "#10B981" : "#EF4444"}
          frame={{ width: 5, height: 5 }}
        />
        <Spacer />
        <RefreshButton />
      </HStack>

      <Spacer minLength={6} />

      {/* 主下载速度大字 */}
      <VStack alignment="leading" spacing={1}>
        <HStack spacing={3} alignment="center">
          <Image
            systemName="arrow.down"
            font={{ name: "system", size: 10 }}
            fontWeight="bold"
            foregroundStyle={cSpeed}
          />
          <Text font={10} fontWeight="medium" foregroundStyle={THEME.dim}>
            下载速度
          </Text>
        </HStack>
        <Text
          font={23}
          fontWeight="bold"
          foregroundStyle={cSpeed}
          monospacedDigit
          lineLimit={1}
        >
          {data.dlSpeed}
        </Text>
      </VStack>

      <Spacer minLength={5} />

      {/* 上传速度 + 做种数行 */}
      <HStack spacing={6} alignment="center">
        <HStack spacing={3} alignment="center">
          <Image
            systemName="arrow.up"
            font={{ name: "system", size: 9.5 }}
            fontWeight="bold"
            foregroundStyle={cUp}
          />
          <Text
            font={11}
            fontWeight="bold"
            foregroundStyle={cUp}
            monospacedDigit
            lineLimit={1}
          >
            {data.upSpeed}
          </Text>
        </HStack>
        <Spacer />
        <HStack spacing={3} alignment="center">
          <Text font={9.5} foregroundStyle={THEME.dim}>
            做种
          </Text>
          <Text
            font={10.5}
            fontWeight="bold"
            foregroundStyle={THEME.text}
            monospacedDigit
            lineLimit={1}
          >
            {data.seedingCount}
          </Text>
        </HStack>
      </HStack>

      <Spacer minLength={5} />

      {/* 活动任务进度与剩余空间行 */}
      <HStack spacing={6} alignment="center">
        <HStack spacing={3} alignment="center">
          <Text font={9.5} foregroundStyle={THEME.dim}>
            下载
          </Text>
          <Text
            font={10.5}
            fontWeight="bold"
            foregroundStyle={cSpeed}
            monospacedDigit
            lineLimit={1}
          >
            {data.activeCount}
          </Text>
          <Text font={9.5} foregroundStyle={THEME.dim}>
            个
          </Text>
        </HStack>
        <Spacer />
        <HStack spacing={3} alignment="center">
          <Text font={9.5} foregroundStyle={THEME.dim}>
            余量
          </Text>
          <Text
            font={10}
            fontWeight="medium"
            foregroundStyle={THEME.dim}
            monospacedDigit
            lineLimit={1}
          >
            {data.freeSpace}
          </Text>
        </HStack>
      </HStack>

      <Spacer minLength={0} />

      {/* 底栏 */}
      <HStack spacing={4} alignment="center">
        <Text font={9} foregroundStyle={THEME.dim} lineLimit={1}>
          {`分享率 ${data.shareRatio}`}
        </Text>
        <Spacer />
        <Text font={8.5} foregroundStyle={THEME.dim} monospacedDigit lineLimit={1}>
          {`更新于 ${formatTime(data.updatedAt)}`}
        </Text>
      </HStack>
    </VStack>
  )
}

// ============================================================
// 10. qBittorrent 中号看板（双列网格、累计上传下载、磁盘余量）
// ============================================================
export function QbittorrentMediumCard({ data }: { data: QbittorrentData }) {
  const isOnline = data.connectionStatus !== "disconnected"
  const cTitle = { light: "#1E293B", dark: "#F8FAFC" } as any
  const cLabel = { light: "#64748B", dark: "#94A3B8" } as any
  const cDl = { light: "#2563EB", dark: "#3B82F6" } as any
  const cUp = { light: "#059669", dark: "#10B981" } as any
  const cDivider = { light: "rgba(0,0,0,0.08)", dark: "rgba(255,255,255,0.12)" } as any

  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ top: 15, bottom: 13, leading: 18, trailing: 18 }}
      widgetBackground={{ light: "#FFFFFF", dark: "#0F172A" } as any}
    >
      {/* 1. 顶部标题栏 */}
      <HStack spacing={7} alignment="center">
        <BrandHeaderIcon iconImage={QB_LOGO_IMAGE} size={18} />
        <Text font={16} fontWeight="bold" foregroundStyle={cTitle}>
          qBittorrent
        </Text>
        <Circle
          fill={isOnline ? "#10B981" : "#EF4444"}
          frame={{ width: 6, height: 6 }}
        />
        <Spacer />
        <Text font={11.5} fontWeight="regular" foregroundStyle={cLabel}>
          {data.statusText}
        </Text>
        <RefreshButton />
      </HStack>

      <Spacer minLength={10} />

      {/* 2. 核心数据网格：[左半区：实时下载 & 上传] | 分割线 | [右半区：任务数与磁盘] */}
      <HStack alignment="center" spacing={0}>
        {/* 左半区：实时下行 + 实时上行 */}
        <HStack alignment="center" spacing={18}>
          <VStack alignment="center" spacing={3}>
            <HStack spacing={2} alignment="center">
              <Image
                systemName="arrow.down"
                font={{ name: "system", size: 11 }}
                fontWeight="bold"
                foregroundStyle={cDl}
              />
              <Text font={18} fontWeight="bold" foregroundStyle={cDl} monospacedDigit lineLimit={1}>
                {data.dlSpeed}
              </Text>
            </HStack>
            <Text font={10.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
              下载速度
            </Text>
          </VStack>

          <VStack alignment="center" spacing={3}>
            <HStack spacing={2} alignment="center">
              <Image
                systemName="arrow.up"
                font={{ name: "system", size: 11 }}
                fontWeight="bold"
                foregroundStyle={cUp}
              />
              <Text font={18} fontWeight="bold" foregroundStyle={cUp} monospacedDigit lineLimit={1}>
                {data.upSpeed}
              </Text>
            </HStack>
            <Text font={10.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
              上传速度
            </Text>
          </VStack>
        </HStack>

        <Spacer minLength={16} />

        {/* 细纵向分割线 */}
        <RoundedRectangle
          fill={cDivider}
          cornerRadius={0.5}
          frame={{ width: 1, height: 28 }}
        />

        <Spacer minLength={16} />

        {/* 右半区：下载中 / 做种中 / 剩余空间 */}
        <HStack alignment="center" spacing={0} frame={{ maxWidth: "infinity" }} padding={{ leading: 6, trailing: 6 }}>
          <VStack alignment="center" spacing={3}>
            <Text font={19} fontWeight="bold" foregroundStyle={cDl} monospacedDigit lineLimit={1}>
              {data.activeCount}
            </Text>
            <Text font={10.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
              下载中
            </Text>
          </VStack>
          <Spacer />
          <VStack alignment="center" spacing={3}>
            <Text font={19} fontWeight="bold" foregroundStyle={cUp} monospacedDigit lineLimit={1}>
              {data.seedingCount}
            </Text>
            <Text font={10.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
              做种中
            </Text>
          </VStack>
          <Spacer />
          <VStack alignment="center" spacing={3}>
            <Text
              font={17}
              fontWeight="bold"
              foregroundStyle={cTitle}
              monospacedDigit
              lineLimit={1}
              minScaleFactor={0.65}
              allowsTightening={true}
              fixedSize={{ horizontal: true, vertical: false }}
            >
              {data.freeSpace}
            </Text>
            <Text font={10.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
              磁盘余量
            </Text>
          </VStack>
        </HStack>
      </HStack>

      <Spacer minLength={10} />

      {/* 3. 统计底栏：累计下载、累计上传、全局分享率 */}
      <HStack spacing={12} alignment="center" padding={{ leading: 2, trailing: 2 }}>
        <HStack spacing={4} alignment="center">
          <Text font={11} foregroundStyle={cLabel}>累计下载:</Text>
          <Text font={11} fontWeight="bold" foregroundStyle={cTitle} monospacedDigit>{data.allTimeDl}</Text>
        </HStack>
        <HStack spacing={4} alignment="center">
          <Text font={11} foregroundStyle={cLabel}>累计上传:</Text>
          <Text font={11} fontWeight="bold" foregroundStyle={cTitle} monospacedDigit>{data.allTimeUl}</Text>
        </HStack>
        <Spacer />
        <HStack spacing={4} alignment="center">
          <Text font={11} foregroundStyle={cLabel}>分享率:</Text>
          <Text font={11} fontWeight="bold" foregroundStyle={cUp} monospacedDigit>{data.shareRatio}</Text>
        </HStack>
      </HStack>

      <Spacer minLength={8} />

      {/* 4. 底栏：左侧状态 · 右侧更新时间 */}
      <HStack spacing={6} alignment="center">
        <Text font={10} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
          {`总任务 ${data.totalCount} 个 · ${data.statusText}`}
        </Text>
        <Spacer />
        <Text font={10} fontWeight="regular" foregroundStyle={cLabel} monospacedDigit>
          {`更新于 ${formatTime(data.updatedAt)}`}
        </Text>
      </HStack>
    </VStack>
  )
}

// 统一根据尺寸自适应的 QbittorrentCard
export function QbittorrentCard({ data, family }: { data: QbittorrentData; family?: string }) {
  if (family === "systemMedium" || family === "systemLarge") {
    return <QbittorrentMediumCard data={data} />
  }
  return <QbittorrentSmallCard data={data} />
}

// ============================================================
// 11. Quantumult X 小号看板（方案三：桌面点击切模式/切节点 + 流量监控）
// ============================================================
export function QuantumultXSmallCard({ data }: { data: QuantumultXData }) {
  const pColor = remainColor(data.remainPct)
  const modeColor =
    data.runningMode === "all_proxy"
      ? ({ light: "#7C3AED", dark: "#A78BFA" } as any)
      : data.runningMode === "all_direct"
      ? ({ light: "#059669", dark: "#34D399" } as any)
      : ({ light: "#2563EB", dark: "#60A5FA" } as any)

  const modeBg =
    data.runningMode === "all_proxy"
      ? ({ light: "rgba(124,58,237,0.10)", dark: "rgba(167,139,250,0.16)" } as any)
      : data.runningMode === "all_direct"
      ? ({ light: "rgba(5,150,105,0.10)", dark: "rgba(52,211,153,0.16)" } as any)
      : ({ light: "rgba(37,99,235,0.10)", dark: "rgba(96,165,250,0.16)" } as any)

  const cRowBg = { light: "rgba(15,23,42,0.035)", dark: "rgba(255,255,255,0.06)" } as any
  const topPolicies = (data.policies || []).slice(0, 2)

  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ top: 13, bottom: 11, leading: 13, trailing: 13 }}
      widgetBackground={THEME.bg}
    >
      {/* 1. 顶栏：QX 图标 + 标题 + 在线绿点 + 刷新按钮 */}
      <HStack spacing={4} alignment="center" frame={{ height: 18 }}>
        <BrandHeaderIcon iconImage={QX_LOGO_IMAGE} size={15} />
        <Text
          font={11.5}
          fontWeight="bold"
          foregroundStyle={THEME.text}
          lineLimit={1}
          minScaleFactor={0.8}
          allowsTightening={true}
        >
          Quantumult X
        </Text>
        <Circle fill="#10B981" frame={{ width: 5, height: 5 }} />
        <Spacer minLength={2} />
        <RefreshButton />
      </HStack>

      <Spacer minLength={6} />

      {/* 2. 可点击切换运行模式胶囊 + 实时延迟 */}
      <HStack spacing={6} alignment="center">
        <Button intent={SwitchQxModeIntent(undefined)} buttonStyle="plain">
          <HStack
            spacing={3.5}
            alignment="center"
            padding={{ top: 3, bottom: 3, leading: 7, trailing: 7 }}
            background={modeBg}
            clipShape={{ type: "rect", cornerRadius: 6 }}
            fixedSize={{ horizontal: true, vertical: false }}
          >
            <Image
              systemName={
                data.runningMode === "all_proxy"
                  ? "globe"
                  : data.runningMode === "all_direct"
                  ? "bolt.horizontal.fill"
                  : "arrow.triangle.branch"
              }
              font={{ name: "system", size: 9.5 }}
              foregroundStyle={modeColor}
            />
            <Text font={10} fontWeight="bold" foregroundStyle={modeColor} lineLimit={1}>
              {data.runningModeLabel}
            </Text>
            <Image
              systemName="arrow.triangle.2.circlepath"
              font={{ name: "system", size: 8.5 }}
              foregroundStyle={modeColor}
            />
          </HStack>
        </Button>
        <Spacer minLength={2} />
        <Text
          font={10}
          fontWeight="bold"
          foregroundStyle={THEME.green}
          monospacedDigit
          lineLimit={1}
          minScaleFactor={0.75}
          fixedSize={{ horizontal: true, vertical: false }}
        >
          {data.latencyMs}
        </Text>
      </HStack>

      <Spacer minLength={5} />

      {/* 3. 核心策略组可点击切换列表（前 2 组） */}
      <VStack alignment="leading" spacing={4}>
        {topPolicies.map((p) => (
          <Button key={p.id} intent={SwitchQxPolicyIntent(p.id)} buttonStyle="plain">
            <HStack
              spacing={4}
              alignment="center"
              padding={{ top: 3.5, bottom: 3.5, leading: 6, trailing: 6 }}
              background={cRowBg}
              clipShape={{ type: "rect", cornerRadius: 6 }}
              frame={{ maxWidth: "infinity" }}
            >
              <Text font={9.5} fontWeight="medium" foregroundStyle={THEME.dim} lineLimit={1}>
                {p.label.replace(/选择|策略|组$/g, "")}
              </Text>
              <Spacer minLength={4} />
              <Text
                font={10}
                fontWeight="bold"
                foregroundStyle={THEME.text}
                lineLimit={1}
                minScaleFactor={0.8}
              >
                {p.selected}
              </Text>
              <Image
                systemName="chevron.right"
                font={{ name: "system", size: 8 }}
                foregroundStyle={THEME.dim}
              />
            </HStack>
          </Button>
        ))}
      </VStack>

      <Spacer minLength={6} />

      {/* 4. 机场订阅剩余流量进度条 */}
      <HStack spacing={6} alignment="center">
        <ProgressBar value={data.remainPct} color={pColor} height={4.5} />
        <Text font={10} fontWeight="bold" foregroundStyle={pColor} monospacedDigit lineLimit={1}>
          {`${Math.round(data.remainPct)}%`}
        </Text>
      </HStack>

      <Spacer minLength={0} />

      {/* 5. 底栏：剩余流量 · 更新时间 */}
      <HStack spacing={4} alignment="center">
        <Text font={8.5} foregroundStyle={THEME.dim} lineLimit={1}>
          {`余 ${data.remainGb}`}
        </Text>
        <Spacer />
        <Text font={8.5} foregroundStyle={THEME.dim} monospacedDigit lineLimit={1}>
          {`更新于 ${formatTime(data.updatedAt)}`}
        </Text>
      </HStack>
    </VStack>
  )
}

// ============================================================
// 12. Quantumult X 中号看板（方案三：左栏流量/出口监控 + 右栏 2x2 策略组桌面直切矩阵）
// ============================================================
export function QuantumultXMediumCard({ data }: { data: QuantumultXData }) {
  const cTitle = { light: "#1E293B", dark: "#F8FAFC" } as any
  const cLabel = { light: "#64748B", dark: "#94A3B8" } as any
  const cDivider = { light: "rgba(0,0,0,0.08)", dark: "rgba(255,255,255,0.12)" } as any
  const cCellBg = { light: "#F8FAFC", dark: "#1E293B" } as any
  const cCellBorder = { light: "rgba(15,23,42,0.06)", dark: "rgba(255,255,255,0.08)" } as any
  const pColor = remainColor(data.remainPct)

  const modeColor =
    data.runningMode === "all_proxy"
      ? ({ light: "#7C3AED", dark: "#A78BFA" } as any)
      : data.runningMode === "all_direct"
      ? ({ light: "#059669", dark: "#34D399" } as any)
      : ({ light: "#2563EB", dark: "#60A5FA" } as any)

  const modeBg =
    data.runningMode === "all_proxy"
      ? ({ light: "rgba(124,58,237,0.10)", dark: "rgba(167,139,250,0.16)" } as any)
      : data.runningMode === "all_direct"
      ? ({ light: "rgba(5,150,105,0.10)", dark: "rgba(52,211,153,0.16)" } as any)
      : ({ light: "rgba(37,99,235,0.10)", dark: "rgba(96,165,250,0.16)" } as any)

  const policies = (data.policies || []).slice(0, 4)
  const row1 = policies.slice(0, 2)
  const row2 = policies.slice(2, 4)

  const renderPolicyCell = (p: any) => (
    <Button key={p.id} intent={SwitchQxPolicyIntent(p.id)} buttonStyle="plain">
      <ZStack frame={{ maxWidth: "infinity" }}>
        <RoundedRectangle
          fill={cCellBg}
          cornerRadius={7}
          stroke={{
            shapeStyle: cCellBorder,
            strokeStyle: { lineWidth: 0.8 },
          }}
        />
        <VStack
          alignment="leading"
          spacing={2.5}
          padding={{ top: 5, bottom: 5, leading: 7, trailing: 7 }}
          frame={{ maxWidth: "infinity" }}
        >
          <HStack spacing={3} alignment="center">
            <Image
              systemName={p.icon || "network"}
              font={{ name: "system", size: 8.5 }}
              foregroundStyle={modeColor}
            />
            <Text
              font={9.5}
              fontWeight="medium"
              foregroundStyle={cLabel}
              lineLimit={1}
              minScaleFactor={0.8}
              allowsTightening={true}
            >
              {p.label}
            </Text>
            <Spacer minLength={2} />
            <Image
              systemName="arrow.triangle.2.circlepath"
              font={{ name: "system", size: 8 }}
              foregroundStyle={cLabel}
            />
          </HStack>
          <Text
            font={10.5}
            fontWeight="bold"
            foregroundStyle={cTitle}
            lineLimit={1}
            minScaleFactor={0.8}
          >
            {p.selected}
          </Text>
        </VStack>
      </ZStack>
    </Button>
  )

  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ top: 14, bottom: 12, leading: 16, trailing: 16 }}
      widgetBackground={{ light: "#FFFFFF", dark: "#0F172A" } as any}
    >
      {/* 1. 顶部标题栏：Logo + Quantumult X + 在线点 + 可点击运行模式切换胶囊 + 刷新 */}
      <HStack spacing={6} alignment="center">
        <BrandHeaderIcon iconImage={QX_LOGO_IMAGE} size={18} />
        <Text font={15.5} fontWeight="bold" foregroundStyle={cTitle}>
          Quantumult X
        </Text>
        <Circle fill="#10B981" frame={{ width: 6, height: 6 }} />
        <Spacer />
        <Button intent={SwitchQxModeIntent(undefined)} buttonStyle="plain">
          <HStack
            spacing={4}
            alignment="center"
            padding={{ top: 3, bottom: 3, leading: 8, trailing: 8 }}
            background={modeBg}
            clipShape={{ type: "rect", cornerRadius: 7 }}
          >
            <Image
              systemName={
                data.runningMode === "all_proxy"
                  ? "globe"
                  : data.runningMode === "all_direct"
                  ? "bolt.horizontal.fill"
                  : "arrow.triangle.branch"
              }
              font={{ name: "system", size: 9.5 }}
              foregroundStyle={modeColor}
            />
            <Text font={10.5} fontWeight="bold" foregroundStyle={modeColor} lineLimit={1}>
              {data.runningModeLabel}
            </Text>
            <Image
              systemName="arrow.triangle.2.circlepath"
              font={{ name: "system", size: 8.5 }}
              foregroundStyle={modeColor}
            />
          </HStack>
        </Button>
        <RefreshButton />
      </HStack>

      <Spacer minLength={8} />

      {/* 2. 中部黄金分割：[左半区：订阅剩余流量与落地延迟] | 分割线 | [右半区：2x2 策略组交互矩阵] */}
      <HStack alignment="center" spacing={0}>
        {/* 左半区 */}
        <VStack alignment="leading" spacing={4} frame={{ width: 112 }}>
          <HStack spacing={4} alignment="center">
            <Text font={9.5} fontWeight="medium" foregroundStyle={cLabel} lineLimit={1}>
              剩余流量
            </Text>
            <Spacer />
            <Text font={9} foregroundStyle={cLabel} lineLimit={1} minScaleFactor={0.8}>
              {data.expireText}
            </Text>
          </HStack>

          <HStack alignment="lastTextBaseline" spacing={2}>
            <Text
              font={17.5}
              fontWeight="bold"
              foregroundStyle={pColor}
              monospacedDigit
              lineLimit={1}
              minScaleFactor={0.7}
              allowsTightening={true}
            >
              {data.remainGb}
            </Text>
            <Spacer minLength={2} />
            <Text font={10} fontWeight="bold" foregroundStyle={pColor} monospacedDigit>
              {`${Math.round(data.remainPct)}%`}
            </Text>
          </HStack>

          <ProgressBar value={data.remainPct} color={pColor} height={4.5} />

          <HStack spacing={3} alignment="center" padding={{ top: 2 }}>
            <Text
              font={9}
              fontWeight="medium"
              foregroundStyle={cTitle}
              lineLimit={1}
              minScaleFactor={0.75}
              allowsTightening={true}
            >
              {data.outboundTag}
            </Text>
            <Spacer minLength={2} />
            <Text
              font={9}
              fontWeight="bold"
              foregroundStyle={THEME.green}
              monospacedDigit
              lineLimit={1}
            >
              {data.latencyMs}
            </Text>
          </HStack>
        </VStack>

        <Spacer minLength={9} />

        {/* 纵向分割线 */}
        <RoundedRectangle
          fill={cDivider}
          cornerRadius={0.5}
          frame={{ width: 1, height: 64 }}
        />

        <Spacer minLength={9} />

        {/* 右半区：2x2 策略组可点击切换矩阵 */}
        <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={5} frame={{ maxWidth: "infinity" }}>
            {row1.map((p) => renderPolicyCell(p))}
          </HStack>
          <HStack spacing={5} frame={{ maxWidth: "infinity" }}>
            {row2.map((p) => renderPolicyCell(p))}
          </HStack>
        </VStack>
      </HStack>

      <Spacer minLength={7} />

      {/* 3. 底栏：已用/总计 · 交互提示 · 更新时间 */}
      <HStack spacing={6} alignment="center">
        <Text font={9.5} fontWeight="regular" foregroundStyle={cLabel} lineLimit={1}>
          {`已用 ${data.usedGb} / ${data.totalGb} · 点击模式或策略组可切换`}
        </Text>
        <Spacer />
        <Text font={9.5} fontWeight="regular" foregroundStyle={cLabel} monospacedDigit>
          {`更新于 ${formatTime(data.updatedAt)}`}
        </Text>
      </HStack>
    </VStack>
  )
}

// 统一根据尺寸自适应的 QuantumultXCard
export function QuantumultXCard({ data, family }: { data: QuantumultXData; family?: string }) {
  if (family === "systemMedium" || family === "systemLarge") {
    return <QuantumultXMediumCard data={data} />
  }
  return <QuantumultXSmallCard data={data} />
}

// ============================================================
// 13. Quantumult X 流量统计看板（遵循 DashBoard-Kit 统一 UI 风格，自适应深色/浅色模式）
// ============================================================
export function QuantumultXTrafficSmallCard({ data }: { data: QuantumultXData }) {
  const dlStr = data.downloadTraffic || data.usedGb || "102.6 GB"
  const ulStr = data.uploadTraffic || "5.8 GB"
  const pCount = data.policyGroupCount || String((data.policies || []).length || 14)
  const cDivider = { light: "rgba(0,0,0,0.08)", dark: "rgba(255,255,255,0.12)" } as any
  const cAccent = { light: "#2563EB", dark: "#38BDF8" } as any
  const cDl = { light: "#16A34A", dark: "#22C55E" } as any
  const cUl = { light: "#D97706", dark: "#F59E0B" } as any

  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ top: 13, bottom: 11, leading: 13, trailing: 13 }}
      widgetBackground={THEME.bg}
    >
      {/* 1. 顶部栏：QX 官方图标 + Quantumult X + 在线绿点 + 统一刷新按钮 */}
      <HStack spacing={4} alignment="center" frame={{ height: 18 }}>
        <BrandHeaderIcon iconImage={QX_LOGO_IMAGE} size={15} />
        <Text
          font={11.5}
          fontWeight="bold"
          foregroundStyle={THEME.text}
          lineLimit={1}
          minScaleFactor={0.8}
          allowsTightening={true}
        >
          Quantumult X
        </Text>
        <Circle fill="#10B981" frame={{ width: 5, height: 5 }} />
        <Spacer minLength={2} />
        <RefreshButton />
      </HStack>

      <Spacer minLength={8} />

      {/* 2. 累计下行 & 累计上行 */}
      <HStack alignment="center" spacing={0}>
        <VStack alignment="center" spacing={2} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={3} alignment="center">
            <Image
              systemName="arrow.down.circle.fill"
              font={{ name: "system", size: 10 }}
              foregroundStyle={cDl}
            />
            <Text font={9.5} fontWeight="medium" foregroundStyle={THEME.dim}>
              累计下行
            </Text>
          </HStack>
          <Text
            font={16}
            fontWeight="bold"
            foregroundStyle={THEME.text}
            monospacedDigit
            lineLimit={1}
            minScaleFactor={0.7}
          >
            {dlStr}
          </Text>
        </VStack>

        <RoundedRectangle
          fill={cDivider}
          cornerRadius={0.5}
          frame={{ width: 1, height: 28 }}
        />

        <VStack alignment="center" spacing={2} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={3} alignment="center">
            <Image
              systemName="arrow.up.circle.fill"
              font={{ name: "system", size: 10 }}
              foregroundStyle={cUl}
            />
            <Text font={9.5} fontWeight="medium" foregroundStyle={THEME.dim}>
              累计上行
            </Text>
          </HStack>
          <Text
            font={16}
            fontWeight="bold"
            foregroundStyle={THEME.text}
            monospacedDigit
            lineLimit={1}
            minScaleFactor={0.7}
          >
            {ulStr}
          </Text>
        </VStack>
      </HStack>

      <Spacer minLength={8} />

      {/* 3. 中部两项：策略组数 & 实时延迟 */}
      <HStack alignment="center" spacing={0}>
        <VStack alignment="center" spacing={2} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={3} alignment="center">
            <Image
              systemName="cpu"
              font={{ name: "system", size: 9 }}
              foregroundStyle={cAccent}
            />
            <Text font={9} foregroundStyle={THEME.dim}>
              策略组数
            </Text>
          </HStack>
          <Text font={11.5} fontWeight="bold" foregroundStyle={THEME.text} monospacedDigit>
            {pCount}
          </Text>
        </VStack>

        <VStack alignment="center" spacing={2} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={3} alignment="center">
            <Image
              systemName="link"
              font={{ name: "system", size: 9 }}
              foregroundStyle={cAccent}
            />
            <Text font={9} foregroundStyle={THEME.dim}>
              实时延迟
            </Text>
          </HStack>
          <Text font={11.5} fontWeight="bold" foregroundStyle={THEME.text} monospacedDigit>
            {data.latencyMs}
          </Text>
        </VStack>
      </HStack>

      <Spacer minLength={6} />

      {/* 4. 底栏：运行模式 · 更新时间 */}
      <HStack spacing={4} alignment="center">
        <Button intent={SwitchQxModeIntent(undefined)} buttonStyle="plain">
          <Text font={8.5} foregroundStyle={THEME.dim} lineLimit={1}>
            {`${data.runningModeLabel} · 余 ${data.remainGb}`}
          </Text>
        </Button>
        <Spacer />
        <Text font={8.5} foregroundStyle={THEME.dim} monospacedDigit>
          {`更新于 ${formatTime(data.updatedAt)}`}
        </Text>
      </HStack>
    </VStack>
  )
}

export function QuantumultXTrafficMediumCard({ data }: { data: QuantumultXData }) {
  const dlStr = data.downloadTraffic || data.usedGb || "102.6 GB"
  const ulStr = data.uploadTraffic || "5.8 GB"
  const pCount = data.policyGroupCount || String((data.policies || []).length || 14)
  const versionStr = data.qxVersion || "Quantumult X 1.8.1"

  const cTitle = { light: "#1E293B", dark: "#F8FAFC" } as any
  const cLabel = { light: "#64748B", dark: "#94A3B8" } as any
  const cDivider = { light: "rgba(0,0,0,0.08)", dark: "rgba(255,255,255,0.12)" } as any
  const cAccent = { light: "#2563EB", dark: "#38BDF8" } as any
  const cDl = { light: "#16A34A", dark: "#22C55E" } as any
  const cUl = { light: "#D97706", dark: "#F59E0B" } as any

  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ top: 14, bottom: 12, leading: 16, trailing: 16 }}
      widgetBackground={{ light: "#FFFFFF", dark: "#0F172A" } as any}
    >
      {/* 1. 顶部栏：QX 官方图标 + 标题 + 在线绿点 + 更新时间 + 统一圆角刷新按钮 */}
      <HStack spacing={6} alignment="center">
        <BrandHeaderIcon iconImage={QX_LOGO_IMAGE} size={18} />
        <Text font={15.5} fontWeight="bold" foregroundStyle={cTitle}>
          Quantumult X
        </Text>
        <Circle fill="#10B981" frame={{ width: 6, height: 6 }} />
        <Spacer />
        <Text font={10.5} fontWeight="medium" foregroundStyle={cLabel} monospacedDigit>
          {`更新于 ${formatTime(data.updatedAt)}`}
        </Text>
        <RefreshButton />
      </HStack>

      <Spacer minLength={8} />

      {/* 2. 中部核心双栏：左「累计下行」 | 竖向分割线 | 右「累计上行」 */}
      <HStack alignment="center" spacing={0}>
        {/* 左栏：累计下行 */}
        <VStack alignment="center" spacing={3} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={4} alignment="center">
            <Image
              systemName="arrow.down.circle.fill"
              font={{ name: "system", size: 11.5 }}
              foregroundStyle={cDl}
            />
            <Text font={11} fontWeight="medium" foregroundStyle={cLabel}>
              累计下行
            </Text>
          </HStack>
          <Text
            font={23}
            fontWeight="bold"
            foregroundStyle={cTitle}
            monospacedDigit
            lineLimit={1}
            minScaleFactor={0.75}
          >
            {dlStr}
          </Text>
        </VStack>

        {/* 中央分割线 */}
        <RoundedRectangle
          fill={cDivider}
          cornerRadius={0.5}
          frame={{ width: 1, height: 38 }}
        />

        {/* 右栏：累计上行 */}
        <VStack alignment="center" spacing={3} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={4} alignment="center">
            <Image
              systemName="arrow.up.circle.fill"
              font={{ name: "system", size: 11.5 }}
              foregroundStyle={cUl}
            />
            <Text font={11} fontWeight="medium" foregroundStyle={cLabel}>
              累计上行
            </Text>
          </HStack>
          <Text
            font={23}
            fontWeight="bold"
            foregroundStyle={cTitle}
            monospacedDigit
            lineLimit={1}
            minScaleFactor={0.75}
          >
            {ulStr}
          </Text>
        </VStack>
      </HStack>

      <Spacer minLength={9} />

      {/* 3. 四列系统/代理指标：策略组数 · 实时延迟 · 剩余流量 · 运行模式(可点击切换) */}
      <HStack alignment="center" spacing={0}>
        {/* 列1：策略组数 */}
        <VStack alignment="center" spacing={2.5} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={3} alignment="center">
            <Image
              systemName="cpu"
              font={{ name: "system", size: 10 }}
              foregroundStyle={cAccent}
            />
            <Text font={10} fontWeight="medium" foregroundStyle={cLabel} lineLimit={1}>
              策略组数
            </Text>
          </HStack>
          <Text font={13} fontWeight="bold" foregroundStyle={cTitle} monospacedDigit lineLimit={1}>
            {pCount}
          </Text>
        </VStack>

        {/* 列2：实时延迟 */}
        <VStack alignment="center" spacing={2.5} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={3} alignment="center">
            <Image
              systemName="link"
              font={{ name: "system", size: 10 }}
              foregroundStyle={cAccent}
            />
            <Text font={10} fontWeight="medium" foregroundStyle={cLabel} lineLimit={1}>
              实时延迟
            </Text>
          </HStack>
          <Text font={13} fontWeight="bold" foregroundStyle={cTitle} monospacedDigit lineLimit={1}>
            {data.latencyMs}
          </Text>
        </VStack>

        {/* 列3：剩余流量 */}
        <VStack alignment="center" spacing={2.5} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={3} alignment="center">
            <Image
              systemName="globe"
              font={{ name: "system", size: 10 }}
              foregroundStyle={cAccent}
            />
            <Text font={10} fontWeight="medium" foregroundStyle={cLabel} lineLimit={1}>
              剩余流量
            </Text>
          </HStack>
          <Text font={13} fontWeight="bold" foregroundStyle={cTitle} monospacedDigit lineLimit={1}>
            {data.remainGb}
          </Text>
        </VStack>

        {/* 列4：运行模式（支持桌面直接点击切换） */}
        <Button intent={SwitchQxModeIntent(undefined)} buttonStyle="plain">
          <VStack alignment="center" spacing={2.5} frame={{ maxWidth: "infinity" }}>
            <HStack spacing={3} alignment="center">
              <Image
                systemName="clock"
                font={{ name: "system", size: 10 }}
                foregroundStyle={cAccent}
              />
              <Text font={10} fontWeight="medium" foregroundStyle={cLabel} lineLimit={1}>
                运行模式
              </Text>
            </HStack>
            <Text font={13} fontWeight="bold" foregroundStyle={cTitle} lineLimit={1}>
              {data.runningModeLabel}
            </Text>
          </VStack>
        </Button>
      </HStack>

      <Spacer minLength={7} />

      {/* 4. 底部信息栏：左侧订阅统计/到期 · 右侧版本信息/总额 */}
      <HStack spacing={6} alignment="center">
        <Text
          font={9.5}
          fontWeight="regular"
          foregroundStyle={cLabel}
          lineLimit={1}
          minScaleFactor={0.8}
          allowsTightening={true}
        >
          {`订阅统计 · ${data.expireText}`}
        </Text>
        <Spacer />
        <Text
          font={9.5}
          fontWeight="regular"
          foregroundStyle={cLabel}
          monospacedDigit
          lineLimit={1}
          minScaleFactor={0.8}
        >
          {`${versionStr} · 总额 ${data.totalGb}`}
        </Text>
      </HStack>
    </VStack>
  )
}

export function QuantumultXTrafficCard({ data, family }: { data: QuantumultXData; family?: string }) {
  if (family === "systemMedium" || family === "systemLarge") {
    return <QuantumultXTrafficMediumCard data={data} />
  }
  return <QuantumultXTrafficSmallCard data={data} />
}



