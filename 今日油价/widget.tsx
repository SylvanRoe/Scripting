import {
  Widget,
  VStack,
  HStack,
  ZStack,
  RoundedRectangle,
  Text,
  Spacer,
  Image,
  Notification,
  Script,
} from "scripting";
import {
  fetchOilData,
  loadSettings,
  saveSettings,
  OilData,
  WidgetStyle,
} from "./api";

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

const WIDGET_BG = {
  light: "#FFFFFF",
  dark: "#161719",
};

// 提取剩余天数用于计算进度
function parseRemainingDays(desc: string): number {
  const match = desc.match(/(\d+)\s*天/);
  return match ? parseInt(match[1], 10) : 7;
}

// 底部次要油品横向磨砂胶囊卡（Focus 风格专用）
function SecondaryOilCapsule({
  theme,
  price,
}: {
  theme: (typeof OIL_THEMES)[keyof typeof OIL_THEMES];
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

// 解析用于紧凑显示的调价升降幅和描述
function parseCleanForecast(
  rawForecast: string,
  trendType: "down" | "up" | "flat",
  nextAdjustDate: string
) {
  let cleanLiter = "";
  const rangeLiterMatch = rawForecast.match(
    /([0-9.]+)\s*元\/升\s*[-~至到]\s*([0-9.]+)\s*元\/升/
  );
  if (rangeLiterMatch) {
    cleanLiter = `${rangeLiterMatch[1]}-${rangeLiterMatch[2]}`;
  } else {
    const singleLiterMatch = rawForecast.match(/([0-9.]+)\s*元\/升/);
    if (singleLiterMatch) {
      cleanLiter = singleLiterMatch[1];
    }
  }

  const arrow = trendType === "down" ? "↓" : trendType === "up" ? "↑" : "-";
  const sign = trendType === "down" ? "-" : trendType === "up" ? "+" : "";
  const cleanDate = (nextAdjustDate || "近期").replace(/调整.*$/, "").trim();

  let mediumForecast = `${cleanDate}调整`;
  if (cleanLiter) {
    mediumForecast = `${cleanDate}调整 ${arrow} ${cleanLiter}`;
  } else if (trendType === "flat") {
    mediumForecast = `${cleanDate}调整 预计搁浅`;
  } else {
    mediumForecast = `${cleanDate}调整 ${arrow}`;
  }

  let smallTrend = "";
  if (cleanLiter) {
    smallTrend = `预计${sign}${cleanLiter}`;
  } else if (trendType === "flat") {
    smallTrend = "预计搁浅";
  } else {
    smallTrend = trendType === "down" ? "预计下调" : "预计上调";
  }

  return { cleanLiter, mediumForecast, smallTrend, cleanDate };
}

// =========================================================================
// 风格 2：经典 4 联卡片与深色极简行情 (MediumFocusView - 参考全新设计)
// =========================================================================
function MediumFocusView({ data }: any) {
  const { mediumForecast } = parseCleanForecast(
    data.rawForecast || "",
    data.trendType,
    data.nextAdjustDate || "近期"
  );

  const cardItems = [
    {
      name: "92 号",
      price: data.prices.oil92,
      textColor: "#E5933A",
      tagBg: "rgba(229, 147, 58, 0.18)",
    },
    {
      name: "95 号",
      price: data.prices.oil95,
      textColor: "#E6674E",
      tagBg: "rgba(230, 103, 78, 0.18)",
    },
    {
      name: "98 号",
      price: data.prices.oil98,
      textColor: "#E05268",
      tagBg: "rgba(224, 82, 104, 0.18)",
    },
    {
      name: "柴油",
      price: data.prices.oil0,
      textColor: "#34C759",
      tagBg: "rgba(52, 199, 89, 0.18)",
    },
  ];

  return (
    <VStack
      alignment="leading"
      padding={{ top: 12, bottom: 10, leading: 6, trailing: 6 }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={{
        light: "#FFFFFF",
        dark: "#161719",
      }}
    >
      {/* 顶部 Header：左侧省份靠最左，右侧时间靠最右，字号更小巧精致 */}
      <HStack alignment="center" padding={{ leading: 4, trailing: 4 }}>
        <HStack alignment="center" spacing={4}>
          <Image
            systemName="fuelpump.fill"
            font="caption"
            foregroundStyle="#F59E0B"
          />
          <Text
            font="caption"
            fontWeight="bold"
            foregroundStyle={{
              light: "#1C1C1E",
              dark: "#FFFFFF",
            }}
          >
            {data.province}实时油价
          </Text>
        </HStack>
        <Spacer />
        <Text
          font="caption2"
          fontWeight="medium"
          foregroundStyle={{
            light: "rgba(60, 60, 67, 0.85)",
            dark: "rgba(255, 255, 255, 0.85)",
          }}
        >
          {mediumForecast}
        </Text>
      </HStack>

      <Spacer />

      {/* 中部 4 联卡片：油号色块根据字宽自然包裹，底下的价格底块横向加宽，形成清晰的上下区分与层次 */}
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        {cardItems.map((item) => (
          <VStack
            key={item.name}
            alignment="center"
            spacing={6}
            frame={{ maxWidth: "infinity" }}
          >
            {/* 上层：油号色块（紧凑精致，按文字宽度留一点边距） */}
            <HStack
              alignment="center"
              padding={{ top: 2.5, bottom: 2.5, leading: 7, trailing: 7 }}
              background={item.tagBg}
              clipShape={{ type: "rect", cornerRadius: 5 }}
            >
              <Text
                font="caption2"
                fontWeight="bold"
                foregroundStyle={item.textColor}
                lineLimit={1}
                allowsTightening={true}
              >
                {item.name}
              </Text>
            </HStack>

            {/* 下层：价格底块（横向撑开更宽，与上方小标签形成鲜明反差，深浅自适应） */}
            <HStack
              alignment="center"
              padding={{ top: 6, bottom: 6, leading: 4, trailing: 4 }}
              background={{
                light: "rgba(0, 0, 0, 0.05)",
                dark: "rgba(255, 255, 255, 0.09)",
              }}
              clipShape={{ type: "rect", cornerRadius: 8 }}
              frame={{ maxWidth: "infinity" }}
            >
              <Spacer />
              <Text
                font="headline"
                fontWeight="bold"
                foregroundStyle={{
                  light: "#000000",
                  dark: "#FFFFFF",
                }}
                lineLimit={1}
                allowsTightening={true}
                minScaleFactor={0.8}
              >
                {item.price}
              </Text>
              <Spacer />
            </HStack>
          </VStack>
        ))}
      </HStack>

      <Spacer />

      {/* 底部 Footer */}
      <HStack alignment="center" padding={{ leading: 4, trailing: 4 }}>
        <Text
          font="caption2"
          fontWeight="regular"
          foregroundStyle={{
            light: "rgba(60, 60, 67, 0.45)",
            dark: "rgba(255, 255, 255, 0.45)",
          }}
        >
          {data.updateTime} 更新
        </Text>
        <Spacer />
        <Text
          font="caption2"
          fontWeight="regular"
          foregroundStyle={{
            light: "rgba(60, 60, 67, 0.45)",
            dark: "rgba(255, 255, 255, 0.45)",
          }}
        >
          元/升
        </Text>
      </HStack>
    </VStack>
  );
}

// =========================================================================
// 风格 2：动态行情卡流 (Ticker - 左右分立，倒计时微进度条 + 无框行情行)
// =========================================================================
function MediumTickerView({
  data,
  trendColor,
  trendCardBg,
  trendIcon,
  tonNum,
  cleanDate,
}: any) {
  const days = parseRemainingDays(data.adjustDaysDesc || "7天");
  const progressPercent = Math.max(10, Math.min(95, Math.round(((14 - days) / 14) * 100)));

  const oilList = [
    OIL_THEMES.oil92,
    OIL_THEMES.oil95,
    OIL_THEMES.oil98,
    OIL_THEMES.oil0,
  ];

  return (
    <HStack
      spacing={9}
      padding={{ top: 11, bottom: 11, leading: 12, trailing: 12 }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={{
        light: "#FFFFFF",
        dark: "#161719",
      }}
    >
      {/* 左半区：调价全景看板 + 周期微进度条 */}
      <VStack
        alignment="leading"
        spacing={0}
        padding={{ top: 8.5, bottom: 8.5, leading: 9.5, trailing: 9.5 }}
        background={trendCardBg}
        clipShape={{ type: "rect", cornerRadius: 13 }}
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      >
        <HStack alignment="center">
          <HStack alignment="center" spacing={4}>
            <Image
              systemName="fuelpump.fill"
              font="caption2"
              foregroundStyle="#F59E0B"
            />
            <Text
              font="caption"
              fontWeight="bold"
              foregroundStyle={{
                light: "#1C1C1E",
                dark: "#FFFFFF",
              }}
            >
              {data.province}
            </Text>
          </HStack>
          <Spacer />
          <HStack
            alignment="center"
            padding={{ top: 1, bottom: 1, leading: 4.5, trailing: 4.5 }}
            background={{
              light: "rgba(0, 0, 0, 0.06)",
              dark: "rgba(255, 255, 255, 0.12)",
            }}
            clipShape={{ type: "rect", cornerRadius: 4 }}
          >
            <Text
              font="caption2"
              fontWeight="semibold"
              foregroundStyle={{
                light: "#1C1C1E",
                dark: "#FFFFFF",
              }}
            >
              {data.advice}
            </Text>
          </HStack>
        </HStack>

        <Spacer />

        <VStack alignment="leading" spacing={2}>
          <HStack alignment="center" spacing={3}>
            <Image
              systemName={trendIcon}
              font="caption2"
              fontWeight="bold"
              foregroundStyle={trendColor}
            />
            <Text
              font="caption2"
              fontWeight="bold"
              foregroundStyle={trendColor}
            >
              {data.trendDesc}
            </Text>
          </HStack>

          <HStack alignment="lastTextBaseline" spacing={2}>
            <Text
              font="title2"
              fontWeight="bold"
              foregroundStyle={{
                light: "#000000",
                dark: "#FFFFFF",
              }}
            >
              {tonNum}
            </Text>
            <Text
              font="caption2"
              fontWeight="medium"
              foregroundStyle={{
                light: "rgba(60, 60, 67, 0.65)",
                dark: "rgba(255, 255, 255, 0.65)",
              }}
            >
              元/吨
            </Text>
          </HStack>

          {data.valPerLiter ? (
            <Text
              font="caption2"
              fontWeight="regular"
              foregroundStyle={{
                light: "rgba(60, 60, 67, 0.55)",
                dark: "rgba(255, 255, 255, 0.5)",
              }}
            >
              约 {data.valPerLiter}
            </Text>
          ) : null}
        </VStack>

        <Spacer />

        <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity" }}>
          <HStack alignment="center">
            <Text
              font="caption2"
              foregroundStyle={{
                light: "rgba(60, 60, 67, 0.6)",
                dark: "rgba(255, 255, 255, 0.55)",
              }}
            >
              {cleanDate}
            </Text>
            <Spacer />
            <Text
              font="caption2"
              fontWeight="bold"
              foregroundStyle={trendColor}
            >
              {data.adjustDaysDesc}
            </Text>
          </HStack>

          <HStack
            alignment="center"
            frame={{ maxWidth: "infinity", height: 3.5 }}
            background={{
              light: "rgba(0, 0, 0, 0.08)",
              dark: "rgba(255, 255, 255, 0.12)",
            }}
            clipShape={{ type: "rect", cornerRadius: 2 }}
          >
            <HStack
              frame={{ width: Math.max(0, Math.min(100, progressPercent)), height: 3.5 }}
              background={trendColor}
              clipShape={{ type: "rect", cornerRadius: 2 }}
            />
          </HStack>
        </VStack>
      </VStack>

      {/* 右半区：无框高密度精密行情卡片 */}
      <VStack
        alignment="leading"
        spacing={0}
        padding={{ top: 8.5, bottom: 8.5, leading: 9.5, trailing: 9.5 }}
        background={{
          light: "rgba(0, 0, 0, 0.035)",
          dark: "rgba(255, 255, 255, 0.06)",
        }}
        clipShape={{ type: "rect", cornerRadius: 13 }}
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      >
        {oilList.map((item, index) => (
          <VStack key={item.key} frame={{ maxWidth: "infinity" }}>
            {index > 0 ? <Spacer /> : null}
            <HStack
              alignment="center"
              padding={{ top: 2, bottom: 2 }}
              frame={{ maxWidth: "infinity" }}
            >
              <HStack
                alignment="center"
                padding={{ top: 1, bottom: 1, leading: 4, trailing: 4 }}
                background={item.tagBg}
                clipShape={{ type: "rect", cornerRadius: 3.5 }}
              >
                <Text
                  font="caption2"
                  fontWeight="bold"
                  foregroundStyle={item.tint}
                >
                  {item.name}
                </Text>
              </HStack>

              <Spacer />

              <HStack alignment="lastTextBaseline" spacing={1}>
                <Text
                  font="caption2"
                  fontWeight="regular"
                  foregroundStyle={{
                    light: "rgba(60, 60, 67, 0.45)",
                    dark: "rgba(255, 255, 255, 0.4)",
                  }}
                >
                  ¥
                </Text>
                <Text
                  font="subheadline"
                  fontWeight="bold"
                  foregroundStyle={{
                    light: "#000000",
                    dark: "#FFFFFF",
                  }}
                >
                  {data.prices[item.key]}
                </Text>
              </HStack>
            </HStack>
          </VStack>
        ))}
      </VStack>
    </HStack>
  );
}

// =========================================================================
// 风格 3：通报胶囊流 (Notice Capsule - 1:1 像素级复刻大舅哥经典布局)
// 柔浅冰蓝底 + 纯黑圆形底座铃铛 + 纯黑胶囊标题 + 纯透明酒红大圆角描边通报卡 + 底部4色紧凑全圆角药丸
// =========================================================================
function MediumCapsuleView({
  data,
}: any) {
  // 底部四色胶囊配置（严格按照大舅哥经典源码与截图：0# 橙、92 蓝、95 绿、98 紫）
  const capsuleList = [
    { name: "0#", price: data.prices.oil0, bg: "#FB8C00" }, // 活力橙
    { name: "92", price: data.prices.oil92, bg: "#007AFF" }, // 经典蓝
    { name: "95", price: data.prices.oil95, bg: "#00C853" }, // 鲜绿
    { name: "98", price: data.prices.oil98, bg: "#AF52DE" }, // 雅致紫
  ];

  // 预测文本（原始完整未篡改格式）
  const forecastText = data.rawForecast || "暂无调价预测信息";

  const isTransparent =
    Widget.isTransparentMode ||
    Widget.isBlurMode ||
    Widget.isTransparentBackground;

  const bgGradient = {
    light: {
      type: "linear" as const,
      colors: ["#C6DCEB", "#D6E5F2"],
      startPoint: "top" as const,
      endPoint: "bottom" as const,
    },
    dark: {
      type: "linear" as const,
      colors: ["#1B2228", "#12161A"],
      startPoint: "top" as const,
      endPoint: "bottom" as const,
    },
  };

  return (
    <VStack
      alignment="center"
      spacing={8}
      padding={{ top: 12, bottom: 12, leading: 14, trailing: 14 }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={isTransparent ? undefined : bgGradient}
    >
      {/* 1. 顶部 Header：bell.circle 图标 (28x28) + 5pt 间距 + 胶囊标题 (130x28, cornerRadius 14)，深浅色自适应 */}
      <HStack alignment="center" spacing={5}>
        <Image
          systemName="bell.circle"
          font={28}
          foregroundStyle={{
            light: "#000000",
            dark: "#FFFFFF",
          }}
          frame={{ width: 28, height: 28 }}
        />
        <HStack
          alignment="center"
          frame={{ width: 130, height: 28 }}
          background={{
            light: "rgba(0, 0, 0, 0.85)",
            dark: "rgba(255, 255, 255, 0.16)",
          }}
          clipShape={{ type: "rect", cornerRadius: 14 }}
        >
          <Spacer />
          <Text
            font={14}
            fontWeight="bold"
            foregroundStyle="#FFFFFF"
          >
            {data.province}油价
          </Text>
          <Spacer />
        </HStack>
      </HStack>

      {/* 2. 中间通报卡片：308x62，cornerRadius 10，精准红色圆角描边，内部三行文字完整对齐，深浅色自适应 */}
      <ZStack alignment="center" frame={{ width: 308, height: 62 }}>
        <RoundedRectangle
          cornerRadius={10}
          stroke={{
            shapeStyle: "rgba(213, 0, 0, 0.85)",
            strokeStyle: { lineWidth: 2.5 },
          }}
        />
        <Text
          font={12}
          fontWeight="bold"
          foregroundStyle={{
            light: "#000000",
            dark: "#FFFFFF",
          }}
          multilineTextAlignment="center"
          lineLimit={3}
          lineSpacing={2}
          allowsTightening={true}
          minScaleFactor={0.75}
          padding={{ leading: 8, trailing: 8 }}
        >
          {forecastText}
        </Text>
      </ZStack>

      {/* 3. 底部药丸按钮：4个 73x23，cornerRadius 10，间距 5pt，总宽度 307 与中间卡片完美对齐 */}
      <HStack alignment="center" spacing={5} frame={{ width: 307, height: 23 }}>
        {capsuleList.map((item) => (
          <ZStack
            key={item.name}
            alignment="center"
            frame={{ width: 73, height: 23 }}
            background={item.bg}
            clipShape={{ type: "rect", cornerRadius: 10 }}
          >
            <Text
              font={10.5}
              fontWeight="semibold"
              foregroundStyle="#FFFFFF"
              lineLimit={1}
              allowsTightening={true}
              minScaleFactor={0.7}
            >
              {item.name} - {item.price}
            </Text>
          </ZStack>
        ))}
      </HStack>
    </VStack>
  );
}

// =========================================================================
// 小尺寸小组件 - 风格 2：白底 Shell 贝壳高光小组件 (参考图 1 全新设计)
// =========================================================================
function SmallShellFocusView({
  data,
  focusOilKey,
}: any) {
  const focusTheme =
    OIL_THEMES[focusOilKey as keyof typeof OIL_THEMES] || OIL_THEMES.oil92;
  const focusPrice =
    data.prices[focusOilKey as keyof typeof OIL_THEMES] || data.prices.oil92;

  const { smallTrend } = parseCleanForecast(
    data.rawForecast || "",
    data.trendType,
    data.nextAdjustDate || "近期"
  );

  const trendColor =
    data.trendType === "down"
      ? "#2FB350"
      : data.trendType === "up"
      ? "#FF3B30"
      : "#8E8E93";

  // 贝壳标志本地图片路径
  const logoPath = `${Script.directory}/shell_logo.png`;
  const hasLogoFile = FileManager.existsSync(logoPath);

  // 油品显示名与副标题，例如 "92#" 与 "湖南 92 号汽油"
  const oilName = focusTheme.name;
  const oilFullName =
    focusOilKey === "oil0"
      ? "0 号柴油"
      : `${focusTheme.name.replace("#", "")} 号汽油`;
  const subTitle = `${data.province} ${oilFullName}`;

  // 底部调价时间文本
  const cleanDateText = `${(data.nextAdjustDate || "近期")
    .replace(/调整.*$/, "")
    .replace(/调价.*$/, "")
    .trim()}调价`;

  return (
    <ZStack
      alignment="topLeading"
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={{
        light: "#FFFFFF",
        dark: "#161719",
      }}
    >
      {/* 底层左上角贝壳水印：放大并超出边框，更靠左上偏置，清爽淡雅防重叠 */}
      <HStack alignment="top">
        {hasLogoFile ? (
          <Image
            filePath={logoPath}
            resizable={true}
            scaleToFit={true}
            opacity={0.18}
            frame={{ width: 150, height: 150 }}
            offset={{ x: -40, y: -30 }}
          />
        ) : (
          <Image
            systemName="fuelpump.fill"
            font={85}
            opacity={0.09}
            foregroundStyle="#F59E0B"
            offset={{ x: -25, y: -20 }}
          />
        )}
        <Spacer />
      </HStack>

      {/* 前景层：自然靠右，保留合适内边距避免超出边界 */}
      <HStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        <Spacer />
        <VStack
          alignment="trailing"
          spacing={0}
          padding={{ top: 12, bottom: 12, trailing: 10 }}
        >
          {/* 顶部标签 + 油品名 */}
          <HStack alignment="center" spacing={3}>
            <HStack
              alignment="center"
              padding={{ top: 1.5, bottom: 1.5, leading: 4, trailing: 4 }}
              background="rgba(245, 158, 11, 0.16)"
              clipShape={{ type: "rect", cornerRadius: 3.5 }}
            >
              <Text
                font="caption2"
                fontWeight="bold"
                foregroundStyle="#D97706"
              >
                OIL
              </Text>
            </HStack>
            <Text
              font="title3"
              fontWeight="heavy"
              foregroundStyle={{
                light: "#000000",
                dark: "#FFFFFF",
              }}
            >
              {oilName}
            </Text>
          </HStack>

          {/* 省份油品全称 */}
          <Text
            font="caption2"
            fontWeight="medium"
            foregroundStyle={{
              light: "#8E8E93",
              dark: "rgba(255, 255, 255, 0.55)",
            }}
            padding={{ top: 1.5 }}
          >
            {subTitle}
          </Text>

          <Spacer />

          {/* 调价预测 */}
          <Text
            font="footnote"
            fontWeight="bold"
            foregroundStyle={trendColor}
          >
            {smallTrend}
          </Text>

          {/* 现价大字 */}
          <HStack alignment="lastTextBaseline" spacing={1.5} padding={{ top: 1 }}>
            <Text
              font="subheadline"
              fontWeight="bold"
              foregroundStyle={{
                light: "#000000",
                dark: "#FFFFFF",
              }}
            >
              ¥
            </Text>
            <Text
              font="title"
              fontWeight="heavy"
              foregroundStyle={{
                light: "#000000",
                dark: "#FFFFFF",
              }}
            >
              {focusPrice}
            </Text>
          </HStack>

          <Spacer />

          {/* 调价日期 */}
          <Text
            font="caption2"
            fontWeight="medium"
            foregroundStyle={{
              light: "#8E8E93",
              dark: "rgba(255, 255, 255, 0.45)",
            }}
          >
            {cleanDateText}
          </Text>
        </VStack>
      </HStack>
    </ZStack>
  );
}

// =========================================================================
// 小尺寸小组件 - 风格 1：深色胶囊经典矩阵 (原 SmallWidgetView)
// =========================================================================
function SmallCapsuleView({
  data,
  focusOilKey,
  trendColor,
  trendCardBg,
  trendIcon,
  tonNum,
  cleanDate,
}: any) {
  const focusTheme = OIL_THEMES[focusOilKey as keyof typeof OIL_THEMES] || OIL_THEMES.oil92;
  const focusPrice = data.prices[focusOilKey as keyof typeof OIL_THEMES] || data.prices.oil92;
  const secondaryThemes = (
    Object.keys(OIL_THEMES) as Array<keyof typeof OIL_THEMES>
  ).filter((k) => k !== focusOilKey);

  return (
    <VStack
      alignment="leading"
      spacing={6}
      padding={{ top: 9.5, bottom: 9.5, leading: 10, trailing: 10 }}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={{
        light: "#FFFFFF",
        dark: "#161719",
      }}
    >
      <HStack alignment="center" spacing={4}>
        <HStack
          alignment="center"
          padding={3}
          background={{
            light: "rgba(0, 0, 0, 0.05)",
            dark: "rgba(255, 255, 255, 0.09)",
          }}
          clipShape={{ type: "rect", cornerRadius: 5 }}
        >
          <Image
            systemName="fuelpump.fill"
            font="caption2"
            foregroundStyle="#F59E0B"
          />
        </HStack>
        <Text
          font="caption"
          fontWeight="bold"
          foregroundStyle={{
            light: "#1C1C1E",
            dark: "#FFFFFF",
          }}
        >
          {data.province}
        </Text>
        <Spacer />
        <HStack
          alignment="center"
          padding={{ top: 1.5, bottom: 1.5, leading: 5, trailing: 5 }}
          background={{
            light: "rgba(0, 0, 0, 0.05)",
            dark: "rgba(255, 255, 255, 0.08)",
          }}
          clipShape={{ type: "rect", cornerRadius: 5 }}
        >
          <Text
            font="caption2"
            fontWeight="semibold"
            foregroundStyle={{
              light: "rgba(60, 60, 67, 0.85)",
              dark: "rgba(255, 255, 255, 0.85)",
            }}
          >
            {data.adjustDaysDesc || cleanDate}
          </Text>
        </HStack>
      </HStack>

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
          foregroundStyle={{
            light: "#1C1C1E",
            dark: "#FFFFFF",
          }}
        >
          {tonNum}
        </Text>
        <Text
          font="caption2"
          fontWeight="medium"
          foregroundStyle={{
            light: "rgba(60, 60, 67, 0.65)",
            dark: "rgba(255, 255, 255, 0.6)",
          }}
        >
          元/吨
        </Text>
      </HStack>

      <HStack
        alignment="center"
        padding={{ top: 4, bottom: 4, leading: 7, trailing: 7 }}
        background={{
          light: "rgba(0, 0, 0, 0.04)",
          dark: "rgba(255, 255, 255, 0.06)",
        }}
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
            foregroundStyle={{
              light: "rgba(60, 60, 67, 0.45)",
              dark: "rgba(255, 255, 255, 0.45)",
            }}
          >
            ¥
          </Text>
          <Text
            font="headline"
            fontWeight="bold"
            foregroundStyle={{
              light: "#000000",
              dark: "#FFFFFF",
            }}
          >
            {focusPrice}
          </Text>
        </HStack>
      </HStack>

      <Spacer />

      <HStack spacing={3} frame={{ maxWidth: "infinity" }}>
        {secondaryThemes.map((key) => (
          <VStack
            key={key}
            alignment="center"
            spacing={1}
            padding={{ top: 3, bottom: 3, leading: 1, trailing: 1 }}
            background={{
              light: "rgba(0, 0, 0, 0.04)",
              dark: "rgba(255, 255, 255, 0.04)",
            }}
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
              foregroundStyle={{
                light: "#000000",
                dark: "#FFFFFF",
              }}
            >
              {data.prices[key]}
            </Text>
          </VStack>
        ))}
      </HStack>
    </VStack>
  );
}

// 错误回退组件
function ErrorWidgetView({ message }: { message: string }) {
  return (
    <VStack
      alignment="center"
      spacing={8}
      padding={12}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={{
        light: "#FFFFFF",
        dark: "#161719",
      }}
    >
      <Image
        systemName="exclamationmark.triangle.fill"
        font="title2"
        foregroundStyle="#FF453A"
      />
      <Text
        font="headline"
        fontWeight="bold"
        foregroundStyle={{
          light: "#000000",
          dark: "#FFFFFF",
        }}
      >
        油价数据获取失败
      </Text>
      <Text
        font="caption"
        foregroundStyle={{
          light: "rgba(60, 60, 67, 0.6)",
          dark: "rgba(255, 255, 255, 0.6)",
        }}
        lineLimit={2}
      >
        {message}
      </Text>
    </VStack>
  );
}

// =========================================================================
// 执行渲染入口
// =========================================================================
(async () => {
  try {
    const settings = loadSettings();
    let province =
      Widget.parameter?.trim() || settings.selectedProvince || "山东";
    const focusOilKey = settings.focusOil || "oil92";
    const widgetStyle: WidgetStyle = settings.widgetStyle || "capsule";

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

    const isDown = data.trendType === "down";
    const isUp = data.trendType === "up";
    const trendColor = isDown ? "#34C759" : isUp ? "#FF453A" : "#FF9F0A";
    const trendCardBg = {
      light: isDown
        ? "rgba(52, 199, 89, 0.12)"
        : isUp
        ? "rgba(255, 59, 48, 0.1)"
        : "rgba(255, 159, 10, 0.12)",
      dark: isDown
        ? "rgba(52, 199, 89, 0.16)"
        : isUp
        ? "rgba(255, 69, 58, 0.16)"
        : "rgba(255, 159, 10, 0.16)",
    };
    const trendIcon = isDown ? "arrow.down" : isUp ? "arrow.up" : "minus";
    const tonNum = data.valPerTon.replace(/元\/吨/, "").trim() || "--";
    const cleanDate = data.nextAdjustDate.replace(/24时/, "").trim();

    const sharedProps = {
      data,
      focusOilKey,
      trendColor,
      trendCardBg,
      trendIcon,
      tonNum,
      cleanDate,
    };

    // 双尺寸渲染
    if (Widget.family === "systemMedium") {
      let renderView = <MediumCapsuleView {...sharedProps} />;
      if (widgetStyle === "focus") {
        renderView = <MediumFocusView {...sharedProps} />;
      } else if (widgetStyle === "ticker") {
        renderView = <MediumTickerView {...sharedProps} />;
      }

      Widget.present(renderView, {
        reloadPolicy: {
          policy: "after",
          date: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2小时刷新
        },
      });
    } else {
      let renderSmallView = <SmallCapsuleView {...sharedProps} />;
      if (widgetStyle === "focus") {
        renderSmallView = <SmallShellFocusView {...sharedProps} />;
      }

      Widget.present(renderSmallView, {
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
