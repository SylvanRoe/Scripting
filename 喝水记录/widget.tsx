import { VStack, HStack, Text, Image, Spacer, Button, ProgressView, Widget } from "scripting"
import { drinkFor, loadGoal, loadMl, loadRecords, loadSelected, todayRecords, totalMl } from "./model"
import { intentFor } from "./app_intents"

function SmallWidgetView({ total, goal, ml, selected, complete }: { total: number; goal: number; ml: number; selected: string[]; complete: boolean }) {
  const percent = Math.floor((total / goal) * 100)
  const displayDrinks = selected.slice(0, 2)
  const tintColor = complete ? "#22A064" : "#3B82F6"

  return (
    <VStack alignment="leading" spacing={4} padding={{ vertical: 24, horizontal: 34 }} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
      {/* 顶部标题与目标副标题 */}
      <HStack spacing={4} alignment="center">
        <Image systemName="drop.fill" foregroundStyle="#3B82F6" font={14} />
        <Text font={14} fontWeight="bold">喝水记录</Text>
        <Spacer />
        <Text font={12} fontWeight="semibold" foregroundStyle="tertiaryLabel">
          {goal}mL
        </Text>
      </HStack>

      {/* 摄入量数字与百分比主视觉 */}
      <HStack alignment="lastTextBaseline" spacing={4}>
        <Text font={28} fontWeight="bold" monospacedDigit lineLimit={1} minScaleFactor={0.75}>
          {total}
        </Text>
        <Text font={12} fontWeight="medium" foregroundStyle="secondaryLabel">mL</Text>
        <Spacer />
        <Text font={18} fontWeight="bold" foregroundStyle={tintColor}>
          {percent}%
        </Text>
      </HStack>

      {/* 加粗进度条 */}
      <ProgressView
        value={Math.min(total, goal)}
        total={goal}
        tint={tintColor}
        scaleEffect={{ x: 1, y: 2 }}
        padding={{ vertical: 2 }}
      />

      <Spacer />

      {/* 快捷按钮区域 */}
      <HStack alignment="center" spacing={16} frame={{ maxWidth: "infinity" }}>
        <Spacer />
        {displayDrinks.map(id => {
          const drink = drinkFor(id)
          return (
            <Button key={id} intent={intentFor(id)} buttonStyle="plain">
              <VStack
                alignment="center"
                frame={{ width: 42, height: 42 }}
                background={{ style: "quaternarySystemFill", shape: "circle" }}
              >
                <Image systemName={drink.icon} font={20} foregroundStyle={drink.color} />
              </VStack>
            </Button>
          )
        })}
        <Spacer />
      </HStack>
    </VStack>
  )
}

function MediumOrLargeWidgetView({ total, goal, ml, selected, complete, family }: { total: number; goal: number; ml: number; selected: string[]; complete: boolean; family: string }) {
  const displayDrinks = selected.slice(0, 2)
  const percent = Math.floor((total / goal) * 100)
  const tintColor = complete ? "#22A064" : "#3B82F6"

  return (
    <VStack alignment="leading" spacing={10} padding={24} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
      {/* 标题行 */}
      <HStack spacing={6} alignment="center">
        <Image systemName="drop.fill" foregroundStyle="#3B82F6" font={16} />
        <Text font={16} fontWeight="bold">喝水记录</Text>
        <Spacer />
        <Text font={13} fontWeight="medium" foregroundStyle="secondaryLabel">目标 {goal} mL</Text>
      </HStack>

      {/* 摄入量数字与百分比 */}
      <HStack alignment="lastTextBaseline" spacing={6}>
        <Text font={34} fontWeight="bold" monospacedDigit lineLimit={1} minScaleFactor={0.75}>{total}</Text>
        <Text font={14} fontWeight="medium" foregroundStyle="secondaryLabel">mL</Text>
        <Spacer />
        <Text font={24} fontWeight="bold" foregroundStyle={tintColor}>{percent}%</Text>
      </HStack>

      {/* 加粗进度条 */}
      <ProgressView
        value={Math.min(total, goal)}
        total={goal}
        tint={tintColor}
        scaleEffect={{ x: 1, y: 2 }}
        padding={{ vertical: 2 }}
      />

      <Spacer />

      {/* 快捷按钮 */}
      <HStack alignment="center" spacing={20} frame={{ maxWidth: "infinity" }}>
        <Spacer />
        {displayDrinks.map(id => {
          const drink = drinkFor(id)
          return (
            <Button key={id} intent={intentFor(id)} buttonStyle="plain">
              <HStack
                alignment="center"
                spacing={8}
                padding={{ horizontal: 18, vertical: 10 }}
                background={{ style: "quaternarySystemFill", shape: "capsule" }}
              >
                <Image systemName={drink.icon} font={20} foregroundStyle={drink.color} />
                <Text font={14} fontWeight="semibold">{drink.name}</Text>
              </HStack>
            </Button>
          )
        })}
        <Spacer />
      </HStack>
    </VStack>
  )
}

function WidgetView() {
  const family = Widget.family || "systemSmall"
  const total = totalMl(todayRecords(loadRecords()))
  const goal = loadGoal()
  const ml = loadMl()
  const selected = loadSelected()
  const complete = total >= goal

  if (family === "systemSmall") {
    return <SmallWidgetView total={total} goal={goal} ml={ml} selected={selected} complete={complete} />
  }
  return <MediumOrLargeWidgetView total={total} goal={goal} ml={ml} selected={selected} complete={complete} family={family} />
}

// 本地午夜后请求新时间线，避免沿用昨天的统计；实际刷新时间由 iOS 决定。
const midnight = new Date()
midnight.setHours(24, 0, 1, 0)
try {
  Widget.present(<WidgetView />, { policy: "after", date: midnight })
} catch (error) {
  Widget.present(<Text>数据读取失败，请打开喝水记录检查。</Text>)
}
