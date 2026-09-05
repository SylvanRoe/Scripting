/**
 * SGCC 国家电网电量小组件 —— 设置页（Scripting 移植版）。
 *
 * 移植/维护（Scripting 版）：SylvanRoe
 * telegram: @Air_QT
 * 更新: 2026/09/05
 * 版本: 1.0.1
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
 */
import {
  Script,
  Navigation,
  NavigationStack,
  List,
  Section,
  Text,
  Button,
  Toggle,
  Picker,
  TextField,
  ColorPicker,
  HStack,
  Spacer,
  Widget,
  useState,
  type Color,
} from 'scripting'
import { loadSettings, saveSettings, resetSettings } from './lib/store'
import { listAccounts } from './lib/api'
import { clearCache } from './lib/cache'
import { DEFAULT_SETTINGS, type SGCCSettings } from './lib/types'

type Account = { index: number; consNo: string; consName: string }

function SettingsView() {
  const dismiss = Navigation.useDismiss()
  const [settings, setSettings] = useState<SGCCSettings>(loadSettings)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const patch = <K extends keyof SGCCSettings>(key: K, value: SGCCSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const patchAccName = (index: number, value: string) => {
    setSettings(prev => {
      const accNames = [...(prev.accNames ?? [])]
      accNames[index] = value
      return { ...prev, accNames }
    })
  }

  // 显式保存：改动先在本地状态里，点右上角「保存」后落盘，小组件下次刷新才读到新配置
  const save = () => {
    saveSettings(settings)
    setStatus('已保存')
  }

  const loadAccountList = async () => {
    if (loading) return
    setLoading(true)
    setStatus('正在获取账户（首次可能较慢，受 wsgw 登录影响）…')
    try {
      const list = await listAccounts(loadSettings())
      setAccounts(list)
      setStatus(`已获取 ${list.length} 个账户`)
    } catch (e) {
      setStatus(`获取失败：${e instanceof Error ? e.message : e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="国家电网"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />,
          confirmationAction: <Button title="保存" action={save} />,
        }}
      >
        <Section
          header={<Text>账户</Text>}
          footer={
            <Text font="caption">
              多户时选择要显示的账户。需先点击「获取账户列表」。
            </Text>
          }
        >
          <Button
            title={loading ? '获取中…' : '获取账户列表'}
            action={loadAccountList}
            disabled={loading}
          />
          {accounts.length > 0 ? (
            <Picker
              title="当前账户"
              value={settings.accountIndex}
              onChanged={(v: number) => patch('accountIndex', v)}
              pickerStyle="menu"
            >
              {accounts.map(a => (
                <Text key={String(a.index)} tag={a.index}>
                  {a.consName || `账户 ${a.index + 1}`}
                </Text>
              ))}
            </Picker>
          ) : (
            <HStack>
              <Text>账户下标</Text>
              <Spacer />
              <Text foregroundStyle="secondaryLabel">{settings.accountIndex}</Text>
            </HStack>
          )}
          {status ? (
            <Text font="caption" foregroundStyle="secondaryLabel">
              {status}
            </Text>
          ) : null}
        </Section>

        <Section
          header={<Text>多户配置</Text>}
          footer={
            <Text font="caption">
              给每个账户起个能区分的名字。桌面上放多个小组件时，在每个小组件的「参数」里填对应的户名（或 1/2/3），该小组件就会固定显示这一户。以下「户 1/2/3」按上面「当前账户」列表的顺序对应。改完记得点右上角「保存」。
            </Text>
          }
        >
          {[0, 1, 2].map(i => (
            <TextField
              key={i}
              title={`户 ${i + 1} 名称`}
              prompt="留空显示实际户名"
              value={settings.accNames[i] ?? ''}
              onChanged={v => patchAccName(i, v)}
            />
          ))}
        </Section>

        <Section
          header={<Text>显示</Text>}
          footer={<Text font="caption">柱状图展示最近若干天的用电量。改动后请点右上角「保存」生效。</Text>}
        >
          <Toggle
            title="显示户名"
            value={settings.showConsName}
            onChanged={v => patch('showConsName', v)}
          />
          <Picker
            title="柱状图天数"
            value={settings.dayAmount}
            onChanged={(v: number) => patch('dayAmount', v)}
            pickerStyle="menu"
          >
            {[5, 6, 7, 8, 9, 10].map(n => (
              <Text key={String(n)} tag={n}>
                {`${n} 天`}
              </Text>
            ))}
          </Picker>
          <HStack>
            <Text>阶梯口径</Text>
            <Spacer />
            <Text foregroundStyle="secondaryLabel">按年累计</Text>
          </HStack>
          <ColorPicker
            title="柱状图颜色"
            value={settings.chartColor as Color}
            onChanged={v => patch('chartColor', v as string)}
            supportsOpacity={false}
          />
          <ColorPicker
            title="主题色"
            value={settings.accentColor as Color}
            onChanged={v => patch('accentColor', v as string)}
            supportsOpacity={false}
          />
        </Section>

        <Section
          header={<Text>阶梯</Text>}
          footer={
            <Text font="caption">
              按你的实际电表档位填写，单位度。留空表示按山东口径自动（按年累计 2520/4800 度）。改动后请点右上角「保存」生效。
            </Text>
          }
        >
          <TextField
            title="第二档阈值（度）"
            prompt="0 = 自动"
            value={settings.step2 > 0 ? String(settings.step2) : ''}
            onChanged={v => patch('step2', parseInt(v, 10) || 0)}
          />
          <TextField
            title="第三档阈值（度）"
            prompt="0 = 自动"
            value={settings.step3 > 0 ? String(settings.step3) : ''}
            onChanged={v => patch('step3', parseInt(v, 10) || 0)}
          />
        </Section>

        <Section
          header={<Text>数据</Text>}
          footer={
            <Text font="caption">
              刷新间隔越短越耗流量。数据依赖 wsgw 重写抓取的接口。
            </Text>
          }
        >
          <Picker
            title="刷新间隔"
            value={settings.interval}
            onChanged={(v: number) => patch('interval', v)}
            pickerStyle="menu"
          >
            {[60, 120, 240, 360, 720, 1440].map(n => (
              <Text key={String(n)} tag={n}>
                {n >= 60 ? `${n / 60} 小时` : `${n} 分钟`}
              </Text>
            ))}
          </Picker>
          <Button
            title="清除缓存"
            role="destructive"
            action={() => {
              clearCache()
              setStatus('缓存已清除')
            }}
          />
        </Section>

        <Section
          header={<Text>预览</Text>}
          footer={
            <Text font="caption">
              预览页顶部可切换参数：「真实数据」走接口（读取的是已保存的设置，改动后请先点「保存」），「演示数据」不联网、用于校对布局。
            </Text>
          }
        >
          <Button
            title="预览中号小组件"
            action={async () => {
              await Widget.preview<'真实数据' | '演示数据'>({
                family: 'systemMedium',
                parameters: {
                  options: {
                    '真实数据': '',
                    '演示数据': 'demo',
                  },
                  default: '真实数据',
                },
              })
            }}
          />
        </Section>

        <Section>
          <Button
            title="恢复默认设置"
            role="destructive"
            action={() => {
              resetSettings()
              setSettings({ ...DEFAULT_SETTINGS })
              setStatus('已恢复默认设置')
            }}
          />
        </Section>
      </List>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present(<SettingsView />)
  Script.exit()
}

run()
