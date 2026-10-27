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

// 国家发改委官方成品油调价日历（每年固定 25 轮调价，每 10 个工作日晚上 24 时调整）
const NDRC_OIL_CALENDARS: Record<number, [number, number][]> = {
  2025: [
    [1, 2], [1, 16],
    [2, 6], [2, 19],
    [3, 5], [3, 19],
    [4, 2], [4, 17], [4, 30],
    [5, 19],
    [6, 3], [6, 17],
    [7, 1], [7, 15], [7, 29],
    [8, 12], [8, 26],
    [9, 9], [9, 23],
    [10, 13], [10, 27],
    [11, 10], [11, 24],
    [12, 8], [12, 22],
  ],
  2026: [
    [1, 6], [1, 20],
    [2, 3], [2, 24],
    [3, 10], [3, 24],
    [4, 8], [4, 22],
    [5, 8], [5, 22],
    [6, 5], [6, 19],
    [7, 3], [7, 17], [7, 31],
    [8, 14], [8, 28],
    [9, 11], [9, 25],
    [10, 15], [10, 29],
    [11, 12], [11, 26],
    [12, 10], [12, 24],
  ],
};

interface NextOilAdjustment {
  month: number;
  day: number;
  diffDays: number;
  cleanDateText: string;
  dateDesc: string;
  isToday: boolean;
  isExpiredWebText: boolean;
}

/** 智能推算并校准下一次油价调整时间（杜绝网页数据源过久未更新导致的陈旧过期日期） */
async function resolveNextOilAdjustment(
  parsedMonth?: number,
  parsedDay?: number
): Promise<NextOilAdjustment> {
  const now = new Date();
  const nowMs = now.getTime();
  const curYear = now.getFullYear();
  const todayStart = new Date(curYear, now.getMonth(), now.getDate()).getTime();

  // 1. 如果网页抓取到了具体月日，先做过期校验
  if (parsedMonth && parsedDay) {
    let targetYear = curYear;
    let targetMs = new Date(targetYear, parsedMonth - 1, parsedDay, 23, 59, 59).getTime();
    if (parsedMonth < now.getMonth() + 1 && now.getMonth() >= 10) {
      targetYear = curYear + 1;
      targetMs = new Date(targetYear, parsedMonth - 1, parsedDay, 23, 59, 59).getTime();
    }

    const isExpired = targetMs < todayStart;
    if (!isExpired) {
      const targetStart = new Date(targetYear, parsedMonth - 1, parsedDay).getTime();
      const diffDays = Math.max(0, Math.round((targetStart - todayStart) / 86400000));
      let cleanDateText = `${parsedMonth}月${parsedDay}日24时`;
      return {
        month: parsedMonth,
        day: parsedDay,
        diffDays,
        cleanDateText,
        dateDesc: `${parsedMonth}月${parsedDay}日24时`,
        isToday: diffDays === 0,
        isExpiredWebText: false,
      };
    }
  }

  // 2. 网页文本过期或未匹配到时，走发改委调价日历
  let calendar = NDRC_OIL_CALENDARS[curYear] || NDRC_OIL_CALENDARS[2026];
  try {
    const tzRes = await fetch(`http://m.qiyoujiage.com/tz/${curYear}.shtml`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 3,
    });
    if (tzRes.ok) {
      const tzHtml = await tzRes.text();
      const list: [number, number][] = [];
      for (const line of tzHtml.split("\n")) {
        if (line.includes("月油价调整时间")) {
          const matches = [...line.matchAll(/(\d{1,2})月(\d{1,2})日/g)];
          for (const m of matches) {
            list.push([parseInt(m[1], 10), parseInt(m[2], 10)]);
          }
        }
      }
      if (list.length >= 20) {
        calendar = list;
      }
    }
  } catch {}

  for (const [m, d] of calendar) {
    const adjEnd = new Date(curYear, m - 1, d, 23, 59, 59).getTime();
    if (adjEnd >= nowMs) {
      const targetStart = new Date(curYear, m - 1, d).getTime();
      const diffDays = Math.max(0, Math.round((targetStart - todayStart) / 86400000));
      return {
        month: m,
        day: d,
        diffDays,
        cleanDateText: `${m}月${d}日24时`,
        dateDesc: `${m}月${d}日24时`,
        isToday: diffDays === 0,
        isExpiredWebText: true,
      };
    }
  }

  const nextYear = curYear + 1;
  const nextCal = NDRC_OIL_CALENDARS[nextYear] || [[1, 6]];
  const [firstM, firstD] = nextCal[0];
  const targetStart = new Date(nextYear, firstM - 1, firstD).getTime();
  const diffDays = Math.max(0, Math.round((targetStart - todayStart) / 86400000));
  return {
    month: firstM,
    day: firstD,
    diffDays,
    cleanDateText: `${firstM}月${firstD}日24时`,
    dateDesc: `${firstM}月${firstD}日24时`,
    isToday: false,
    isExpiredWebText: true,
  };
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
  let parsedMonth: number | undefined;
  let parsedDay: number | undefined;
  const dateMatch = rawForecast.match(/下次油价\s*([0-9]+)月([0-9]+)日(?:[0-9]+时)?\s*调整/);
  if (dateMatch) {
    parsedMonth = parseInt(dateMatch[1], 10);
    parsedDay = parseInt(dateMatch[2], 10);
  }

  // 1. 智能校准调价时间
  const adj = await resolveNextOilAdjustment(parsedMonth, parsedDay);
  const nextAdjustDate = adj.cleanDateText;
  let adjustDaysDesc = "";
  if (adj.diffDays <= 0) {
    adjustDaysDesc = "今晚调整";
  } else if (adj.diffDays === 1) {
    adjustDaysDesc = "明天调整";
  } else {
    adjustDaysDesc = `${adj.diffDays}天后`;
  }

  // 2. 涨跌方向与幅度
  let trendType: "down" | "up" | "flat" = "flat";
  let trendDesc = "预计搁浅";
  let valPerTon = "";
  let valPerLiter = "";
  let advice = "油价平稳，按需加油";

  if (adj.isExpiredWebText) {
    rawForecast = `新一轮调价窗口预计于 ${adj.dateDesc} 开启`;
    trendType = adj.isToday ? "up" : "flat";
    trendDesc = adj.isToday ? "今晚调价" : `${adj.diffDays}天后调价`;
    advice = adj.isToday ? "今晚开启调价，可留意行情变动" : "新一轮周期进行中，按需加油";
  } else {
    const isDown = rawForecast.includes("下调") || rawForecast.includes("跌");
    const isUp = rawForecast.includes("上调") || rawForecast.includes("涨");
    trendType = isDown ? "down" : isUp ? "up" : "flat";
    trendDesc = isDown ? "预计下调" : isUp ? "预计上调" : "预计搁浅";

    const tonMatch = rawForecast.match(/([0-9.]+)\s*元\/吨/);
    if (tonMatch) valPerTon = `${tonMatch[1]}元/吨`;

    const rangeLiterMatch = rawForecast.match(/([0-9.]+)\s*元\/升\s*-\s*([0-9.]+)\s*元\/升/);
    if (rangeLiterMatch) {
      valPerLiter = `${rangeLiterMatch[1]}~${rangeLiterMatch[2]}元/升`;
    } else {
      const singleLiterMatch = rawForecast.match(/([0-9.]+)\s*元\/升/);
      if (singleLiterMatch) valPerLiter = `${singleLiterMatch[1]}元/升`;
    }

    advice = isDown
      ? "建议调价后再加满"
      : isUp
      ? "建议调价前尽快加满"
      : "油价平稳，按需加油";
  }

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
