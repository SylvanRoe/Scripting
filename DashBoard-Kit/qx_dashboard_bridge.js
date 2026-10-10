const url = new URL($request.url);
const action = url.searchParams.get("action") || "status";
const mode = url.searchParams.get("mode") || "";
const policy = url.searchParams.get("policy") || "";
const node = url.searchParams.get("node") || "";

function sendMsg(act, content) {
  return new Promise((resolve) => {
    const msg = content !== undefined ? { action: act, content } : { action: act };
    $configuration.sendMessage(msg).then(
      (res) => resolve(res && res.ret ? res.ret : res),
      () => resolve(null)
    );
  });
}

(async () => {
  if (action === "set_mode" && mode) {
    await sendMsg("set_running_mode", { running_mode: mode });
  } else if (action === "set_policy" && policy && node) {
    const dict = {};
    dict[policy] = node;
    await sendMsg("set_policy_state", dict);
  }
  const modeRet = await sendMsg("get_running_mode");
  const stateRet = await sendMsg("get_policy_state");
  $done({
    status: "HTTP/1.1 200 OK",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      ok: true,
      running_mode: (modeRet && modeRet.running_mode) || mode || "filter",
      policies: stateRet || {}
    })
  });
})();
