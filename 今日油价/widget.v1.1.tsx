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

// 专属四色油品色彩体系（iOS 原生规范，降低饱和度，克制高级）
const OIL_THEMES = {
  oil92: {
    name: "92#",
    tint: "#E5933A", // 柔和琥珀金
    tagBg: "rgba(229, 147, 58, 0.14)",
  },
  oil95: {
    name: "95#",
    tint: "#4B90E2", // 经典深邃蓝
    tagBg: "rgba(75, 144, 226, 0.14)",
  },
  oil98: {
    name: "98#",
    tint: "#34C759", // Apple 规范绿
    tagBg: "rgba(52, 199, 89, 0.14)",
  },
  oil0: {
    name: "0#",
    tint: "#A77BEE", // 雅致薰衣草紫
    tagBg: "rgba(167, 123, 238, 0.14)",
  },
};

// 中尺寸油价半透明玻璃卡片（4 列并排，精致紧凑）
function MediumOilCard({
  theme,
  price,
}: {
  theme: typeof OIL_THEMES["oil92"];
  price: string;
}) {
  return (
    <VStack
      alignment="center"
      spacing={2}
      padding={{ top: 5, bottom: 5, leading: 2, trailing: 2 }}
      background="rgba(255, 255, 255, 0.05)"
      clipShape={{ type: "rect", cornerRadius: 8 }}
      frame={{ maxWidth: "infinity" }}
    >
      {/* 顶部轻量油品标号小标签 */}
      <HStack
        alignment="center"
        padding={{ top: 1, bottom: 1, leading: 4, trailing: 4 }}
        background={theme.tagBg}
        clipShape={{ type: "rect", cornerRadius: 3 }}
      >
        <Text
          font="caption2"
          fontWeight="semibold"
          foregroundStyle={theme.tint}
        >
          {theme.name}
        </Text>
      </HStack>

      {/* 核心价格数字 */}
      <HStack alignment="lastTextBaseline" spacing={1}>
        <Text
          font="caption2"
          fontWeight="medium"
          foregroundStyle="rgba(255, 255, 255, 0.4)"
        >
          ¥
        </Text>
        <Text
          font="subheadline"
          fontWeight="bold"
          foregroundStyle="#FFFFFF"
        >
          {price}
        </Text>
      </HStack>

      {/* 次级辅助单位 */}
      <Text
        font="caption2"
        fontWeight="regular"
        foregroundStyle="rgba(255, 255, 255, 0.35)"
      >
        元/升
      </Text>
    </VStack>
  );
}

// 小尺寸油价小卡片（2x2 紧凑矩阵）
function SmallOilCard({
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
      padding={{ top: 4, bottom: 4, leading: 6, trailing: 6 }}
      background="rgba(255, 255, 255, 0.05)"
      clipShape={{ type: "rect", cornerRadius: 7 }}
      frame={{ maxWidth: "infinity" }}
    >
      <HStack
        alignment="center"
        padding={{ top: 1, bottom: 1, leading: 3.5, trailing: 3.5 }}
        background={theme.tagBg}
        clipShape={{ type: "rect", cornerRadius: 3 }}
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
          fontWeight="regular"
          foregroundStyle="rgba(255, 255, 255, 0.38)"
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

// 中尺寸小组件 (systemMedium)
function MediumWidgetView({ data }: { data: OilData }) {
  const isDown = data.trendType === "down";
  const isUp = data.trendType === "up";

  // Apple 原生高级绿 / 红 / 橙
  const trendColor = isDown ? "#34C759" : isUp ? "#FF453A" : "#FF9F0A";
  const trendCardBg = isDown
    ? "rgba(52, 199, 89, 0.09)"
    : isUp
    ? "rgba(255, 69, 58, 0.09)"
    : "rgba(255, 159, 10, 0.09)";

  const trendIcon = isDown
    ? "arrow.down"
    : isUp
    ? "arrow.up"
    : "minus";

  // 高级深色磨砂背景
  const widgetBg = {
    colors: ["#16191F", "#0D0E12"],
    startPoint: "top" as const,
    endPoint: "bottom" as const,
  };

  const tonNum = data.valPerTon.replace(/元\/吨/, "").trim() || "--";

  return (
    <VStack
      alignment="leading"
      spacing={6}
      padding={{ top: 9, bottom: 9, leading: 12, trailing: 12 }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={widgetBg}
    >
      {/* 顶部标题行：图标 + 省份今日油价 + 右侧轻量时间胶囊 */}
      <HStack alignment="center" spacing={5}>
        <Image
          systemName="fuelpump.fill"
          font="caption2"
          foregroundStyle="rgba(255, 255, 255, 0.85)"
        />

        <HStack alignment="firstTextBaseline" spacing={3}>
          <Text font="subheadline" fontWeight="bold" foregroundStyle="#FFFFFF">
            {data.province}
          </Text>
          <Text
            font="caption"
            fontWeight="medium"
            foregroundStyle="rgba(255, 255, 255, 0.55)"
          >
            今日油价
          </Text>
        </HStack>

        <Spacer />

        {/* 调价日期与倒计时胶囊 */}
        <HStack
          alignment="center"
          spacing={3}
          padding={{ top: 2, bottom: 2, leading: 5, trailing: 5 }}
          background="rgba(255, 255, 255, 0.08)"
          clipShape={{ type: "rect", cornerRadius: 6 }}
        >
          <Text
            font="caption2"
            fontWeight="medium"
            foregroundStyle="rgba(255, 255, 255, 0.85)"
          >
            {data.nextAdjustDate}
          </Text>
          {data.adjustDaysDesc ? (
            <HStack
              alignment="center"
              padding={{ top: 1, bottom: 1, leading: 3.5, trailing: 3.5 }}
              background="rgba(255, 255, 255, 0.12)"
              clipShape={{ type: "rect", cornerRadius: 3 }}
            >
              <Text
                font="caption2"
                fontWeight="semibold"
                foregroundStyle="#FFFFFF"
              >
                {data.adjustDaysDesc}
              </Text>
            </HStack>
          ) : null}
        </HStack>
      </HStack>

      {/* 预计调价区域（双行紧凑布局：文字 100% 完整展示，大字鲜明，绝不被挤爆） */}
      <VStack
        alignment="leading"
        spacing={2.5}
        padding={{ top: 5, bottom: 5, leading: 9, trailing: 9 }}
        background={trendCardBg}
        clipShape={{ type: "rect", cornerRadius: 8 }}
        frame={{ maxWidth: "infinity" }}
      >
        {/* 第 1 行：状态（左） + 建议操作标签（右） */}
        <HStack alignment="center">
          <HStack alignment="center" spacing={3.5}>
            <Image
              systemName={trendIcon}
              font="caption2"
              fontWeight="bold"
              foregroundStyle={trendColor}
            />
            <Text
              font="caption"
              fontWeight="semibold"
              foregroundStyle={trendColor}
            >
              {data.trendDesc}
            </Text>
          </HStack>

          <Spacer />

          {/* 建议加满/观望微标签 */}
          <HStack
            alignment="center"
            padding={{ top: 1.5, bottom: 1.5, leading: 5, trailing: 5 }}
            background="rgba(255, 255, 255, 0.08)"
            clipShape={{ type: "rect", cornerRadius: 4 }}
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

        {/* 第 2 行：大字重点 150 元/吨 + 辅助折合约 0.11~0.14 元/升（整行宽裕展示） */}
        <HStack alignment="lastTextBaseline" spacing={6}>
          <HStack alignment="lastTextBaseline" spacing={1.5}>
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

          {data.valPerLiter ? (
            <Text
              font="caption2"
              fontWeight="regular"
              foregroundStyle="rgba(255, 255, 255, 0.52)"
            >
              (折合约 {data.valPerLiter})
            </Text>
          ) : null}
        </HStack>
      </VStack>

      <Spacer />

      {/* 4 个油品卡片（横排 4 列，尺寸适配） */}
      <HStack spacing={5} frame={{ maxWidth: "infinity" }}>
        <MediumOilCard theme={OIL_THEMES.oil92} price={data.prices.oil92} />
        <MediumOilCard theme={OIL_THEMES.oil95} price={data.prices.oil95} />
        <MediumOilCard theme={OIL_THEMES.oil98} price={data.prices.oil98} />
        <MediumOilCard theme={OIL_THEMES.oil0} price={data.prices.oil0} />
      </HStack>
    </VStack>
  );
}

// 小尺寸小组件 (systemSmall)
function SmallWidgetView({ data }: { data: OilData }) {
  const isDown = data.trendType === "down";
  const isUp = data.trendType === "up";

  const trendColor = isDown ? "#34C759" : isUp ? "#FF453A" : "#FF9F0A";
  const trendCardBg = isDown
    ? "rgba(52, 199, 89, 0.09)"
    : isUp
    ? "rgba(255, 69, 58, 0.09)"
    : "rgba(255, 159, 10, 0.09)";

  const trendIcon = isDown
    ? "arrow.down"
    : isUp
    ? "arrow.up"
    : "minus";

  const widgetBg = {
    colors: ["#16191F", "#0D0E12"],
    startPoint: "top" as const,
    endPoint: "bottom" as const,
  };

  const tonNum = data.valPerTon.replace(/元\/吨/, "").trim() || "--";

  return (
    <VStack
      alignment="leading"
      spacing={5}
      padding={{ top: 9, bottom: 9, leading: 9, trailing: 9 }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={widgetBg}
    >
      {/* 顶部省份与倒计时 */}
      <HStack alignment="center" spacing={3}>
        <Image
          systemName="fuelpump.fill"
          font="caption2"
          foregroundStyle="rgba(255, 255, 255, 0.85)"
        />
        <Text font="caption" fontWeight="bold" foregroundStyle="#FFFFFF">
          {data.province}
        </Text>
        <Text
          font="caption2"
          fontWeight="medium"
          foregroundStyle="rgba(255, 255, 255, 0.55)"
        >
          油价
        </Text>
        <Spacer />
        {/* 倒计时微徽章 */}
        <HStack
          alignment="center"
          padding={{ top: 1.5, bottom: 1.5, leading: 4, trailing: 4 }}
          background="rgba(255, 255, 255, 0.09)"
          clipShape={{ type: "rect", cornerRadius: 4 }}
        >
          <Text
            font="caption2"
            fontWeight="semibold"
            foregroundStyle="rgba(255, 255, 255, 0.85)"
          >
            {data.adjustDaysDesc || data.nextAdjustDate.replace(/24时/, "")}
          </Text>
        </HStack>
      </HStack>

      {/* 调价核心区域：左侧状态 + 右侧大字幅度，两端舒展不挤占 */}
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
        <Text
          font="caption"
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

      <Spacer />

      {/* 2x2 四色油品玻璃矩阵 */}
      <VStack spacing={3.5} frame={{ maxWidth: "infinity" }}>
        <HStack spacing={3.5} frame={{ maxWidth: "infinity" }}>
          <SmallOilCard theme={OIL_THEMES.oil92} price={data.prices.oil92} />
          <SmallOilCard theme={OIL_THEMES.oil95} price={data.prices.oil95} />
        </HStack>
        <HStack spacing={3.5} frame={{ maxWidth: "infinity" }}>
          <SmallOilCard theme={OIL_THEMES.oil98} price={data.prices.oil98} />
          <SmallOilCard theme={OIL_THEMES.oil0} price={data.prices.oil0} />
        </HStack>
      </VStack>
    </VStack>
  );
}

// 错误回退小组件
function ErrorWidgetView({ message }: { message: string }) {
  const widgetBg = {
    colors: ["#16191F", "#0D0E12"],
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
    let province = Widget.parameter?.trim() || settings.selectedProvince || "山东";

    const data = await fetchOilData(province);

    // 调价提醒通知
    if (settings.lastForecast && settings.lastForecast !== data.rawForecast) {
      try {
        await Notification.schedule({
          title: `${data.province}油价调整提醒`,
          body: `下次调价：${data.nextAdjustDate}，${data.trendDesc} ${data.valPerLiter || data.valPerTon}`,
          silent: false,
        });
      } catch {}
    }
    settings.lastForecast = data.rawForecast;
    saveSettings(settings);

    // 双尺寸渲染
    if (Widget.family === "systemMedium") {
      Widget.present(<MediumWidgetView data={data} />, {
        reloadPolicy: {
          policy: "after",
          date: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2小时刷新
        },
      });
    } else {
      Widget.present(<SmallWidgetView data={data} />, {
        reloadPolicy: {
          policy: "after",
          date: new Date(Date.now() + 1000 * 60 * 60 * 2),
        },
      });
    }
  } catch (err: any) {
    Widget.present(<ErrorWidgetView message={err.message || String(err)} />);
  }
})();
