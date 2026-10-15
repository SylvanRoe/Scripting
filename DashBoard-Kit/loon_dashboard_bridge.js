/**
 * Loon DashBoard-Kit 桌面交互小组件 本地 OpenAPI 桥接脚本
 *
 * 触发方式（插件里已配好三条规则，任选其一命中即可）：
 *   http://cp.cloudflare.com/loon-bridge
 *   http://1.1.1.1/loon-bridge            ← 无 DNS 依赖，最稳，实测可用
 *   http://loon.lan/api
 *
 * 支持参数：
 * - action: "status" | "set_mode" | "set_policy"
 * - mode:   "direct" | "filter" | "proxy" 或 0 | 1 | 2
 * - policy: 策略组名称
 * - node:   目标节点名称
 * - group:  只探查指定策略组的候选节点
 *
 * 关于 API（实测 Loon 暴露的能力）：
 *   $config.getConfig()                    → 配置 JSON（policy_select 只含部分策略组！）
 *   $config.getPolicy(name)                → 读取单个策略组（可能返回 JSON 字符串）
 *   $config.getSubPolicys(name, cb)        → ★ 正确拼写，取候选子策略
 *   $config.getSubPolicies(name, cb)       → 另一拼写，实测回调第一个参数是 string（不可用）
 *   $config.setSelectPolicy(name, select)  → ★ 设置策略组所选
 *   $config.setRunningModel(0|1|2)         → 设置运行模式
 * Loon 的 JS 桥会把值以 JSON 编码的字符串返回，需要 JSON.parse，且 "null" 要当空处理。
 */

function parseQuery(urlStr) {
  const query = {};
  const qIdx = urlStr.indexOf("?");
  if (qIdx >= 0) {
    const qStr = urlStr.slice(qIdx + 1);
    const pairs = qStr.split("&");
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (!pair) continue;
      const eqIdx = pair.indexOf("=");
      if (eqIdx >= 0) {
        query[decodeURIComponent(pair.slice(0, eqIdx))] = decodeURIComponent(pair.slice(eqIdx + 1));
      } else {
        query[decodeURIComponent(pair)] = "";
      }
    }
  }
  return query;
}

/** Loon 会把值以 JSON 字符串形式返回：'"美国节点"' / 'null' / '[]' —— 统一解码 */
function decodeLoonValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s || s === "null" || s === "undefined") return null;
    if (s.charAt(0) === '"' || s.charAt(0) === "[" || s.charAt(0) === "{") {
      try {
        const p = JSON.parse(s);
        return p === null || p === undefined ? null : p;
      } catch (e) {
        return s;
      }
    }
    return s;
  }
  return v;
}

function toArray(v) {
  const d = decodeLoonValue(v);
  if (Array.isArray(d)) return d;
  if (typeof d === "string" && d.indexOf(",") >= 0) {
    return d.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }
  return null;
}

/** getSubPolicys 返回的是 [{type, name}]，统一转成名字字符串数组 */
function normalizeSubList(list) {
  const out = [];
  if (!Array.isArray(list)) return out;
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (typeof it === "string") out.push(it);
    else if (it && typeof it === "object") {
      const nm = it.name || it.policy || it.title;
      if (nm) out.push(String(nm));
    }
  }
  return out;
}

/** Loon 会把 DIRECT/REJECT 这类内置策略排在候选列表最前面，
 *  策略组未显式选择时真正生效的是配置里声明的第一个成员（即跳过去除内置项后的第一个）。 */
const BUILTIN_POLICIES = ["DIRECT", "REJECT", "REJECT-DROP", "REJECT-TINYGIF", "REJECT-NO-DROP", "PROXY"];
function inferSelection(list) {
  for (let i = 0; i < list.length; i++) {
    const up = String(list[i]).trim().toUpperCase();
    if (BUILTIN_POLICIES.indexOf(up) < 0) return list[i];
  }
  return list.length > 0 ? list[0] : null;
}

function brief(v) {
  try {
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (Array.isArray(v)) return "array[" + v.length + "]";
    if (typeof v === "object") return "obj";
    const s = String(v);
    return typeof v + ":" + s.slice(0, 40);
  } catch (e) { return "?"; }
}

/**
 * 取策略组候选子策略：依次尝试 getSubPolicys（正确拼写）与 getSubPolicies
 */
function getSubPoliciesAsync(policyName, timeoutMs, debugOut) {
  return new Promise(function (resolve) {
    const candidates = ["getSubPolicys", "getSubPolicies"];
    let idx = 0;

    function attempt() {
      if (idx >= candidates.length) { resolve([]); return; }
      const apiName = candidates[idx++];
      let fn = null;
      try { fn = $config && $config[apiName]; } catch (e) {}
      if (typeof fn !== "function") { attempt(); return; }

      let settled = false;
      const timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        debugOut.push(apiName + ":timeout");
        attempt();
      }, timeoutMs);

      try {
        const ret = fn.call($config, policyName, function (a, b) {
          if (settled) return;
          const arr = toArray(a) || toArray(b);
          if (arr && arr.length > 0) {
            settled = true;
            clearTimeout(timer);
            debugOut.push(apiName + ":ok(" + arr.length + ")");
            resolve(arr);
          } else {
            settled = true;
            clearTimeout(timer);
            debugOut.push(apiName + ":empty(" + brief(a) + "|" + brief(b) + ")");
            attempt();
          }
        });
        if (ret && typeof ret.then === "function") {
          ret.then(function (val) {
            if (settled) return;
            const arr = toArray(val);
            if (arr && arr.length > 0) {
              settled = true;
              clearTimeout(timer);
              debugOut.push(apiName + ":promise(" + arr.length + ")");
              resolve(arr);
            }
          }).catch(function () {});
        }
      } catch (e) {
        settled = true;
        clearTimeout(timer);
        debugOut.push(apiName + ":throw " + String(e).slice(0, 40));
        attempt();
      }
    }

    attempt();
  });
}

/** 读取单个策略组当前选中的策略：优先 getPolicy，其次 getSelectedPolicy */
function readSelectedPolicy(policyName) {
  const tried = [];
  const apis = ["getPolicy", "getSelectedPolicy"];
  for (let i = 0; i < apis.length; i++) {
    const apiName = apis[i];
    let fn = null;
    try { fn = $config && $config[apiName]; } catch (e) {}
    if (typeof fn !== "function") continue;
    try {
      const raw = fn.call($config, policyName);
      if (raw && typeof raw.then === "function") {
        tried.push({ api: apiName, value: "(thenable)" });
        continue;
      }
      const v = decodeLoonValue(raw);
      if (typeof v === "string" && v) return { name: v, tried: tried.concat([{ api: apiName, value: v }]) };
      if (v && typeof v === "object") {
        const nm = v.selected || v.select || v.now || v.current || v.policy;
        if (typeof nm === "string" && nm) {
          return { name: nm, tried: tried.concat([{ api: apiName, value: v }]) };
        }
        // 可能是候选列表：记下来但不作为选中值
        tried.push({ api: apiName, value: brief(v) });
      } else {
        tried.push({ api: apiName, value: brief(raw) });
      }
    } catch (e) {
      tried.push({ api: apiName, error: String(e).slice(0, 60) });
    }
  }
  return { name: null, tried: tried };
}

(async function () {
  try {
    const reqUrl = (typeof $request !== "undefined" && $request.url) ? $request.url : "";
    const query = parseQuery(reqUrl);
    const action = query.action || "status";
    const mode = query.mode || "";
    const policy = query.policy || "";
    const node = query.node || "";

    let setVia = "";

    // 1. 设置运行模式 (0: 全部直连, 1: 分流模式, 2: 全局代理)
    if (action === "set_mode" && mode !== "") {
      let target = -1;
      if (mode === "0" || mode === "direct" || mode === "all_direct") target = 0;
      else if (mode === "1" || mode === "filter" || mode === "rule") target = 1;
      else if (mode === "2" || mode === "proxy" || mode === "all_proxy") target = 2;
      if (target >= 0 && $config && typeof $config.setRunningModel === "function") {
        $config.setRunningModel(target);
        setVia = "setRunningModel";
      }
    }

    // 2. 切换策略组选中的节点
    if (action === "set_policy" && policy && node) {
      if ($config && typeof $config.setSelectPolicy === "function") {
        try { $config.setSelectPolicy(policy, node); setVia = "setSelectPolicy"; } catch (e) {}
      }
      if (!setVia && $config && typeof $config.getConfig === "function") {
        try { $config.getConfig(policy, node); setVia = "getConfig"; } catch (e) {}
      }
    }

    // 3. 读取当前配置
    let configObj = {};
    if ($config && typeof $config.getConfig === "function") {
      try {
        const raw = $config.getConfig();
        const decoded = decodeLoonValue(raw);
        if (decoded && typeof decoded === "object") configObj = decoded;
        else if (typeof decoded === "string") configObj = JSON.parse(decoded);
      } catch (e) { configObj = {}; }
    }

    const runningModelNum = typeof configObj.running_model === "number" ? configObj.running_model : 1;
    let runningModeStr = "filter";
    if (runningModelNum === 0) runningModeStr = "all_direct";
    else if (runningModelNum === 2) runningModeStr = "all_proxy";

    const policySelect = configObj.policy_select || {};
    const allPolicyGroups = Array.isArray(configObj.all_policy_groups)
      ? configObj.all_policy_groups
      : Object.keys(policySelect);

    // 4. 补齐 policy_select：Loon 的 getConfig() 只返回一部分策略组
    const filledPolicySelect = {};
    const probeResults = {};
    for (let i = 0; i < allPolicyGroups.length && i < 40; i++) {
      const g = allPolicyGroups[i];
      if (!g || policySelect[g]) continue;
      const r = readSelectedPolicy(g);
      if (r.name) {
        policySelect[g] = r.name;
        filledPolicySelect[g] = r.name;
      } else {
        probeResults[g] = r.tried;
      }
    }

    // 5. 取策略组候选子策略（默认取全部策略组，上限 20 个组、每组 30 个候选）
    const subTimeout = Number(query.sub_timeout) > 0 ? Number(query.sub_timeout) : 2500;
    const wantGroups = query.groups
      ? query.groups.split("|")
      : query.group
        ? [query.group]
        : allPolicyGroups.slice(0, 20);
    const subPoliciesMap = {};
    const subDebug = {};

    await Promise.all(wantGroups.map(async function (gName) {
      if (!gName) return;
      const dbg = [];
      const raw = await getSubPoliciesAsync(gName, subTimeout, dbg);
      const list = normalizeSubList(raw).slice(0, 30);
      subDebug[gName] = { count: list.length, api: dbg.join(" → ") };
      if (list.length > 0) subPoliciesMap[gName] = list;
    }));

    // 6. 对于 Loon 没记录选中值的策略组（getPolicy / getSelectedPolicy 都返回 null），
    //    用「跳过 DIRECT/REJECT 后的第一个成员」作为实际生效值的推断
    const inferredPolicySelect = {};
    for (const g in subPoliciesMap) {
      if (policySelect[g]) continue;
      const guess = inferSelection(subPoliciesMap[g]);
      if (guess) {
        policySelect[g] = guess;
        inferredPolicySelect[g] = guess;
      }
    }

    const responseData = {
      ok: true,
      service: "loon",
      running_model: runningModelNum,
      running_mode: runningModeStr,
      policy_select: policySelect,
      selected_policy_filled: filledPolicySelect,
      selected_policy_inferred: inferredPolicySelect,
      selected_policy_probe: probeResults,
      sub_policies: subPoliciesMap,
      sub_debug: subDebug,
      all_policy_groups: allPolicyGroups,
      ssid: configObj.ssid || "",
      final: configObj.final || "",
      global_proxy: configObj.global_proxy || "",
      set_via: setVia,
      version: "Loon",
      config_api_keys: (function () {
        try { return Object.keys($config || {}); } catch (e) { return []; }
      })(),
      config_obj_keys: Object.keys(configObj || {}),
      timestamp: Date.now(),
    };

    $done({
      response: {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(responseData),
      },
    });
  } catch (err) {
    $done({
      response: {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ ok: false, error: String(err) }),
      },
    });
  }
})();
