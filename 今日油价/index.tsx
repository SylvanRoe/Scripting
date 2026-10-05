import {
  Script,
  Navigation,
  NavigationStack,
  List,
  Section,
  HStack,
  VStack,
  Text,
  Button,
  Picker,
  Spacer,
  Image,
  Rectangle,
  Widget,
  useState,
  useEffect,
} from "scripting";
import {
  PROVINCE_MAP,
  loadSettings,
  saveSettings,
  fetchOilData,
  OilData,
  WidgetStyle,
} from "./api";

const PROVINCE_KEYS = Object.keys(PROVINCE_MAP);

// 柔和克制的油品色彩
const OIL_THEMES = [
  {
    code: "92#",
    name: "92号汽油",
    key: "oil92" as const,
    color: "#E5933A",
  },
  {
    code: "95#",
    name: "95号汽油",
    key: "oil95" as const,
    color: "#4B90E2",
  },
  {
    code: "98#",
    name: "98号汽油",
    key: "oil98" as const,
    color: "#34C759",
  },
  {
    code: "0#",
    name: "0号柴油",
    key: "oil0" as const,
    color: "#A77BEE",
  },
];

function MainView() {
  const dismiss = Navigation.useDismiss();
  const [province, setProvince] = useState<string>("auto");
  const [focusOil, setFocusOil] = useState<string>("oil92");
  const [widgetStyle, setWidgetStyle] = useState<WidgetStyle>("capsule");
  const [data, setData] = useState<OilData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (targetProv: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchOilData(targetProv);
      setData(res);
    } catch (err: any) {
      setError(err.message || "获取油价数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const settings = loadSettings();
    const cur = settings.selectedProvince || "auto";
    setProvince(cur);
    setFocusOil(settings.focusOil || "oil92");
    setWidgetStyle(settings.widgetStyle || "capsule");
    loadData(cur);
  }, []);

  const handleProvinceChange = (newProv: string) => {
    setProvince(newProv);
    const settings = loadSettings();
    settings.selectedProvince = newProv;
    saveSettings(settings);
    loadData(newProv);
    try {
      Widget.reloadAll();
    } catch {}
  };

  const handleFocusOilChange = (newOil: string) => {
    setFocusOil(newOil);
    const settings = loadSettings();
    settings.focusOil = newOil as any;
    saveSettings(settings);
    try {
      Widget.reloadAll();
    } catch {}
  };

  const handleWidgetStyleChange = (newStyle: string) => {
    const s = newStyle as WidgetStyle;
    setWidgetStyle(s);
    const settings = loadSettings();
    settings.widgetStyle = s;
    saveSettings(settings);
    try {
      Widget.reloadAll();
    } catch {}
  };

  const handlePreview = async (family: "systemSmall" | "systemMedium") => {
    try {
      await Widget.preview({ family });
    } catch (e) {
      console.error("预览组件失败:", e);
    }
  };

  const isDown = data?.trendType === "down";
  const isUp = data?.trendType === "up";
  const trendColor = isDown ? "#34C759" : isUp ? "#FF453A" : "#FF9F0A";
  const trendBg = isDown
    ? "rgba(52, 199, 89, 0.08)"
    : isUp
    ? "rgba(255, 69, 58, 0.08)"
    : "rgba(255, 159, 10, 0.08)";

  const trendIcon = isDown
    ? "arrow.down"
    : isUp
    ? "arrow.up"
    : "minus";

  const tonNum = data?.valPerTon.replace(/元\/吨/, "").trim() || "--";

  return (
    <NavigationStack>
      <List
        navigationTitle="今日油价"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />,
          primaryAction: (
            <Button
              title="刷新"
              action={() => {
                loadData(province);
                try {
                  Widget.reloadAll();
                } catch {}
              }}
            />
          ),
        }}
      >
        {/* 调价预测与时间核心看板 */}
        <Section
          header={<Text>油价调整时间与预测</Text>}
          footer={<Text>{data ? `当前省份：${data.province} · 更新时间：${data.updateTime}` : ""}</Text>}
        >
          {loading ? (
            <HStack alignment="center" spacing={8} padding={{ top: 8, bottom: 8 }}>
              <Text foregroundStyle="secondaryLabel">正在查询最新油价数据...</Text>
            </HStack>
          ) : error ? (
            <VStack alignment="leading" spacing={4} padding={{ top: 4, bottom: 4 }}>
              <Text foregroundStyle="#FF453A">数据获取失败</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">
                {error}
              </Text>
            </VStack>
          ) : data ? (
            <VStack
              alignment="leading"
              spacing={11}
              padding={{ top: 14, bottom: 14, leading: 16, trailing: 16 }}
              frame={{ maxWidth: "infinity" }}
              listRowInsets={{ top: 0, leading: 0, bottom: 0, trailing: 0 }}
              listRowBackground={<Rectangle fill={trendBg} />}
            >
              {/* 顶部行：左侧下次调价时间，右侧倒计时药丸胶囊 */}
              <HStack alignment="center">
                <HStack alignment="center" spacing={6}>
                  <Image
                    systemName="calendar"
                    font="caption"
                    foregroundStyle="secondaryLabel"
                  />
                  <Text font="subheadline" fontWeight="medium">
                    下次调价：{data.nextAdjustDate}
                  </Text>
                </HStack>
                <Spacer />
                {data.adjustDaysDesc ? (
                  <HStack
                    alignment="center"
                    padding={{ top: 2.5, bottom: 2.5, leading: 8, trailing: 8 }}
                    background="rgba(128, 128, 128, 0.18)"
                    clipShape={{ type: "rect", cornerRadius: 6 }}
                  >
                    <Text
                      font="caption2"
                      fontWeight="bold"
                      foregroundStyle="label"
                    >
                      {data.adjustDaysDesc}
                    </Text>
                  </HStack>
                ) : null}
              </HStack>

              {/* 中间核心行：左侧调价趋势与大字吨价，右侧升价换算区间 */}
              <HStack alignment="lastTextBaseline">
                <HStack alignment="center" spacing={6}>
                  <Image
                    systemName={trendIcon}
                    font="title3"
                    fontWeight="bold"
                    foregroundStyle={trendColor}
                  />
                  <Text font="title3" fontWeight="bold" foregroundStyle={trendColor}>
                    {data.trendDesc}
                  </Text>
                  <HStack alignment="lastTextBaseline" spacing={2}>
                    <Text font="title" fontWeight="bold" foregroundStyle={trendColor}>
                      {tonNum}
                    </Text>
                    <Text font="footnote" fontWeight="medium" foregroundStyle="secondaryLabel">
                      元/吨
                    </Text>
                  </HStack>
                </HStack>

                <Spacer />

                {data.valPerLiter ? (
                  <Text font="subheadline" fontWeight="semibold" foregroundStyle="secondaryLabel">
                    约 {data.valPerLiter}
                  </Text>
                ) : null}
              </HStack>

              {/* 底部建议行：左右两端对齐 */}
              <HStack alignment="center">
                <Text font="caption" foregroundStyle="secondaryLabel">
                  操作建议
                </Text>
                <Spacer />
                <Text font="caption" fontWeight="semibold" foregroundStyle={trendColor}>
                  {data.advice}
                </Text>
              </HStack>
            </VStack>
          ) : null}
        </Section>

        {/* 4 大油品今日价格列表 */}
        <Section header={<Text>当前油价 (元/升)</Text>}>
          {data ? (
            OIL_THEMES.map((item) => (
              <HStack
                key={item.key}
                alignment="center"
                spacing={12}
                padding={{ top: 4, bottom: 4 }}
              >
                <HStack
                  alignment="center"
                  padding={{ top: 2.5, bottom: 2.5, leading: 7, trailing: 7 }}
                  background={item.color}
                  clipShape={{ type: "rect", cornerRadius: 5 }}
                >
                  <Text font="caption2" fontWeight="bold" foregroundStyle="#FFFFFF">
                    {item.code}
                  </Text>
                </HStack>
                <Text font="body">{item.name}</Text>
                <Spacer />
                <HStack alignment="lastTextBaseline" spacing={1}>
                  <Text
                    font="caption"
                    fontWeight="medium"
                    foregroundStyle="secondaryLabel"
                  >
                    ¥
                  </Text>
                  <Text
                    font="headline"
                    fontWeight="bold"
                    foregroundStyle="label"
                  >
                    {data.prices[item.key]}
                  </Text>
                </HStack>
              </HStack>
            ))
          ) : (
            <Text foregroundStyle="secondaryLabel">暂无价格数据</Text>
          )}
        </Section>

        {/* 省份与关注油品设置 */}
        <Section
          header={<Text>排版风格与偏好设置</Text>}
          footer={
            <Text>
              三种先锋设计风格随时切换：{"\n"}
              • 通报通知胶囊：经典黑红通报布局，白色圆底铃铛+黑色药丸标题 + 状态描边通告卡 + 四色横向全彩胶囊{"\n"}
              • 主力高光聚焦：全新重构设计，中号经典四联卡片/小号贝壳油品高光看板{"\n"}
              • 动态行情卡流：左右黄金分割，带调价周期微进度条 + 无框高密度行情行
            </Text>
          }
        >
          <Picker
            title="中号小组件风格"
            value={widgetStyle}
            onChanged={handleWidgetStyleChange}
          >
            <Text tag="capsule">风格一：通报通知胶囊</Text>
            <Text tag="focus">风格二：主力高光聚焦</Text>
            <Text tag="ticker">风格三：动态行情卡流</Text>
          </Picker>

          <Picker
            title="监测省份"
            value={province}
            onChanged={handleProvinceChange}
          >
            <Text tag="auto">自动根据当前定位</Text>
            {PROVINCE_KEYS.map((name) => (
              <Text key={name} tag={name}>
                {name}
              </Text>
            ))}
          </Picker>

          <Picker
            title="主力关注油品"
            value={focusOil}
            onChanged={handleFocusOilChange}
          >
            <Text tag="oil92">92# 汽油</Text>
            <Text tag="oil95">95# 汽油</Text>
            <Text tag="oil98">98# 汽油</Text>
            <Text tag="oil0">0# 柴油</Text>
          </Picker>
        </Section>

        {/* 桌面毛玻璃小组件预览 */}
        <Section
          header={<Text>桌面原生小组件</Text>}
          footer={<Text>基于 iOS 原生设计标准与深色玻璃拟态重塑，克制、高级、信息聚焦。</Text>}
        >
          <Button
            title="预览中号组件 (Medium - 核心调价看板与四联卡片)"
            action={() => handlePreview("systemMedium")}
          />
          <Button
            title="预览小号组件 (Small - 精致紧凑矩阵)"
            action={() => handlePreview("systemSmall")}
          />
          <Button
            title="立即刷新桌面所有组件"
            action={() => {
              try {
                Widget.reloadAll();
              } catch {}
            }}
          />
        </Section>
      </List>
    </NavigationStack>
  );
}

async function run() {
  await Navigation.present(<MainView />);
  Script.exit();
}

run();
