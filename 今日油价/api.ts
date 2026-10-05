import { fetch } from "scripting";

export interface OilPrices {
  oil92: string;
  oil95: string;
  oil98: string;
  oil0: string;
}

export interface OilData {
  province: string;
  prices: OilPrices;
  // 原始与结构化预测信息
  rawForecast: string;
  nextAdjustDate: string; // 如 "10月15日24时"
  adjustDaysDesc: string; // 如 "14天后" 或 "今晚调整"
  trendType: "down" | "up" | "flat"; // 下跌、上涨、平稳
  trendDesc: string; // "预计下调" | "预计上调" | "预计搁浅"
  valPerTon: string; // "150元/吨"
  valPerLiter: string; // "0.11~0.14元/升"
  advice: string; // "建议调价后加油" / "建议尽快加满"
  updateTime: string;
  targetUrl: string;
}

export type WidgetStyle = "focus" | "ticker" | "capsule";

export interface Settings {
  selectedProvince: string;
  focusOil?: "oil92" | "oil95" | "oil98" | "oil0"; // 主力关注油品，默认 oil92
  widgetStyle?: WidgetStyle; // 小组件排版风格：focus(主力聚焦) | ticker(动态行情卡流) | capsule(沉浸分段胶囊)
  lastForecast?: string;
}

const SETTINGS_FILE = `${FileManager.appGroupDocumentsDirectory}/fuel_price_settings.json`;

export const PROVINCE_MAP: Record<string, string> = {
  北京: "/beijing.shtml",
  上海: "/shanghai.shtml",
  天津: "/tianjin.shtml",
  重庆: "/chongqing.shtml",
  广东: "/guangdong.shtml",
  浙江: "/zhejiang.shtml",
  江苏: "/jiangsu.shtml",
  山东: "/shandong.shtml",
  福建: "/fujian.shtml",
  四川: "/sichuan.shtml",
  湖北: "/hubei.shtml",
  湖南: "/hunan.shtml",
  河南: "/henan.shtml",
  河北: "/hebei.shtml",
  安徽: "/anhui.shtml",
  江西: "/jiangxi.shtml",
  辽宁: "/liaoning.shtml",
  吉林: "/jilin.shtml",
  黑龙江: "/heilongjiang.shtml",
  内蒙古: "/neimenggu.shtml",
  广西: "/guangxi.shtml",
  海南: "/hainan.shtml",
  贵州: "/guizhou.shtml",
  云南: "/yunnan.shtml",
  西藏: "/xizang.shtml",
  陕西: "/shanxi-3.shtml",
  山西: "/shanxi.shtml",
  甘肃: "/gansu.shtml",
  青海: "/qinghai.shtml",
  宁夏: "/ningxia.shtml",
  新疆: "/xinjiang.shtml",
};

export function loadSettings(): Settings {
  try {
    if (FileManager.existsSync(SETTINGS_FILE)) {
      const content = FileManager.readAsStringSync(SETTINGS_FILE);
      const parsed = JSON.parse(content);
      if (!parsed.widgetStyle) {
        parsed.widgetStyle = "capsule";
      }
      return parsed;
    }
  } catch (e) {
    console.error("loadSettings error:", e);
  }
  return { selectedProvince: "auto", focusOil: "oil92", widgetStyle: "capsule" };
}

export function saveSettings(settings: Settings): void {
  try {
    FileManager.writeAsStringSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error("saveSettings error:", e);
  }
}

export function cleanProvinceName(raw: string): string {
  return raw
    .replace(/(省|壮族自治区|回族自治区|自治州|维吾尔自治区|自治区|市)$/, "")
    .trim();
}

export async function detectLocationProvince(): Promise<string> {
  try {
    const loc = await Location.requestCurrent({ forceRequest: false });
    if (loc) {
      const places = await Location.reverseGeocode({
        latitude: loc.latitude,
        longitude: loc.longitude,
        locale: "zh-CN",
      });
      if (places && places.length > 0) {
        const p = places[0];
        const raw =
          p.administrativeArea ||
          p.locality ||
          p.subAdministrativeArea ||
          "";
        const cleaned = cleanProvinceName(raw);
        if (PROVINCE_MAP[cleaned]) {
          return cleaned;
        }
      }
    }
  } catch (e) {
    console.log("定位解析失败，回退默认省份:", e);
  }
  return "广东";
}

export async function fetchOilData(provinceName?: string): Promise<OilData> {
  let targetProvince = provinceName;
  if (!targetProvince || targetProvince === "auto") {
    targetProvince = await detectLocationProvince();
  }
  targetProvince = cleanProvinceName(targetProvince);

  let path = PROVINCE_MAP[targetProvince];
  if (!path) {
    try {
      const homeRes = await fetch("http://m.qiyoujiage.com", {
        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)" },
      });
      const homeHtml = await homeRes.text();
      const match = homeHtml.match(new RegExp(`<a href="([^"]+)">${targetProvince}油价</a>`));
      if (match) {
        path = match[1];
      }
    } catch {}
  }

  if (!path) {
    path = "/guangdong.shtml";
    targetProvince = "广东";
  }

  const targetUrl = `http://m.qiyoujiage.com${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(targetUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)" },
  });
  const html = await res.text();

  // 抓取 4 个油号价格：92, 95, 98, 0号
  const ddMatches = [...html.matchAll(/<dd>([0-9.]+)/g)].map((m) => m[1]);
  const prices: OilPrices = {
    oil92: ddMatches[0] || "--",
    oil95: ddMatches[1] || "--",
    oil98: ddMatches[2] || "--",
    oil0: ddMatches[3] || "--",
  };

  // 抓取调价预测文本
  let rawForecast = "暂无调价预测信息";
  const tishiMatch = html.match(/var tishiContent\s*=\s*"([^"]+)"/);
  if (tishiMatch && tishiMatch[1]) {
    // 完美复刻原版提示清洗逻辑：<br/> 转为逗号，清除 &nbsp;
    rawForecast = tishiMatch[1]
      .replace(/<br\s*\/?>/gi, "，")
      .replace(/&nbsp;/gi, "")
      .trim();
  }

  // 结构化解析调价预测
  // 1. 下次调价时间
  let nextAdjustDate = "近期调价";
  let adjustDaysDesc = "";
  const dateMatch = rawForecast.match(/下次油价\s*([0-9]+月[0-9]+日(?:[0-9]+时)?)\s*调整/);
  if (dateMatch) {
    nextAdjustDate = dateMatch[1];
    const md = nextAdjustDate.match(/([0-9]+)月([0-9]+)日/);
    if (md) {
      const month = parseInt(md[1], 10);
      const day = parseInt(md[2], 10);
      const now = new Date();
      let targetDate = new Date(now.getFullYear(), month - 1, day, 24, 0, 0);
      if (targetDate.getTime() < now.getTime()) {
        targetDate = new Date(now.getFullYear() + 1, month - 1, day, 24, 0, 0);
      }
      const diffMs = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        adjustDaysDesc = "今晚调整";
      } else if (diffDays === 1) {
        adjustDaysDesc = "明天调整";
      } else {
        adjustDaysDesc = `${diffDays}天后`;
      }
    }
  }

  // 2. 涨跌方向与幅度
  const isDown = rawForecast.includes("下调") || rawForecast.includes("跌");
  const isUp = rawForecast.includes("上调") || rawForecast.includes("涨");
  const trendType: "down" | "up" | "flat" = isDown ? "down" : isUp ? "up" : "flat";
  const trendDesc = isDown ? "预计下调" : isUp ? "预计上调" : "预计搁浅";

  // 吨幅度
  let valPerTon = "";
  const tonMatch = rawForecast.match(/([0-9.]+)\s*元\/吨/);
  if (tonMatch) {
    valPerTon = `${tonMatch[1]}元/吨`;
  }

  // 升幅度 (兼容范围如 0.11元/升-0.14元/升)
  let valPerLiter = "";
  const rangeLiterMatch = rawForecast.match(/([0-9.]+)\s*元\/升\s*-\s*([0-9.]+)\s*元\/升/);
  if (rangeLiterMatch) {
    valPerLiter = `${rangeLiterMatch[1]}~${rangeLiterMatch[2]}元/升`;
  } else {
    const singleLiterMatch = rawForecast.match(/([0-9.]+)\s*元\/升/);
    if (singleLiterMatch) {
      valPerLiter = `${singleLiterMatch[1]}元/升`;
    }
  }

  // 加油建议
  const advice = isDown
    ? "建议调价后再加满"
    : isUp
    ? "建议调价前尽快加满"
    : "油价平稳，按需加油";

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    province: targetProvince,
    prices,
    rawForecast,
    nextAdjustDate,
    adjustDaysDesc,
    trendType,
    trendDesc,
    valPerTon,
    valPerLiter,
    advice,
    updateTime: timeStr,
    targetUrl,
  };
}
