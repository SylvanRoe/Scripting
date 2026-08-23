/**
 * SGCC 国家电网电量小组件 —— Scripting 移植版。
 *
 * 移植/维护（Scripting 版）：SylvanRoe
 * telegram: @Air_QT
 * 更新: 2026/08/23
 *
 * 原作者（原 Scriptable 脚本）声明：
 * @author: 脑瓜
 * @feedback: https://t.me/Scriptable_CN
 * telegram: @anker1209
 * version: 2.3.3
 * update: 2026/08/11
 * 原创UI，修改套用请注明来源
 * 使用该脚本需DmYY依赖及添加重写，重写修改自作者@Yuheng0101
 * 重写: https://raw.githubusercontent.com/dompling/Script/master/wsgw/index.js
 * 依赖: https://raw.githubusercontent.com/dompling/Scriptable/master/Scripts/DmYY.js
 *
 * 附：原脚本头部（Scriptable 专用，Scripting 中不生效，仅留档）——
 *   // Variables used by Scriptable.
 *   // These must be at the very top of the file. Do not edit.
 *   // icon-color: teal; icon-glyph: project-diagram;
 */
import {
  Widget,
  VStack,
  HStack,
  ZStack,
  Text,
  Image,
  Spacer,
  Rectangle,
  Circle,
  type DynamicShapeStyle,
  type ShapeStyle,
} from 'scripting'
import { getBillData } from './lib/api'
import { loadSettings } from './lib/store'
import {
  recentDays,
  describeCacheAge,
  shortTime,
  resolveAccountIndex,
} from './lib/calc'
import type { BillViewModel, SGCCSettings } from './lib/types'

const settings = loadSettings()

/** 深浅色自适应 */
const bg: DynamicShapeStyle = { light: '#F2F2F7', dark: '#1C1C1E' }
const panelBg: DynamicShapeStyle = { light: '#E2E2E7', dark: '#2C2C2F' }
const labelColor: DynamicShapeStyle = { light: '#6E6E73', dark: '#98989F' }
const valueColor: DynamicShapeStyle = { light: '#1C1C1E', dark: '#F2F2F7' }
const dividerColor: DynamicShapeStyle = { light: '#00000014', dark: '#FFFFFF14' }
const sepGray: DynamicShapeStyle = { light: 'rgba(120,120,120,0.35)', dark: 'rgba(180,180,180,0.28)' }
const overdueColor: ShapeStyle = '#DE2A18'

const chartColor = settings.chartColor as ShapeStyle
const accentColor = settings.accentColor as ShapeStyle

/** 左侧面板宽度 */
const PANEL_WIDTH = 124
/** 右面板内可用宽度（329 - 左面板 - 左右内边距 14 + 16） */
const RIGHT_INNER = 329 - PANEL_WIDTH - 30
/** 阶梯条宽度 = 右面板内可用宽度 */
const BAR_WIDTH = RIGHT_INNER

/** 把 #rrggbb 颜色向白色混合 amount（0~1），返回更浅的 6 位 hex */
function lightenHex(hex: string, amount: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex
  const c = (i: number) => parseInt(hex.slice(i + 1, i + 3), 16)
  const mix = (v: number) => Math.round(v + (255 - v) * amount)
  const to2 = (v: number) => v.toString(16).padStart(2, '0')
  return `#${to2(mix(c(0)))}${to2(mix(c(2)))}${to2(mix(c(4)))}`
}

// 阶梯条配色：一律用可靠的 6 位 hex（8 位 alpha 会被判为无效而渲成白色）
const chartHex = settings.chartColor
// 剩余段（底槽）：比已用更浅的绿
const chartRemain = lightenHex(chartHex, 0.55) as ShapeStyle
// 刻度竖线：介于已用与剩余之间的中绿
const chartTick = lightenHex(chartHex, 0.32) as ShapeStyle

/** 数值 + 单位的一组展示 */
function Metric({
  label,
  value,
  unit,
  align = 'leading',
  highlight = false,
}: {
  label: string
  value: string
  unit: string
  align?: 'leading' | 'trailing'
  highlight?: boolean
}) {
  return (
    <VStack alignment={align} spacing={1}>
      <Text font={11} foregroundStyle={labelColor}>
        {label}
      </Text>
      <HStack alignment="firstTextBaseline" spacing={1.5}>
        <Text
          font={17}
          fontWeight="medium"
          fontDesign="rounded"
          foregroundStyle={highlight ? overdueColor : valueColor}
        >
          {value}
        </Text>
        <Text font={9} foregroundStyle={labelColor}>
          {unit}
        </Text>
      </HStack>
    </VStack>
  )
}

/** 近日用电柱状图：固定宽度 90pt，自适应柱宽 + 动态间距，n>=10 时收紧避免溢出 */
const CHART_WIDTH = 90

// 柱状图盒子高度与柱子 max 等高，避免与底部 metric 对齐时上下留白
const CHART_BOX_HEIGHT = 22

// 近日用电数值 font 20 的近似 descent，用于把柱状图底边抬到字形底边
const BASELINE_DESCENT = 4

function DayChart({ data }: { data: BillViewModel['dayElePq'] }) {
  const bars = recentDays(data, settings.dayAmount)
  if (bars.length === 0) {
    return (
      <Text font={11} foregroundStyle={labelColor} frame={{ width: CHART_WIDTH }}>
        暂无用电数据
      </Text>
    )
  }

  const max = Math.max(...bars.map(b => b.elePq), 0.01)
  const chartHeight = 22
  const n = bars.length
  // 柱子间距拉大 3→4pt，让每天之间的空隙更明显；n>=10 时收紧避免溢出
  const spacing = n >= 10 ? 4 : 5
  const barWidth = Math.max(
    5,
    Math.min(12, Math.floor((CHART_WIDTH - spacing * (n - 1)) / n)),
  )
  const cornerR = Math.min(barWidth, 6) / 2

  return (
    <ZStack
      alignment="bottomLeading"
      frame={{ width: CHART_WIDTH, height: CHART_BOX_HEIGHT }}
      // HStack alignment="bottom" 对齐的是行盒底边，而 font 20 的字形底边
      // 比行盒底边高出约一个 descent（≈4pt），上抬柱状图与字形底边取齐
      offset={{ x: 0, y: -BASELINE_DESCENT }}
    >
      <HStack alignment="bottom" spacing={spacing}>
        {bars.map(item => {
          const ratio = item.elePq / max
          // 最小高度 2pt，保证零值也可见
          const h = Math.max(ratio * chartHeight, 2)
          return (
            <Rectangle
              key={item.label}
              fill={chartColor}
              frame={{ width: barWidth, height: h }}
              clipShape={{ type: 'rect', cornerRadius: cornerR }}
            />
          )
        })}
      </HStack>
    </ZStack>
  )
}

/**
 * 阶梯用电可视化：
 * - 横向长条：深绿已用 + 浅绿总范围
 * - 垂直刻度竖线把条分成 3 段电价区间
 * - 圆形滑块定位当前用电位置
 * - 上方文字标注 "阶梯电量" + "第N阶梯·xx%"
 */
function StepRow({ step }: { step: BillViewModel['step'] }) {
  // 用实际计算档位时用到的阈值（可在设置里覆盖），保证横条刻度与文字档位一致
  const { step2, step3 } = step

  const BAR_HEIGHT = 8
  const TICK_WIDTH = 2
  const TICK_HEIGHT = 12
  const SLIDER_SIZE = 12

  // 已用比例（相对第三档上限，保留上限 1 让滑块贴在最右）
  const usageRatio = Math.max(0, Math.min(step.usage / step3, 1))
  const usedWidth = Math.max(usageRatio * BAR_WIDTH, 2)

  // 刻度竖线 X 位置（按阈值等比映射到条宽）
  const tick2X = (step2 / step3) * BAR_WIDTH
  const tick3X = BAR_WIDTH

  // 剩余段（底槽）：比已用更浅的绿
  const lightChartColor = chartRemain
  // 刻度竖线：介于已用与剩余之间的中绿
  const stepDividerColor = chartTick

  // 滑块 X：保证圆形整体落在 [0, BAR_WIDTH] 内
  const sliderX = Math.max(
    0,
    Math.min(BAR_WIDTH - SLIDER_SIZE, usedWidth - SLIDER_SIZE / 2),
  )

  const tierText = ['一', '二', '三'][step.level - 1]

  return (
    <VStack alignment="leading" spacing={2}>
      {/* 上方文字标注 */}
      <HStack alignment="firstTextBaseline">
        <Text font={11} foregroundStyle={labelColor}>
          阶梯电量
        </Text>
        <Spacer />
        <Text font={11} fontWeight="medium" foregroundStyle={labelColor}>
          {`第${tierText}阶梯·${step.percent.toFixed(2)}%`}
        </Text>
      </HStack>

      {/* 横向阶梯条：浅绿底槽（剩余） + 深绿已用 + 刻度 + 圆形滑块（ZStack 垂直居中，offset 只用于 X 定位） */}
      <ZStack alignment="leading">
        {/* 浅绿底槽：3 段电价区间共享的总范围，未用到的剩余段 */}
        <Rectangle
          fill={lightChartColor}
          frame={{ width: BAR_WIDTH, height: BAR_HEIGHT }}
          clipShape={{ type: 'rect', cornerRadius: BAR_HEIGHT / 2 }}
          offset={{ x: 0, y: 0 }}
        />
        {/* 深绿已用：叠在底槽左半部 */}
        <Rectangle
          fill={chartColor}
          frame={{ width: usedWidth, height: BAR_HEIGHT }}
          clipShape={{ type: 'rect', cornerRadius: BAR_HEIGHT / 2 }}
          offset={{ x: 0, y: 0 }}
        />
        {/* 刻度 1：第二阶梯起点 step2 —— 浅绿色 pill */}
        <Rectangle
          fill={stepDividerColor}
          frame={{ width: TICK_WIDTH, height: TICK_HEIGHT }}
          clipShape={{ type: 'rect', cornerRadius: TICK_WIDTH / 2 }}
          offset={{
            x: Math.max(0, tick2X - TICK_WIDTH / 2),
            y: (SLIDER_SIZE - TICK_HEIGHT) / 2,
          }}
        />
        {/* 刻度 2：第三阶梯起点 step3 */}
        <Rectangle
          fill={stepDividerColor}
          frame={{ width: TICK_WIDTH, height: TICK_HEIGHT }}
          clipShape={{ type: 'rect', cornerRadius: TICK_WIDTH / 2 }}
          offset={{
            x: Math.max(0, tick3X - TICK_WIDTH),
            y: (SLIDER_SIZE - TICK_HEIGHT) / 2,
          }}
        />
        {/* 圆形滑块：用中绿与两侧（深绿已用 / 浅绿剩余）都区分开，定位当前用电位置 */}
        <Circle
          fill={chartTick}
          frame={{ width: SLIDER_SIZE, height: SLIDER_SIZE }}
          offset={{ x: sliderX, y: 0 }}
        />
      </ZStack>
    </VStack>
  )
}

/** 左侧：户名 + 余额 */
function LeftPanel({ vm, settings }: { vm: BillViewModel; settings: SGCCSettings }) {
  const title = settings.showConsName && vm.consName ? vm.consName : '国家电网'
  return (
    <VStack alignment="leading" spacing={0} padding={{ leading: 16, trailing: 12, vertical: 24 }}>
      <HStack spacing={4}>
        <Image
          systemName="bolt.circle.fill"
          resizable
          scaleToFit
          frame={{ width: 16, height: 16 }}
          foregroundStyle={accentColor}
        />
        <Text font={12} fontWeight="semibold" foregroundStyle={valueColor} lineLimit={1}>
          {title}
        </Text>
      </HStack>

      <Spacer />

      <Text font={10} foregroundStyle={labelColor}>
        {vm.isPostPaid ? '账户余额' : '待缴电费'}
      </Text>
      <HStack alignment="firstTextBaseline" spacing={2}>
        <Text
          font={24}
          fontWeight="semibold"
          fontDesign="rounded"
          foregroundStyle={vm.isOverdue ? overdueColor : valueColor}
        >
          {vm.remainFee.toFixed(2)}
        </Text>
        <Text font={11} foregroundStyle={vm.isOverdue ? overdueColor : labelColor}>
          元
        </Text>
      </HStack>

      <Spacer />

      <HStack spacing={3}>
        <Image
          systemName={vm.fromCache ? 'clock.arrow.circlepath' : 'checkmark.circle'}
          resizable
          scaleToFit
          frame={{ width: 9, height: 9 }}
          foregroundStyle={labelColor}
        />
        <Text font={9} foregroundStyle={labelColor} lineLimit={1}>
          {vm.fromCache ? describeCacheAge(vm.cacheAgeMinutes) : shortTime(vm.update)}
        </Text>
      </HStack>
    </VStack>
  )
}

/** 细实线分隔：填满父容器宽度，默认最细的半透明灰 */
function ThinLine({ color = sepGray, height = 0.5 }: { color?: ShapeStyle | DynamicShapeStyle; height?: number }) {
  return <Rectangle fill={color} frame={{ height }} />
}

/** 右侧：右面板 + 阶梯电量 + 近日用电柱状图（右对齐） */
function RightPanel({ vm, settings }: { vm: BillViewModel; settings: SGCCSettings }) {
  return (
    <VStack alignment="leading" spacing={0} padding={{ leading: 14, trailing: 16, vertical: 22 }}>
      <HStack>
        <Metric label="年度电量" value={vm.yearUsage.toFixed(0)} unit="度" />
        <Spacer />
        <Metric label="月度电量" value={vm.monthUsage.toFixed(0)} unit="度" align="trailing" />
      </HStack>

      <Spacer />

      <ThinLine />

      <Spacer />

      <StepRow step={vm.step} />

      <Spacer />

      <ThinLine />

      <Spacer />

      {/* 底部一行：左侧柱状图 + 右侧近日用电数值（贴近右边） */}
      <HStack alignment="bottom" spacing={6}>
        <DayChart data={vm.dayElePq} />
        <Spacer />
        <VStack alignment="trailing" spacing={1}>
          <Text font={10} foregroundStyle={labelColor} lineLimit={1}>
            近日用电
          </Text>
          <HStack alignment="firstTextBaseline" spacing={1}>
            <Text
              font={20}
              fontWeight="semibold"
              fontDesign="rounded"
              foregroundStyle={chartColor}
              lineLimit={1}
            >
              {vm.dayFee.toFixed(2)}
            </Text>
            <Text font={10} foregroundStyle={labelColor}>
              度
            </Text>
          </HStack>
        </VStack>
      </HStack>
    </VStack>
  )
}

function WidgetView({ vm }: { vm: BillViewModel }) {
  return (
    <HStack spacing={0} widgetBackground={panelBg}>
      <VStack spacing={0} frame={{ width: PANEL_WIDTH }} background={bg}>
        <LeftPanel vm={vm} settings={settings} />
      </VStack>
      <RightPanel vm={vm} settings={settings} />
    </HStack>
  )
}

function ErrorView({ message }: { message: string }) {
  return (
    <VStack spacing={6} padding={{ horizontal: 20, vertical: 16 }} widgetBackground={bg}>
      <Image
        systemName="exclamationmark.triangle.fill"
        resizable
        scaleToFit
        frame={{ width: 30, height: 30 }}
        foregroundStyle="#FF9500"
      />
      <Text font={13} fontWeight="semibold" foregroundStyle={valueColor}>
        数据加载失败
      </Text>
      <Text font={10} foregroundStyle={labelColor} multilineTextAlignment="center" lineLimit={2}>
        {message}
      </Text>
      <Text font={9} foregroundStyle={labelColor}>
        请检查 wsgw 重写与网络
      </Text>
    </VStack>
  )
}

/** 演示数据：小组件参数填 demo 时使用，便于在无网络/未配重写时预览布局 */
function demoViewModel(): BillViewModel {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const days = Array.from({ length: 10 }, (_, i) => ({
    label: `${y}${m}${String(i + 12).padStart(2, '0')}`,
    elePq: Number((6 + Math.sin(i * 1.1) * 4 + i * 0.35).toFixed(2)),
  }))
  return {
    consNo: '1234****',
    consName: '演示户名',
    isOverdue: false,
    isPostPaid: true,
    remainFee: 88.35,
    yearFee: 968.4,
    yearUsage: 1557.5,
    monthFee: 198.25,
    monthUsage: 305,
    currentMonthEle: 37.5,
    dayFee: days[days.length - 1].elePq,
    dayElePq: days,
    monthElePq: [
      { label: `${y}06`, elePq: 210, cost: 126.5 },
      { label: `${y}07`, elePq: 305, cost: 198.25 },
    ],
    update: '演示数据',
    fromCache: false,
    cacheAgeMinutes: 0,
    step: {
      level: 1,
      usage: 1557,
      percent: 32.44,
      remain: 963,
      threshold: 2520,
      step2: 2520,
      step3: 4800,
    },
  }
}

async function main() {
  const param = (Widget.parameter ?? '').trim().toLowerCase()

  // 参数为 demo：不联网，仅用于预览布局
  if (param === 'demo') {
    Widget.present(<WidgetView vm={demoViewModel()} />, {
      policy: 'after',
      date: new Date(Date.now() + settings.interval * 60 * 1000),
    })
    return
  }

  // 参数决定本小组件显示哪一户：优先匹配自定义户名，其次数字 1/2/3，否则用设置里的当前账户
  const accountIndex = resolveAccountIndex(Widget.parameter ?? '', settings)

  try {
    const raw = await getBillData(settings, accountIndex)
    // 套用自定义户名（未设置则沿用数据里的实际户名）
    const customName = settings.accNames[accountIndex]?.trim()
    const vm = customName ? { ...raw, consName: customName } : raw
    Widget.present(<WidgetView vm={vm} />, {
      policy: 'after',
      date: new Date(Date.now() + settings.interval * 60 * 1000),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`小组件渲染失败：${message}`)
    Widget.present(<ErrorView message={message} />, {
      policy: 'after',
      date: new Date(Date.now() + 30 * 60 * 1000),
    })
  }
}

main()
