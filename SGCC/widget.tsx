/**
 * SGCC 国家电网电量小组件 —— Scripting 移植版。
 *
 * 移植/维护（Scripting 版）：SylvanRoe
 * telegram: @Air_QT
 * 更新: 2026/09/05
 * 版本: 1.0.2
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
 *
 * 免责声明：
 *   1. 本仓库中涉及任何解锁和解密分析的脚本仅用于资源共享和学习研究，不能保证其合法性、准确性、完整性和有效性，请根据情况自行判断。
 *   2. 本仓库内的任何内容禁止在中华人民共和国境内平台公开传播。
 *   3. 请勿将本仓库内的任何内容用于商业或非法目的，否则后果自负。
 *   4. 如果任何单位或个人认为该项目的脚本可能涉嫌侵犯其权利，则应及时通知并提供身份证明、所有权证明，我将在收到认证文件后删除相关脚本。
 *   5. 对任何本仓库中包含的脚本在使用中可能出现的问题概不负责，包括但不限于由任何脚本错误导致的任何损失或损害。
 *   6. 您必须在下载后的24小时内从计算机或手机中完全删除以上内容。
 *   7. 以任何方式查看此项目的人或直接或间接使用该项目的任何脚本的使用者都应仔细阅读此声明。保留随时更改或补充此免责声明的权利。一旦使用并复制了任何本仓库相关脚本或其他内容，则视为您已接受此免责声明。
 *
 * 补充说明：
 *   本仓库内的脚本不允许商业用途，但可以用于学习和研究，转载请保留原作者署名。
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
import type { BillViewModel, SGCCSettings, MetricKey, RowDisplayMode } from './lib/types'

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
      <Text font={11} fontWeight="semibold" foregroundStyle={labelColor}>
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
        <Text font={9} fontWeight="semibold" foregroundStyle={labelColor}>
          {unit}
        </Text>
      </HStack>
    </VStack>
  )
}

/** 近日用电柱状图：固定宽度 96pt，自适应柱宽 + 动态间距，n>=11 时收紧避免溢出 */
const CHART_WIDTH = 96

// 柱状图盒子高度与柱子 max 等高，避免与底部 metric 对齐时上下留白
const CHART_BOX_HEIGHT = 22

// 近日用电数值 font 20 的近似 descent，用于把柱状图底边抬到字形底边
const BASELINE_DESCENT = 4

function DayChart({ data }: { data: BillViewModel['dayElePq'] }) {
  const bars = recentDays(data, settings.dayAmount)
  if (bars.length === 0) {
    return (
      <Text font={11} fontWeight="semibold" foregroundStyle={labelColor} frame={{ width: CHART_WIDTH }}>
        暂无用电数据
      </Text>
    )
  }

  const max = Math.max(...bars.map(b => b.elePq), 0.01)
  const chartHeight = 22
  const n = bars.length
  // 柱子间距：天数少时间距更大（6pt），9-10 天用 5pt，11-12 天收紧到 3pt 避免溢出
  const spacing = n >= 11 ? 3 : n >= 9 ? 5 : 6
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
        <Text font={11} fontWeight="semibold" foregroundStyle={labelColor}>
          阶梯电量
        </Text>
        <Spacer />
        <Text font={11} fontWeight="semibold" foregroundStyle={labelColor}>
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

/** 近日用电：大号数值 + 度，与柱状图并排时视觉醒目 */
function DayFeeMetric({ vm, align = 'leading' }: { vm: BillViewModel; align?: 'leading' | 'trailing' }) {
  return (
    <VStack alignment={align} spacing={1}>
      <Text font={10} fontWeight="semibold" foregroundStyle={labelColor} lineLimit={1}>
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
        <Text font={10} fontWeight="semibold" foregroundStyle={labelColor}>
          度
        </Text>
      </HStack>
    </VStack>
  )
}

/** 按 MetricKey 渲染对应的内容块 */
function MetricItem({
  vm,
  metricKey,
  align = 'leading',
}: {
  vm: BillViewModel
  metricKey: MetricKey
  align?: 'leading' | 'trailing'
}) {
  switch (metricKey) {
    case 'monthFee':
      return <Metric label="上期电费" value={vm.monthFee.toFixed(2)} unit="元" align={align} />
    case 'monthUsage':
      return <Metric label="上月电量" value={vm.monthUsage.toFixed(0)} unit="度" align={align} />
    case 'yearFee':
      return <Metric label="年度电费" value={vm.yearFee.toFixed(2)} unit="元" align={align} />
    case 'yearUsage':
      return <Metric label="年度电量" value={vm.yearUsage.toFixed(0)} unit="度" align={align} />
    case 'currentMonthEle':
      return <Metric label="本月电量" value={vm.currentMonthEle.toFixed(0)} unit="度" align={align} />
    case 'dayFee':
      return <DayFeeMetric vm={vm} align={align} />
    case 'remainFee':
      return (
        <Metric
          label="电费余额"
          value={Math.abs(vm.remainFee).toFixed(2)}
          unit="元"
          align={align}
          highlight={vm.isOverdue}
        />
      )
    case 'dayChart':
      return <DayChart data={vm.dayElePq} />
    case 'none':
      return null
  }
}

/** 组合行：左侧 + Spacer + 右侧，各自独立选择指标 */
function GroupRow({
  vm,
  settings,
  groupNum,
}: {
  vm: BillViewModel
  settings: SGCCSettings
  groupNum: 1 | 2 | 3
}) {
  const leftKey: MetricKey =
    groupNum === 1 ? settings.group1Left : groupNum === 2 ? settings.group2Left : settings.group3Left
  const rightKey: MetricKey =
    groupNum === 1 ? settings.group1Right : groupNum === 2 ? settings.group2Right : settings.group3Right

  const hasChart = leftKey === 'dayChart' || rightKey === 'dayChart'

  // 两侧都不显示时返回 Spacer 保持布局
  if (leftKey === 'none' && rightKey === 'none') {
    return <Spacer />
  }

  return (
    <HStack alignment={hasChart ? 'bottom' : 'firstTextBaseline'} spacing={6}>
      <MetricItem vm={vm} metricKey={leftKey} />
      <Spacer />
      <MetricItem vm={vm} metricKey={rightKey} align="trailing" />
    </HStack>
  )
}

/** 按 rowNum 读取行模式，渲染对应的组合行或阶梯行 */
function RowRenderer({
  vm,
  settings,
  rowNum,
}: {
  vm: BillViewModel
  settings: SGCCSettings
  rowNum: 1 | 2 | 3
}) {
  const mode: RowDisplayMode =
    rowNum === 1 ? settings.row1Display : rowNum === 2 ? settings.row2Display : settings.row3Display

  if (mode === 'step') {
    return <StepRow step={vm.step} />
  }

  const groupNum = mode === 'group1' ? 1 : mode === 'group2' ? 2 : 3
  return <GroupRow vm={vm} settings={settings} groupNum={groupNum} />
}

/** 左侧：户名 + 上期电费（待缴时优先显示待缴电费） */
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

      <Text font={10} fontWeight="semibold" foregroundStyle={labelColor}>
        {vm.isOverdue ? '待缴电费' : '上期电费'}
      </Text>
      <HStack alignment="firstTextBaseline" spacing={2}>
        <Text
          font={(() => {
            const s = (vm.isOverdue ? Math.abs(vm.remainFee) : vm.monthFee).toFixed(2);
            const len = s.length;
            if (len <= 5) return 22;
            if (len === 6) return 20;
            return 18;
          })()}
          fontWeight="semibold"
          fontDesign="rounded"
          foregroundStyle={vm.isOverdue ? overdueColor : valueColor}
        >
          {(vm.isOverdue ? Math.abs(vm.remainFee) : vm.monthFee).toFixed(2)}
        </Text>
        <Text font={11} fontWeight="semibold" foregroundStyle={vm.isOverdue ? overdueColor : labelColor}>
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

/** 右侧：三栏自由定制（第一栏 + 第二栏 + 第三栏），由设置页配置 */
function RightPanel({ vm, settings }: { vm: BillViewModel; settings: SGCCSettings }) {
  return (
    <VStack alignment="leading" spacing={0} padding={{ leading: 14, trailing: 16, vertical: 22 }}>
      {/* 第一栏 */}
      <RowRenderer vm={vm} settings={settings} rowNum={1} />

      <Spacer />
      <ThinLine />
      <Spacer />

      {/* 第二栏 */}
      <RowRenderer vm={vm} settings={settings} rowNum={2} />

      <Spacer />
      <ThinLine />
      <Spacer />

      {/* 第三栏 */}
      <RowRenderer vm={vm} settings={settings} rowNum={3} />
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
    yearUsage: 515,
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
      usage: 515,
      percent: 10.73,
      remain: 2005,
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
