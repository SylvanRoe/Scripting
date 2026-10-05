import {
  Widget,
  VStack,
  HStack,
  Text,
  Spacer,
  Image,
  Notification,
} from "scripting";
import { fetchOilData, loadSettings, saveSettings, OilData } from "./api";

// 专属四色油品色彩体系（iOS 原生规范色，克制半透微拟态）
export const OIL_THEMES = {
  oil92: {
    key: "oil92" as const,
    name: "92#",
    fullName: "92# 汽油",
    tint: "#E5933A", // 柔和琥珀金
    tagBg: "rgba(229, 147, 58, 0.18)",
  },
  oil95: {
    key: "oil95" as const,
    name: "95#",
    fullName: "95# 汽油",
    tint: "#4B90E2", // 经典深邃蓝
    tagBg: "rgba(75, 144, 226, 0.18)",
  },
  oil98: {
    key: "oil98" as const,
    name: "98#",
    fullName: "98# 汽油",
    tint: "#34C759", // Apple 规范绿
    tagBg: "rgba(52, 199, 89, 0.18)",
  },
  oil0: {
    key: "oil0" as const,
    name: "0#",
    fullName: "0# 柴油",
    tint: "#A77BEE", // 雅致薰衣草紫
    tagBg: "rgba(167, 123, 238, 0.18)",
  },
};

// 底部次要油品横向磨砂胶囊卡（规整等高）
function SecondaryOilCapsule({
  theme,
  price,
}: {
  theme: typeof OIL_THEMES["oil92"];
  price: string;
}) {
  return (
    <HStack
      alignment="center"
      spacing={4}
      padding={{ top: 5.5, bottom: 5.5, leading: 7, trailing: 7 }}
      background="rgba(255, 255, 255, 0.05)"
      clipShape={{ type: "rect", cornerRadius: 8 }}
      frame={{ maxWidth: "infinity" }}
    >
      <HStack
        alignment="center"
        padding={{ top: 1.5, bottom: 1.5, leading: 4, trailing: 4 }}
        background={theme.tagBg}
        clipShape={{ type: "rect", cornerRadius: 3.5 }}
      >
        <Text
          font="caption2"
          fontWeight="semibold"
          foregroundStyle={theme.tint}
        >
          {theme.name}
        </Text>
      </HStack>
      <Spacer />
      <HStack alignment="lastTextBaseline" spacing={1}>
        <Text
          font="caption2"
          fontWeight="medium"
          foregroundStyle="rgba(255, 255, 255, 0.4)"
        >
          ¥
        </Text>
        <Text
          font="caption"
          fontWeight="bold"
          foregroundStyle="#FFFFFF"
        >
          {price}
        </Text>
      </HStack>
    </HStack>
  );
}

// 中尺寸小组件 (systemMedium - 严格等距垂直节奏与协调顶栏)
function MediumWidgetView({
  data,
  focusOilKey,
}: {
  data: OilData;
  focusOilKey: keyof typeof OIL_THEMES;
}) {
  const isDown = data.trendType === "down";
  const isUp = data.trendType === "up";

  // 状态色与氛围微光
  const trendColor = isDown ? "#34C759" : isUp ? "#FF453A" : "#FF9F0A";
  const trendCardBg = isDown
    ? "rgba(52, 199, 89, 0.08)"
    : isUp
    ? "rgba(255, 69, 58, 0.08)"
    : "rgba(255, 159, 10, 0.08)";

  const trendIcon = isDown ? "arrow.down" : isUp ? "arrow.up" : "minus";

  // 高级深黑灰渐变背景
  const widgetBg = {
    colors: ["#161920", "#0D0E12"],
    startPoint: "top" as const,
    endPoint: "bottom" as const,
  };

  const tonNum = data.valPerTon.replace(/元\/吨/, "").trim() || "--";

  // 选中的主力油品与其余油品
  const focusTheme = OIL_THEMES[focusOilKey] || OIL_THEMES.oil92;
  const focusPrice = data.prices[focusOilKey] || data.prices.oil92;

  const secondaryThemes = (
    Object.keys(OIL_THEMES) as Array<keyof typeof OIL_THEMES>
  ).filter((k) => k !== focusOilKey);

  // 精炼日期展示（剔除生硬的 24时）
  const cleanDate = data.nextAdjustDate.replace(/24时/, "").trim();

  return (
    <VStack
      alignment="leading"
      spacing={8} // 统一垂直步长，上下模块间距严格一致为 8pt
      padding={{ top: 11, bottom: 11, leading: 13, trailing: 13 }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={widgetBg}
    >
      {/* 1. 顶部 Header：全新协调精致排版（左侧微底座图标+省份标题，右侧流线型一体化胶囊） */}
      <HStack alignment="center">
        {/* 左侧：微透圆角底座 + 图标 + 省份大字 + 副标 */}
        <HStack alignment="center" spacing={6}>
          <HStack
            alignment="center"
            padding={{ top: 3.5, bottom: 3.5, leading: 5, trailing: 5 }}
            background="rgba(255, 255, 255, 0.09)"
            clipShape={{ type: "rect", cornerRadius: 6 }}
          >
            <Image
              systemName="fuelpump.fill"
              font="caption2"
              foregroundStyle="#FFFFFF"
            />
          </HStack>

          <HStack alignment="firstTextBaseline" spacing={3.5}>
            <Text
              font="subheadline"
              fontWeight="bold"
              foregroundStyle="#FFFFFF"
            >
              {data.province}
            </Text>
            <Text
              font="caption2"
              fontWeight="medium"
              foregroundStyle="rgba(255, 255, 255, 0.45)"
            >
              今日油价
            </Text>
          </HStack>
        </HStack>

        <Spacer />

        {/* 右侧：一体化微透流线型时间胶囊（告别生硬的多层嵌套） */}
        <HStack
          alignment="center"
          spacing={4}
          padding={{ top: 3, bottom: 3, leading: 8, trailing: 8 }}
          background="rgba(255, 255, 255, 0.07)"
          clipShape={{ type: "rect", cornerRadius: 8 }}
        >
          <Image
            systemName="clock.fill"
            font="caption2"
            foregroundStyle="rgba(255, 255, 255, 0.45)"
          />
          <Text
            font="caption2"
            fontWeight="medium"
            foregroundStyle="rgba(255, 255, 255, 0.85)"
          >
            {cleanDate}
          </Text>
          {data.adjustDaysDesc ? (
            <HStack alignment="center" spacing={2.5}>
              <Text
                font="caption2"
                foregroundStyle="rgba(255, 255, 255, 0.3)"
              >
                ·
              </Text>
              <Text
                font="caption2"
                fontWeight="semibold"
                foregroundStyle={trendColor}
              >
                {data.adjustDaysDesc}
              </Text>
            </HStack>
          ) : null}
        </HStack>
      </HStack>

      {/* 2. 中部核心区：调价深度看板 (左 60%) + 主力油品高光聚焦大卡 (右 40%) */}
      <HStack spacing={7} frame={{ maxWidth: "infinity" }}>
        {/* 左侧：调价预测深度看板 */}
        <VStack
          alignment="leading"
          spacing={3.5}
          padding={{ top: 6.5, bottom: 6.5, leading: 9.5, trailing: 9.5 }}
          background={trendCardBg}
          clipShape={{ type: "rect", cornerRadius: 10 }}
          frame={{ maxWidth: "infinity" }}
        >
          {/* 状态与策略微标 */}
          <HStack alignment="center">
            <HStack alignment="center" spacing={3}>
              <Image
                systemName={trendIcon}
                font="caption2"
                fontWeight="bold"
                foregroundStyle={trendColor}
              />
              <Text
                font="caption2"
                fontWeight="semibold"
                foregroundStyle={trendColor}
              >
                {data.trendDesc}
              </Text>
            </HStack>
            <Spacer />
            {/* 建议策略标签 */}
            <HStack
              alignment="center"
              padding={{ top: 1, bottom: 1, leading: 4.5, trailing: 4.5 }}
              background="rgba(255, 255, 255, 0.08)"
              clipShape={{ type: "rect", cornerRadius: 3.5 }}
            >
              <Text
                font="caption2"
                fontWeight="medium"
                foregroundStyle="rgba(255, 255, 255, 0.75)"
              >
                {data.advice}
              </Text>
            </HStack>
          </HStack>

          {/* 核心吨价数字 */}
          <HStack alignment="lastTextBaseline" spacing={2}>
            <Text
              font="title3"
              fontWeight="bold"
              foregroundStyle="#FFFFFF"
            >
              {tonNum}
            </Text>
            <Text
              font="caption2"
              fontWeight="medium"
              foregroundStyle="rgba(255, 255, 255, 0.65)"
            >
              元/吨
            </Text>
          </HStack>

          {/* 升价折算 */}
          {data.valPerLiter ? (
            <Text
              font="caption2"
              fontWeight="regular"
              foregroundStyle="rgba(255, 255, 255, 0.5)"
            >
              约 {data.valPerLiter}
            </Text>
          ) : null}
        </VStack>

        {/* 右侧：主力油品高光聚焦大卡 */}
        <VStack
          alignment="leading"
          spacing={2.5}
          padding={{ top: 6.5, bottom: 6.5, leading: 10, trailing: 10 }}
          background="rgba(255, 255, 255, 0.06)"
          clipShape={{ type: "rect", cornerRadius: 10 }}
          frame={{ width: 122 }}
        >
          {/* 主力油标与水滴 */}
          <HStack alignment="center" spacing={3}>
            <Image
              systemName="drop.fill"
              font="caption2"
              foregroundStyle={focusTheme.tint}
            />
            <Text
              font="caption2"
              fontWeight="bold"
              foregroundStyle={focusTheme.tint}
            >
              {focusTheme.fullName}
            </Text>
          </HStack>

          {/* 超大核心价格 */}
          <HStack alignment="lastTextBaseline" spacing={1}>
            <Text
              font="caption"
              fontWeight="semibold"
              foregroundStyle="rgba(255, 255, 255, 0.45)"
            >
              ¥
            </Text>
            <Text
              font="title2"
              fontWeight="bold"
              foregroundStyle="#FFFFFF"
            >
              {focusPrice}
            </Text>
          </HStack>

          {/* 辅助单位 */}
          <Text
            font="caption2"
            fontWeight="regular"
            foregroundStyle="rgba(255, 255, 255, 0.35)"
          >
            元/升
          </Text>
        </VStack>
      </HStack>

      {/* 3. 底部次要油品横向三联轻量磨砂胶囊（与中部模块严格等距 8pt） */}
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        {secondaryThemes.map((key) => (
          <SecondaryOilCapsule
            key={key}
            theme={OIL_THEMES[key]}
            price={data.prices[key]}
          />
        ))}
      </HStack>
    </VStack>
  );
}

// 小尺寸小组件 (systemSmall)
function SmallWidgetView({
  data,
  focusOilKey,
}: {
  data: OilData;
  focusOilKey: keyof typeof OIL_THEMES;
}) {
  const isDown = data.trendType === "down";
  const isUp = data.trendType === "up";

  const trendColor = isDown ? "#34C759" : isUp ? "#FF453A" : "#FF9F0A";
  const trendCardBg = isDown
    ? "rgba(52, 199, 89, 0.08)"
    : isUp
    ? "rgba(255, 69, 58, 0.08)"
    : "rgba(255, 159, 10, 0.08)";

  const trendIcon = isDown ? "arrow.down" : isUp ? "arrow.up" : "minus";

  const widgetBg = {
    colors: ["#161920", "#0D0E12"],
    startPoint: "top" as const,
    endPoint: "bottom" as const,
  };

  const tonNum = data.valPerTon.replace(/元\/吨/, "").trim() || "--";

  const focusTheme = OIL_THEMES[focusOilKey] || OIL_THEMES.oil92;
  const focusPrice = data.prices[focusOilKey] || data.prices.oil92;

  const secondaryThemes = (
    Object.keys(OIL_THEMES) as Array<keyof typeof OIL_THEMES>
  ).filter((k) => k !== focusOilKey);

  const cleanDate = data.nextAdjustDate.replace(/24时/, "").trim();

  return (
    <VStack
      alignment="leading"
      spacing={6}
      padding={{ top: 9.5, bottom: 9.5, leading: 10, trailing: 10 }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={widgetBg}
    >
      {/* 顶部：省份与倒计时 */}
      <HStack alignment="center" spacing={4}>
        <HStack
          alignment="center"
          padding={3}
          background="rgba(255, 255, 255, 0.09)"
          clipShape={{ type: "rect", cornerRadius: 5 }}
        >
          <Image
            systemName="fuelpump.fill"
            font="caption2"
            foregroundStyle="#FFFFFF"
          />
        </HStack>
        <Text font="caption" fontWeight="bold" foregroundStyle="#FFFFFF">
          {data.province}
        </Text>
        <Spacer />
        <HStack
          alignment="center"
          padding={{ top: 1.5, bottom: 1.5, leading: 5, trailing: 5 }}
          background="rgba(255, 255, 255, 0.08)"
          clipShape={{ type: "rect", cornerRadius: 5 }}
        >
          <Text
            font="caption2"
            fontWeight="semibold"
            foregroundStyle="rgba(255, 255, 255, 0.85)"
          >
            {data.adjustDaysDesc || cleanDate}
          </Text>
        </HStack>
      </HStack>

      {/* 调价预测条 */}
      <HStack
        alignment="center"
        spacing={3}
        padding={{ top: 3.5, bottom: 3.5, leading: 6, trailing: 6 }}
        background={trendCardBg}
        clipShape={{ type: "rect", cornerRadius: 6 }}
        frame={{ maxWidth: "infinity" }}
      >
        <Image
          systemName={trendIcon}
          font="caption2"
          fontWeight="bold"
          foregroundStyle={trendColor}
        />
        <Text
          font="caption2"
          fontWeight="semibold"
          foregroundStyle={trendColor}
        >
          {data.trendDesc}
        </Text>
        <Spacer />
        <Text font="caption" fontWeight="bold" foregroundStyle="#FFFFFF">
          {tonNum}
        </Text>
        <Text
          font="caption2"
          fontWeight="medium"
          foregroundStyle="rgba(255, 255, 255, 0.6)"
        >
          元/吨
        </Text>
      </HStack>

      {/* 主力油品特写 */}
      <HStack
        alignment="center"
        padding={{ top: 4, bottom: 4, leading: 7, trailing: 7 }}
        background="rgba(255, 255, 255, 0.06)"
        clipShape={{ type: "rect", cornerRadius: 7 }}
        frame={{ maxWidth: "infinity" }}
      >
        <HStack
          alignment="center"
          padding={{ top: 1, bottom: 1, leading: 3.5, trailing: 3.5 }}
          background={focusTheme.tagBg}
          clipShape={{ type: "rect", cornerRadius: 3 }}
        >
          <Text
            font="caption2"
            fontWeight="bold"
            foregroundStyle={focusTheme.tint}
          >
            {focusTheme.name}
          </Text>
        </HStack>
        <Spacer />
        <HStack alignment="lastTextBaseline" spacing={1}>
          <Text
            font="caption2"
            fontWeight="medium"
            foregroundStyle="rgba(255, 255, 255, 0.45)"
          >
            ¥
          </Text>
          <Text font="headline" fontWeight="bold" foregroundStyle="#FFFFFF">
            {focusPrice}
          </Text>
        </HStack>
      </HStack>

      <Spacer />

      {/* 其余三款油品紧凑三栏 */}
      <HStack spacing={3} frame={{ maxWidth: "infinity" }}>
        {secondaryThemes.map((key) => (
          <VStack
            key={key}
            alignment="center"
            spacing={1}
            padding={{ top: 3, bottom: 3, leading: 1, trailing: 1 }}
            background="rgba(255, 255, 255, 0.04)"
            clipShape={{ type: "rect", cornerRadius: 5 }}
            frame={{ maxWidth: "infinity" }}
          >
            <Text
              font="caption2"
              fontWeight="semibold"
              foregroundStyle={OIL_THEMES[key].tint}
            >
              {OIL_THEMES[key].name}
            </Text>
            <Text
              font="caption2"
              fontWeight="bold"
              foregroundStyle="#FFFFFF"
            >
              {data.prices[key]}
            </Text>
          </VStack>
        ))}
      </HStack>
    </VStack>
  );
}

// 错误回退小组件
function ErrorWidgetView({ message }: { message: string }) {
  const widgetBg = {
    colors: ["#161920", "#0D0E12"],
    startPoint: "top" as const,
    endPoint: "bottom" as const,
  };

  return (
    <VStack
      alignment="center"
      spacing={8}
      padding={12}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={widgetBg}
    >
      <Image
        systemName="exclamationmark.triangle.fill"
        font="title2"
        foregroundStyle="#FF453A"
      />
      <Text font="headline" fontWeight="bold" foregroundStyle="#FFFFFF">
        油价数据获取失败
      </Text>
      <Text
        font="caption"
        foregroundStyle="rgba(255, 255, 255, 0.6)"
        lineLimit={2}
      >
        {message}
      </Text>
    </VStack>
  );
}

// 执行渲染入口
(async () => {
  try {
    const settings = loadSettings();
    let province =
      Widget.parameter?.trim() || settings.selectedProvince || "山东";
    const focusOilKey = settings.focusOil || "oil92";

    const data = await fetchOilData(province);

    // 调价提醒通知
    if (settings.lastForecast && settings.lastForecast !== data.rawForecast) {
      try {
        await Notification.schedule({
          title: `${data.province}油价调整提醒`,
          body: `下次调价：${data.nextAdjustDate}，${data.trendDesc} ${
            data.valPerLiter || data.valPerTon
          }`,
          silent: false,
        });
      } catch {}
    }
    settings.lastForecast = data.rawForecast;
    saveSettings(settings);

    // 双尺寸渲染
    if (Widget.family === "systemMedium") {
      Widget.present(
        <MediumWidgetView data={data} focusOilKey={focusOilKey} />,
        {
          reloadPolicy: {
            policy: "after",
            date: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2小时刷新
          },
        }
      );
    } else {
      Widget.present(
        <SmallWidgetView data={data} focusOilKey={focusOilKey} />,
        {
          reloadPolicy: {
            policy: "after",
            date: new Date(Date.now() + 1000 * 60 * 60 * 2),
          },
        }
      );
    }
  } catch (err: any) {
    Widget.present(<ErrorWidgetView message={err.message || String(err)} />);
  }
})();
