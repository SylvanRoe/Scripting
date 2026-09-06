import {
  Navigation, NavigationStack, List, Section, VStack, HStack, Text, TextField,
  Image, Spacer, Button, Toggle, Picker, ProgressView, Widget, useState,
} from "scripting"
import {
  DRINKS, KEYS, DrinkRecord, addRecord, drinkFor, loadGoal, loadHealth, loadMl,
  loadRecords, loadSelected, parseAmount, put, removeRecords, syncPendingWater,
  todayRecords, totalMl,
} from "./model"

export default function WaterView() {
  const dismiss = Navigation.useDismiss()
  const [records, setRecords] = useState<DrinkRecord[]>(loadRecords)
  const [goal, setGoal] = useState(loadGoal)
  const [ml, setMl] = useState(loadMl)
  const [goalText, setGoalText] = useState(() => String(loadGoal()))
  const [mlText, setMlText] = useState(() => String(loadMl()))
  const [selected, setSelected] = useState(loadSelected)
  const [health, setHealth] = useState(loadHealth)
  const [drinkId, setDrinkId] = useState("water")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const today = todayRecords(records).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const total = totalMl(today)
  const pending = records.filter(r => r.drinkTypeId === "water" && (r.healthState === "pending" || r.healthState === "failed")).length
  const uncertain = records.filter(r => r.healthState === "syncing").length
  const dirty = goalText !== String(goal) || mlText !== String(ml)

  async function perform(action: () => void | Promise<void>) {
    if (busy) return
    setBusy(true)
    try { await action() }
    catch (error) { setMessage(String(error)); await (globalThis as any).alert({ title: "操作未完成", message: String(error) }) }
    finally { setBusy(false) }
  }
  function reload() {
    setRecords(loadRecords())
    setGoal(loadGoal()); setMl(loadMl())
    setSelected(loadSelected()); setHealth(loadHealth())
  }
  function record(id: string) {
    void perform(() => {
      if (dirty) throw new Error("容量或目标尚未保存，请先保存设置")
      const saved = addRecord(id, loadMl())
      setRecords(loadRecords())
      setMessage(`已记录 ${drinkFor(id).name} ${saved.ml} mL${saved.healthState === "pending" ? " · 待同步到健康" : ""}`)
    })
  }
  function saveSettings() {
    void perform(() => {
      const nextGoal = parseAmount(goalText)
      const nextMl = parseAmount(mlText)
      if (nextGoal === null || nextMl === null) throw new Error("容量和目标都必须是大于 0 的整数")
      put(KEYS.ml, nextMl)
      setMl(nextMl); setMlText(String(nextMl))
      put(KEYS.goal, nextGoal)
      setGoal(nextGoal); setGoalText(String(nextGoal))
      Widget.reloadAll()
      setMessage("设置已保存，小组件已请求刷新")
    })
  }
  function toggleDrink(id: string, enabled: boolean) {
    void perform(() => {
      const current = loadSelected()
      let next: string[]
      if (enabled) {
        if (current.includes(id)) return
        if (current.length >= 2) throw new Error("小组件最多只能设置 2 种饮品")
        next = [...current, id]
      } else {
        next = current.filter(item => item !== id)
        if (next.length < 1) throw new Error("小组件最少需要保留 1 种饮品")
      }
      put(KEYS.drinks, next); setSelected(next); Widget.reloadAll()
    })
  }
  function deleteLocal(ids: string[]) {
    void perform(() => {
      removeRecords(ids)
      setRecords(loadRecords())
      setMessage(ids.length > 1 ? "已清空今日记录" : "记录已删除")
    })
  }

  return <NavigationStack>
    <List navigationTitle="喝水记录" navigationBarTitleDisplayMode="large"
      toolbar={{
        cancellationAction: <Button title="关闭" action={dismiss} disabled={busy} />,
        primaryAction: <Button title="刷新" systemImage="arrow.clockwise" disabled={busy} action={() => { void perform(() => { reload(); setMessage("已刷新今日记录") }) }} />,
      }}>
      <Section>
        <VStack alignment="leading" spacing={14} padding={{ vertical: 10 }}>
          <HStack>
            <Image systemName="drop.fill" foregroundStyle="#3B82F6" />
            <Text font="subheadline" foregroundStyle="secondaryLabel">今日饮品摄入</Text>
            <Spacer />
            <Text font="caption" foregroundStyle="secondaryLabel">{today.length} 次</Text>
          </HStack>
          <HStack alignment="firstTextBaseline" spacing={6}>
            <Text font={40} fontWeight="bold" monospacedDigit>{total}</Text>
            <Text foregroundStyle="secondaryLabel">/ {goal} mL</Text>
          </HStack>
          <ProgressView value={Math.min(total, goal)} total={goal} tint={total >= goal ? "#22A064" : "#3B82F6"} />
          <Text font="subheadline" foregroundStyle={total >= goal ? "#22A064" : "secondaryLabel"}>
            {total >= goal ? "今日目标已达成" : `还差 ${goal - total} mL · 已完成 ${Math.floor(total / goal * 100)}%`}
          </Text>
        </VStack>
      </Section>
      <Section header={<Text>记一杯</Text>} footer={<Text>统计包含所有饮品的体积；只有「水」可同步到健康 App。</Text>}>
        <Picker title="饮品" value={drinkId} onChanged={setDrinkId}>
          {DRINKS.map(drink => <Text key={drink.id} tag={drink.id}>{drink.name}</Text>)}
        </Picker>
        <Button title={`记录${drinkFor(drinkId).name} · ${ml} mL`} systemImage="plus.circle.fill" disabled={busy || dirty} action={() => record(drinkId)} />
        {message ? <Text font="footnote" foregroundStyle="secondaryLabel">{message}</Text> : null}
      </Section>
      <Section header={<Text>容量与目标</Text>} footer={<Text>编辑完成后点击保存。每次容量同时用于页面和小组件。</Text>}>
        <HStack>
          <Text>每次容量</Text><Spacer />
          <TextField title="容量" value={mlText} onChanged={setMlText} keyboardType="numberPad" frame={{ width: 90 }} multilineTextAlignment="trailing" />
          <Text foregroundStyle="secondaryLabel">mL</Text>
        </HStack>
        <HStack>
          <Text>每日目标</Text><Spacer />
          <TextField title="目标" value={goalText} onChanged={setGoalText} keyboardType="numberPad" frame={{ width: 90 }} multilineTextAlignment="trailing" />
          <Text foregroundStyle="secondaryLabel">mL</Text>
        </HStack>
        <Button title="保存设置" disabled={busy || !dirty} action={saveSettings} />
      </Section>
      <Section header={<Text>今日记录 · {today.length} 条</Text>}>
        {today.length ? today.map(record => {
          const drink = drinkFor(record.drinkTypeId)
          const status = record.healthState === "synced" ? " · 已同步" : record.healthState === "pending" ? " · 待同步" : record.healthState === "failed" ? " · 同步失败" : record.healthState === "syncing" ? " · 同步状态待核对" : ""
          return <HStack key={record.id} spacing={12}>
            <Image systemName={drink.icon} foregroundStyle={drink.color} frame={{ width: 24 }} />
            <VStack alignment="leading" spacing={3}>
              <Text>{drink.name}</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">{new Date(record.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}{status}</Text>
            </VStack>
            <Spacer />
            <Text monospacedDigit>{record.ml} mL</Text>
            <Button title="删除" systemImage="trash" role="destructive" buttonStyle="borderless" disabled={busy} action={() => deleteLocal([record.id])} />
          </HStack>
        }) : <Text foregroundStyle="secondaryLabel">还没有记录，先记一杯吧。</Text>}
        {today.length ? <Button title="清空今日记录" role="destructive" disabled={busy} action={() => deleteLocal(today.map(r => r.id))} /> : null}
      </Section>
      <Section header={<Text>健康 App</Text>} footer={<Text>开启后，新记录的「水」加入待同步列表；点击下方按钮写入健康，首次可能请求权限。小组件不弹授权。旧记录不补写，避免重复。关闭开关不会删除已同步的数据。</Text>}>
        <Toggle title="将新饮水记录加入同步队列" value={health} disabled={busy} onChanged={value => { void perform(() => { put(KEYS.health, value); setHealth(value) }) }} />
        <Button title={busy ? "请稍候…" : `同步待处理饮水 · ${pending} 条`} disabled={busy || !health || !pending} action={() => { void perform(async () => { try { setMessage(await syncPendingWater()) } finally { setRecords(loadRecords()) } }) }} />
        {uncertain ? <Text font="footnote" foregroundStyle="orange">{uncertain} 条记录的同步曾中断，请在健康 App 核对；为避免重复，不会自动重写。</Text> : null}
      </Section>
      <Section header={<Text>小组件饮品</Text>} footer={<Text>最少选择 1 种，最多选择 2 种。将按选择顺序呈现在桌面小组件中。</Text>}>
        {DRINKS.map(drink => <Toggle key={drink.id} value={selected.includes(drink.id)} disabled={busy} onChanged={value => toggleDrink(drink.id, value)}>
          <HStack><Image systemName={drink.icon} foregroundStyle={drink.color} frame={{ width: 24 }} /><Text>{drink.name}</Text></HStack>
        </Toggle>)}
      </Section>
    </List>
  </NavigationStack>
}
