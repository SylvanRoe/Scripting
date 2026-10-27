/**
 * 中国移动 · Quantumult X 获取登录凭证专用脚本
 * 
 * 作用：拦截中国移动 APP 登录请求，解密并提取登录凭证（cmcc_login），供 Scripting 桌面小组件读取展示话费、流量与积分。
 *
 * 【Quantumult X 配置】
 * 
 * [mitm]
 * hostname = client.app.coc.10086.cn, clientaccess.10086.cn, h5.bj.10086.cn
 * 
 * [rewrite_local]
 * ^https?:\/\/client\.app\.coc\.10086\.cn\/biz-orange\/[LD]N\/uam(onekey|randcode)login\/autoLogin url script-request-body https://raw.githubusercontent.com/SylvanRoe/Scripting/main/cmcc_cookie.js
 * ^https?:\/\/clientaccess\.10086\.cn\/biz-orange\/BN\/scoreQueryService\/getScoreQuery url script-request-body https://raw.githubusercontent.com/SylvanRoe/Scripting/main/cmcc_cookie.js
 * ^https?:\/\/h5\.bj\.10086\.cn\/ActSignIn2023\/doPrize url script-request-header https://raw.githubusercontent.com/SylvanRoe/Scripting/main/cmcc_cookie.js
 *
 * 【抓取说明】
 * 1. 划掉后台的「中国移动」APP；
 * 2. 重新打开 APP，若未触发，在「我的」->「设置」中退出登录，然后点击「本机号码一键登录」；
 * 3. 弹窗提示「✅ 中国移动 Cookie 获取成功」即完成。
 */

const K_LOGIN = "cmcc_login";
const K_CONSTID = "cmcc_constid";

const LK = "tVkdaRWRY0ZkV1Vr";
const LIV = "VjFSQ1ZtVkQxRTlQ";

// ==================== 高性能轻量解密算法 ====================
function u8(s) {
  if (s instanceof Uint8Array) return s;
  const str = String(s || "");
  const o = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
      const d = str.charCodeAt(i + 1);
      if (d >= 0xdc00 && d < 0xe000) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) o.push(c);
    else if (c < 0x800) o.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) o.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else o.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(o);
}

function u8s(b) {
  let s = "";
  for (let i = 0; i < b.length;) {
    const c = b[i++];
    let cp;
    if (c < 0x80) cp = c;
    else if (c < 0xe0) cp = ((c & 31) << 6) | (b[i++] & 63);
    else if (c < 0xf0) cp = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else cp = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    if (cp > 0xffff) {
      cp -= 0x10000;
      s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023));
    } else s += String.fromCharCode(cp);
  }
  return s;
}

const B64A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function b64dec(s) {
  const str = String(s || "").replace(/[^A-Za-z0-9+/]/g, "");
  const out = [];
  let buf = 0, bits = 0;
  for (let i = 0; i < str.length; i++) {
    buf = (buf << 6) | B64A.indexOf(str[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

const ASB = (() => {
  const s = new Uint8Array(256);
  let p = 1, q = 1;
  do {
    p = p ^ (p << 1) ^ (p & 0x80 ? 0x11b : 0);
    p &= 0xff;
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xff;
    if (q & 0x80) q ^= 0x09;
    const x = q ^ (q << 1 | q >>> 7) ^ (q << 2 | q >>> 6) ^ (q << 3 | q >>> 5) ^ (q << 4 | q >>> 4);
    s[p] = (x ^ 0x63) & 0xff;
  } while (p !== 1);
  s[0] = 0x63;
  return s;
})();

const AISB = (() => {
  const inv = new Uint8Array(256);
  for (let i = 0; i < 256; i++) inv[ASB[i]] = i;
  return inv;
})();

function xt(a) { return ((a << 1) ^ (a & 0x80 ? 0x11b : 0)) & 0xff; }
function mul(a, b) {
  let r = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) r ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return r & 0xff;
}

function expand128(key) {
  const Nk = 4, Nr = 10, w = new Uint8Array(16 * (Nr + 1));
  w.set(key);
  const rcon = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
  let i = Nk;
  const t = new Uint8Array(4);
  while (i < 4 * (Nr + 1)) {
    for (let k = 0; k < 4; k++) t[k] = w[(i - 1) * 4 + k];
    if (i % Nk === 0) {
      const tmp = t[0];
      t[0] = ASB[t[1]] ^ rcon[i / Nk - 1];
      t[1] = ASB[t[2]];
      t[2] = ASB[t[3]];
      t[3] = ASB[tmp];
    }
    for (let k = 0; k < 4; k++) w[i * 4 + k] = w[(i - Nk) * 4 + k] ^ t[k];
    i++;
  }
  return { w, Nr };
}

function decBlock(st, w, Nr) {
  const s = st.slice();
  for (let k = 0; k < 16; k++) s[k] ^= w[Nr * 16 + k];
  for (let r = Nr - 1; r >= 1; r--) {
    invShiftRows(s);
    for (let k = 0; k < 16; k++) s[k] = AISB[s[k]];
    for (let k = 0; k < 16; k++) s[k] ^= w[r * 16 + k];
    invMixCols(s);
  }
  invShiftRows(s);
  for (let k = 0; k < 16; k++) s[k] = AISB[s[k]];
  for (let k = 0; k < 16; k++) s[k] ^= w[k];
  return s;
}

function invShiftRows(s) {
  const t = [s[0], s[13], s[10], s[7], s[4], s[1], s[14], s[11], s[8], s[5], s[2], s[15], s[12], s[9], s[6], s[3]];
  for (let i = 0; i < 16; i++) s[i] = t[i];
}

function invMixCols(s) {
  for (let c = 0; c < 4; c++) {
    const o = c * 4, a0 = s[o], a1 = s[o + 1], a2 = s[o + 2], a3 = s[o + 3];
    s[o] = mul(a0, 14) ^ mul(a1, 11) ^ mul(a2, 13) ^ mul(a3, 9);
    s[o + 1] = mul(a0, 9) ^ mul(a1, 14) ^ mul(a2, 11) ^ mul(a3, 13);
    s[o + 2] = mul(a0, 13) ^ mul(a1, 9) ^ mul(a2, 14) ^ mul(a3, 11);
    s[o + 3] = mul(a0, 11) ^ mul(a1, 13) ^ mul(a2, 9) ^ mul(a3, 14);
  }
}

function aesCbcDec(cipherBytes, keyText, ivText) {
  const { w, Nr } = expand128(u8(keyText)), iv = u8(ivText), out = new Uint8Array(cipherBytes.length);
  let prev = iv;
  for (let i = 0; i < cipherBytes.length; i += 16) {
    const blk = cipherBytes.subarray(i, i + 16), pt = decBlock(blk.slice(), w, Nr);
    for (let k = 0; k < 16; k++) pt[k] ^= prev[k];
    out.set(pt, i);
    prev = blk;
  }
  const pad = out[out.length - 1];
  return out.slice(0, out.length - (pad > 0 && pad <= 16 ? pad : 0));
}

function decStr(b64str, keyText, ivText) {
  return u8s(aesCbcDec(b64dec(b64str), keyText, ivText));
}

function maskPhone(p) {
  return p && p.length === 11 ? p.slice(0, 3) + "****" + p.slice(7) : p || "";
}

// ==================== Quantumult X 存储与通知适配 ====================
function readVal(key) {
  if (typeof $prefs !== "undefined") return $prefs.valueForKey(key);
  if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
  return "";
}

function writeVal(val, key) {
  if (typeof $prefs !== "undefined") return $prefs.setValueForKey(val, key);
  if (typeof $persistentStore !== "undefined") return $persistentStore.write(val, key);
  return false;
}

function notify(title, subtitle, message) {
  if (typeof $notify !== "undefined") $notify(title, subtitle, message);
  else if (typeof $notification !== "undefined") $notification.post(title, subtitle, message);
  console.log(`[${title}] ${subtitle} ${message}`);
}

function loadAccounts() {
  const raw = readVal(K_LOGIN);
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p.filter(Boolean);
  } catch (e) {}
  return [raw];
}

function telOf(J) {
  try { return JSON.parse(J).tel || ""; } catch (e) { return ""; }
}

// ==================== 核心抓取执行 ====================
function capture() {
  if (typeof $request === "undefined" || !$request) {
    console.log("[中国移动] 未检测到网络请求上下文，请确保在 Quantumult X 重写规则中运行。");
    if (typeof $done !== "undefined") $done({});
    return;
  }

  if ($request.method === "OPTIONS") {
    if (typeof $done !== "undefined") $done({});
    return;
  }

  const url = $request.url || "";
  const body = $request.body || "";

  try {
    // 1. 抓取登录信封 (autoLogin)
    if (/uam(onekey|randcode)login\/autoLogin/.test(url)) {
      if (!body) {
        console.log("[中国移动] 拦截到 autoLogin 请求，但 body 为空");
        if (typeof $done !== "undefined") $done({});
        return;
      }

      const J = decStr(body, LK, LIV);
      const obj = JSON.parse(J);
      if (!obj.xk) throw new Error("解密成功，但登录信封中缺少 xk 凭据");

      const tel = obj.tel || "";
      const arr = loadAccounts().filter((x) => telOf(x) !== tel);
      arr.push(J);

      writeVal(JSON.stringify(arr), K_LOGIN);

      const msg = `账号 ${maskPhone(tel)} (共 ${arr.length} 个账号)`;
      notify("中国移动", "✅ 中国移动 Cookie 获取成功", msg);
      console.log(`[中国移动] 登录信封保存成功: ${msg}`);
    } 
    // 2. 抓取签到设备标识 (doPrize)
    else if (/ActSignIn2023\/doPrize/.test(url)) {
      const m = url.match(/[?&]constid=([^&]+)/);
      if (m) {
        const cid = decodeURIComponent(m[1]);
        writeVal(cid, K_CONSTID);
        notify("中国移动", "✅ 中国移动 Cookie 获取成功", "签到设备标识已保存");
        console.log("[中国移动] 签到标识已保存: " + cid);
      }
    }
  } catch (e) {
    console.log("[中国移动] 抓取解析异常: " + (e.message || e));
  }

  if (typeof $done !== "undefined") $done({});
}

capture();
