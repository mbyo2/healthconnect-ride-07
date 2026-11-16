// Diagnostic: why does the local build hang on "Checking permissions..."?
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import WebSocket from "/home/hatch/workspace/repos/healthconnect-ride-07/node_modules/ws/wrapper.mjs";

const CHROME = "/home/hatch/.cache/puppeteer/chrome-headless-shell/linux-156.0.8078.47/chrome-headless-shell-linux64/chrome-headless-shell";
const BASE = "http://localhost:4181";
const REF = "tthzcijscedgxjfnfnky";
const ANON = fs.readFileSync("/home/hatch/.qa-tokens/doc-anon.txt", "utf8").trim();
const TOK = JSON.parse(fs.readFileSync("/home/hatch/.qa-tokens/docswarm-instadmin.json", "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 9700 + Math.floor(Math.random() * 200);
const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, "--no-sandbox", "--disable-gpu",
  "--proxy-server=http://127.0.0.1:18080",
  "--ignore-certificate-errors", "--hide-scrollbars", `--user-data-dir=/tmp/rp-diag-${port}`, "about:blank"],
  { stdio: "ignore" });
await sleep(3000);
const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res) => ws.on("open", res));
let seq = 0; const pending = new Map(); const consoleMsgs = []; const failedReqs = [];
ws.on("message", (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type))
    consoleMsgs.push(m.params.type + ": " + (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" ").slice(0, 300));
  if (m.method === "Runtime.exceptionThrown")
    consoleMsgs.push("EXCEPTION: " + JSON.stringify(m.params.exceptionDetails).slice(0, 400));
  if (m.method === "Network.loadingFailed")
    failedReqs.push(m.params.errorText + " " + (m.params.canceled ? "(canceled)" : ""));
});
const sendGlobal = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const { result: { targetId } } = await sendGlobal("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await sendGlobal("Target.attachToTarget", { targetId, flatten: true });
const s = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params, sessionId })); });
await s("Page.enable"); await s("Runtime.enable"); await s("Network.enable");
await s("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const t = TOK.a;
const sess = JSON.stringify({ access_token: t.access_token, refresh_token: t.refresh_token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: t.user_id, email: t.email } });
await s("Page.addScriptToEvaluateOnNewDocument", { source: `try{ localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(sess)}); }catch(e){}` });
const ev = async (expr) => {
  const r = await s("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return { __err: String(r.result.exceptionDetails.text || "").slice(0, 300) };
  return r.result?.result?.value;
};
await s("Page.navigate", { url: `${BASE}/institution/settings` });
await sleep(15000);
console.log("BODY:", await ev(`document.body.innerText.slice(0,300)`));
console.log("LS-KEYS:", await ev(`Object.keys(localStorage)`));
console.log("TOKEN-VALID:", await ev(`fetch('https://${REF}.supabase.co/auth/v1/user', {headers:{apikey:'${ANON}', Authorization:'Bearer ${t.access_token}'}}).then(r=>r.status+' '+r.ok).catch(e=>'ERR '+e)`));
console.log("ROLES-QUERY:", await ev(`fetch('https://${REF}.supabase.co/rest/v1/user_roles?select=role&user_id=eq.${t.user_id}', {headers:{apikey:'${ANON}', Authorization:'Bearer ${t.access_token}'}}).then(async r=>r.status+' '+(await r.text()).slice(0,200)).catch(e=>'ERR '+e)`));
console.log("CONSOLE:", JSON.stringify(consoleMsgs.slice(0, 10), null, 1));
console.log("FAILED-REQS:", JSON.stringify(failedReqs.slice(0, 10)));
proc.kill();
process.exit(0);
