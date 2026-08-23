/**
 * 取数：请求 wsgw 重写接口，带缓存与重试降级。
 */
import { fetch } from 'scripting'
import { readCache, writeCache, cacheAgeMinutes } from './cache'
import { buildViewModel, nowString } from './calc'
import type { BillViewModel, RawAccount, SGCCSettings } from './types'

const API = 'https://api.wsgw-rewrite.com/electricity/bill/all'
const CACHE_KEY = 'BillData.json'
/**
 * 请求超时（秒）。wsgw 重写需先登录国网再抓多个接口，耗时较长，
 * 模块里给重写的超时是 60s，这里对齐，避免过早掐断导致取不到数据。
 */
const TIMEOUT_SEC = 60
/** 在线请求尝试次数。失败时宁可退回缓存，也不要把小组件卡死 */
const MAX_ATTEMPTS = 1

async function requestOnce(): Promise<RawAccount[]> {
  const res = await fetch(API, { timeout: TIMEOUT_SEC })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json) || json.length === 0) {
    throw new Error('返回数据为空或格式无效')
  }
  return json as RawAccount[]
}

/** 读取缓存中的账户数组，坏数据返回 null */
function readCachedAccounts(): RawAccount[] | null {
  const cached = readCache(CACHE_KEY)
  if (!cached) return null
  try {
    const parsed = JSON.parse(cached)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as RawAccount[]
  } catch {
    console.error('缓存解析失败')
  }
  return null
}

/** 拉取账户数组：优先新鲜缓存 → 在线请求（重试）→ 过期缓存 */
async function fetchAccounts(
  settings: SGCCSettings,
): Promise<{ accounts: RawAccount[]; fromCache: boolean; age: number }> {
  const age = cacheAgeMinutes(CACHE_KEY)
  const cached = readCachedAccounts()

  // 缓存仍在有效期内，直接用
  if (cached && age >= 0 && age < settings.interval) {
    console.log(`使用缓存（${age} 分钟前）`)
    return { accounts: cached, fromCache: true, age }
  }

  // 在线请求
  let lastError: unknown = null
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const accounts = await requestOnce()
      writeCache(CACHE_KEY, JSON.stringify(accounts))
      console.log('在线请求成功')
      return { accounts, fromCache: false, age: 0 }
    } catch (e) {
      lastError = e
      console.log(`请求失败（第 ${attempt + 1} 次）：${e}`)
    }
  }

  // 全部失败，退回过期缓存
  if (cached) {
    console.log('请求失败，使用过期缓存')
    return { accounts: cached, fromCache: true, age }
  }

  throw new Error(`无法获取数据：${lastError instanceof Error ? lastError.message : lastError}`)
}

/** 获取指定账户的视图模型。默认用 settings.accountIndex，传 accountIndex 可在多户场覆盖 */
export async function getBillData(
  settings: SGCCSettings,
  accountIndex?: number,
): Promise<BillViewModel> {
  const { accounts, fromCache, age } = await fetchAccounts(settings)

  const index = Math.min(Math.max(accountIndex ?? settings.accountIndex, 0), accounts.length - 1)
  const account = accounts[index]
  if (!account) throw new Error(`账户下标 ${index} 不存在`)

  const update = account.eleBill?.date || nowString()
  return buildViewModel(account, {
    update,
    fromCache,
    cacheAgeMinutes: age,
    stepMode: settings.stepMode,
    step2: settings.step2,
    step3: settings.step3,
  })
}

/** 列出所有账户，供设置页选择 */
export async function listAccounts(
  settings: SGCCSettings,
): Promise<Array<{ index: number; consNo: string; consName: string }>> {
  const { accounts } = await fetchAccounts(settings)
  return accounts.map((item, index) => ({
    index,
    consNo: item.userInfo?.consNo_dst ?? '',
    consName: item.userInfo?.consName_dst ?? `账户 ${index + 1}`,
  }))
}

export { CACHE_KEY }
