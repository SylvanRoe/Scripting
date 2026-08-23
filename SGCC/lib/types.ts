/**
 * SGCC 国家电网 —— 数据类型定义
 * 数据来源：http://api.wsgw-rewrite.com/electricity/bill/all
 * 需配合 Surge / QuantumultX 等工具的 wsgw 重写抓取 token。
 */

/** 接口原始结构（只声明我们实际用到的字段） */
export interface RawUserInfo {
  consNo_dst?: string
  consName_dst?: string
}

export interface RawDayEleItem {
  day: string
  dayElePq: string
}

export interface RawMonthEleItem {
  month: string
  monthEleNum: string
  monthEleCost: string
}

export interface RawEleBill {
  date?: string
  sumMoney?: string | number
  /** 存在该字段代表是后付费账户 */
  accountBalance?: string | number
}

export interface RawAccount {
  userInfo?: RawUserInfo
  arrearsOfFees?: boolean
  eleBill?: RawEleBill
  dayElecQuantity31?: {
    sevenEleList?: RawDayEleItem[]
  }
  monthElecQuantity?: {
    mothEleList?: RawMonthEleItem[]
    dataInfo?: {
      totalEleNum?: string | number
      totalEleCost?: string | number
    }
  }
  stepElecQuantity?: Array<{
    electricParticulars?: {
      totalYearPq?: string | number
    }
  }>
}

/** 归一化后的按日用电 */
export interface DayEle {
  /** 形如 20260821 */
  label: string
  elePq: number
}

/** 归一化后的按月用电 */
export interface MonthEle {
  /** 形如 202608 */
  label: string
  elePq: number
  cost: number
}

/** 供小组件直接消费的视图模型 */
export interface BillViewModel {
  /** 户名 */
  consName: string
  /** 户号 */
  consNo: string
  /** 是否欠费 */
  isOverdue: boolean
  /** 是否后付费账户 */
  isPostPaid: boolean
  /** 账户余额 / 待缴金额 */
  remainFee: number
  /** 上期（最近一个完整月）电费 */
  monthFee: number
  /** 上期电量 */
  monthUsage: number
  /** 年度累计电费 */
  yearFee: number
  /** 年度累计电量 */
  yearUsage: number
  /** 本月累计电量 */
  currentMonthEle: number
  /** 最近一天用电量 */
  dayFee: number
  /** 近 31 日用电明细（时间升序） */
  dayElePq: DayEle[]
  /** 近 12 月用电明细（时间升序） */
  monthElePq: MonthEle[]
  /** 数据更新时间，形如 2026-08-22 17:30:00 */
  update: string
  /** 数据是否来自缓存 */
  fromCache: boolean
  /** 缓存写入距今的分钟数，无缓存为 -1 */
  cacheAgeMinutes: number
  /** 阶梯用电状态 */
  step: StepInfo
}

/** 阶梯用电状态 */
export interface StepInfo {
  /** 当前档位 1/2/3 */
  level: 1 | 2 | 3
  /** 累计用电量（按计算口径） */
  usage: number
  /** 已用电量占第三档上限 step3 的比例（封顶 100%），与横条/滑块同轴 */
  percent: number
  /** 距下一档还剩多少度，已在第三档时为 0 */
  remain: number
  /** 本档位上限，第三档为 step3 */
  threshold: number
  /** 实际使用的第二档阈值（度）；横条刻度与文字共用，避免设置覆盖后不一致 */
  step2: number
  /** 实际使用的第三档阈值（度） */
  step3: number
}

/** 组件可配置项 */
export interface SGCCSettings {
  /** 账户下标，多户时选择第几户 */
  accountIndex: number
  /** 数据刷新间隔（分钟） */
  interval: number
  /** 近日用电柱状图显示的天数 */
  dayAmount: number
  /** 柱状图颜色 */
  chartColor: string
  /** 主题强调色 */
  accentColor: string
  /** 是否显示户名（关闭则显示"国家电网"） */
  showConsName: boolean
  /** 阶梯计量口径：按月 / 按年累计 */
  stepMode: '月' | '年'
  /** 阶梯第二档阈值（度）。0 表示按月份自动 */
  step2: number
  /** 阶梯第三档阈值（度）。0 表示按月份自动 */
  step3: number
  /** 自定义户名，按账户下标存放（index -> 户名）。桌面小组件参数可复用它们区分多户 */
  accNames: string[]
}

export const DEFAULT_SETTINGS: SGCCSettings = {
  accountIndex: 0,
  interval: 360,
  dayAmount: 7,
  chartColor: '#0db38e',
  accentColor: '#3A9690',
  showConsName: true,
  stepMode: '年',
  step2: 0,
  step3: 0,
  accNames: [],
}
