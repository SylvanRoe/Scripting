/**
 * 电量 / 电费计算逻辑。
 * 移植自原 Scriptable 脚本 (@脑瓜 v2.3.3) 的同名方法，行为保持一致。
 */
import type { DayEle, MonthEle, RawAccount, BillViewModel, StepInfo, SGCCSettings } from './types'

function num(v: unknown, fallback = 0): number {
  const n = parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : fallback
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 归一化按日用电，过滤掉占位的 '-' */
export function normalizeDayEle(account: RawAccount): DayEle[] {
  const list = account.dayElecQuantity31?.sevenEleList
  if (!Array.isArray(list)) return []
  return list
    .filter(item => item.dayElePq !== '-')
    .map(item => ({
      label: String(item.day ?? ''),
      elePq: num(item.dayElePq),
    }))
}

/** 归一化按月用电 */
export function normalizeMonthEle(account: RawAccount): MonthEle[] {
  const list = account.monthElecQuantity?.mothEleList
  if (!Array.isArray(list)) return []
  return list.map(item => ({
    label: String(item.month ?? ''),
    elePq: num(item.monthEleNum),
    cost: num(item.monthEleCost),
  }))
}

/**
 * 本月累计电量。
 * 若本月尚无日数据，则回退到上月合计（但上月已有月度结算数据时视为 0）。
 */
export function sumCurrentMonth(dayEle: DayEle[], monthEle: MonthEle[]): number {
  const sumForMonth = (year: number, month: number): number => {
    const prefix = `${year}${String(month).padStart(2, '0')}`
    return dayEle
      .filter(item => item.label.startsWith(prefix))
      .reduce((sum, item) => sum + item.elePq, 0)
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  let sum = sumForMonth(year, month)

  if (sum === 0) {
    const prevYear = month === 1 ? year - 1 : year
    const prevMonth = month === 1 ? 12 : month - 1
    const prevLabel = `${prevYear}${String(prevMonth).padStart(2, '0')}`
    const settled = monthEle.some(item => item.label === prevLabel)
    sum = settled ? 0 : sumForMonth(prevYear, prevMonth)
  }

  return round2(sum)
}

/**
 * 阶梯阀值。默认山东口径：按月 210/400 度，按年累计 2520/4800 度（= 210×12 / 400×12）。
 * 各地档位略有差异，可在设置里用 step2/step3 覆盖。
 */
export function stepThresholds(mode: SGCCSettings['stepMode'] = '年'): { step2: number; step3: number } {
  return mode === '月'
    ? { step2: 210, step3: 400 }
    : { step2: 2520, step3: 4800 }
}

/**
 * 根据桌面小组件的「参数」解析出账户下标（多户区分用）。
 * - 参数为空：用设置里的当前账户。
 * - 参数匹配某自定义户名（忽略大小写）：显示那一户。
 * - 参数是数字 1/2/3：显示对应账户。
 * - 其余情况：回退到当前账户。
 */
export function resolveAccountIndex(param: string, settings: SGCCSettings): number {
  const p = (param ?? '').trim().toLowerCase()
  if (!p) return settings.accountIndex
  const hit = settings.accNames.findIndex(n => n && n.trim().toLowerCase() === p)
  if (hit >= 0) return hit
  const n = parseInt(p, 10)
  if (Number.isFinite(n) && n >= 1) return n - 1
  return settings.accountIndex
}

/**
 * 阶梯用电状态。
 * - 月口径：只看本月累计
 * - 年口径：年度累计（接口 totalYearPq 优先，否则用已结算合计）+ 本月估算
 */
export function buildStepInfo(
  account: RawAccount,
  currentMonthEle: number,
  totalEleNum: number,
  mode: SGCCSettings['stepMode'] = '年',
  override?: { step2?: number; step3?: number },
): StepInfo {
  // 设置里填了阈值就用设置的，否则按山东口径自动（按月 210/400，按年 2520/4800）
  const auto = stepThresholds(mode)
  const step2 = override?.step2 && override.step2 > 0 ? override.step2 : auto.step2
  const step3 = override?.step3 && override.step3 > 0 ? override.step3 : auto.step3

  let usage: number
  if (mode === '月') {
    usage = currentMonthEle
  } else {
    const base = num(
      account.stepElecQuantity?.[0]?.electricParticulars?.totalYearPq,
      totalEleNum,
    )
    usage = base + Math.round(currentMonthEle)
  }
  usage = round2(usage)

  if (usage < step2) {
    return {
      level: 1,
      usage,
      percent: round2((usage / step2) * 100),
      remain: round2(step2 - usage),
      threshold: step2,
      step2,
      step3,
    }
  }

  if (usage > step3) {
    // 第三档展示超出 step3 的部分
    return {
      level: 3,
      usage,
      percent: round2((usage / step3) * 100 - 100),
      remain: 0,
      threshold: step3,
      step2,
      step3,
    }
  }

  return {
    level: 2,
    usage,
    percent: round2((usage / step3) * 100),
    remain: round2(step3 - usage),
    threshold: step3,
    step2,
    step3,
  }
}

/** 把原始账户数据转换为小组件视图模型 */
export function buildViewModel(
  account: RawAccount,
  meta: {
    update: string
    fromCache: boolean
    cacheAgeMinutes: number
    stepMode?: SGCCSettings['stepMode']
    step2?: number
    step3?: number
  },
): BillViewModel {
  const dayElePq = normalizeDayEle(account)
  const monthElePq = normalizeMonthEle(account)
  const currentMonthEle = sumCurrentMonth(dayElePq, monthElePq)

  const bill = account.eleBill
  const isOverdue = account.arrearsOfFees === true
  const isPostPaid = bill != null && Object.prototype.hasOwnProperty.call(bill, 'accountBalance')

  const sumMoney = round2(num(bill?.sumMoney))
  const accountBalance = round2(num(bill?.accountBalance))
  const remainFee = isPostPaid ? accountBalance : sumMoney

  // 上期 = 最近一个已结算月份
  const lastMonth = monthElePq.length > 0 ? monthElePq[monthElePq.length - 1] : undefined
  const monthUsage = lastMonth ? lastMonth.elePq : 0
  const monthFee = lastMonth ? round2(lastMonth.cost) : 0

  const totalEleNum = num(account.monthElecQuantity?.dataInfo?.totalEleNum)
  const totalEleCost = num(account.monthElecQuantity?.dataInfo?.totalEleCost)

  // 年度电量 = 已结算合计 + 本月估算
  const yearUsage = round2(totalEleNum + currentMonthEle)
  const yearFee = round2(totalEleCost)

  // 最近一天用电
  const dayFee = dayElePq.length > 0 ? dayElePq[dayElePq.length - 1].elePq : 0

  return {
    consName: account.userInfo?.consName_dst ?? '国家电网',
    consNo: account.userInfo?.consNo_dst ?? '',
    isOverdue,
    isPostPaid,
    remainFee: isOverdue ? -Math.abs(sumMoney) : remainFee,
    monthFee,
    monthUsage,
    yearFee,
    yearUsage,
    currentMonthEle,
    dayFee,
    dayElePq,
    monthElePq,
    update: meta.update,
    fromCache: meta.fromCache,
    cacheAgeMinutes: meta.cacheAgeMinutes,
    step: buildStepInfo(account, currentMonthEle, totalEleNum, meta.stepMode ?? '年', {
      step2: meta.step2,
      step3: meta.step3,
    }),
  }
}

/** 取最近 n 天用电，用于柱状图；不足 n 天时按实际长度返回 */
export function recentDays(dayElePq: DayEle[], n: number): DayEle[] {
  if (n <= 0) return []
  return dayElePq.slice(-n)
}

/** 把 20260821 格式化为 08-21 */
export function formatDayLabel(label: string): string {
  if (label.length !== 8) return label
  return `${label.slice(4, 6)}-${label.slice(6, 8)}`
}

/** 缓存时长的人类可读描述 */
export function describeCacheAge(minutes: number): string {
  if (minutes < 0) return '无缓存'
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  return `${Math.floor(minutes / 1440)}天前`
}

/** 格式化当前时间为 yyyy-MM-dd HH:mm:ss */
export function nowString(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 从 yyyy-MM-dd HH:mm:ss 提取 MM-dd HH:mm */
export function shortTime(update: string): string {
  const parts = update.split(' ')
  if (parts.length !== 2) return update
  const date = parts[0].split('-')
  const time = parts[1].split(':')
  if (date.length < 3 || time.length < 2) return update
  return `${date[1]}-${date[2]} ${time[0]}:${time[1]}`
}
