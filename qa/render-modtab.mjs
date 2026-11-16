// Focused check: AdminDashboard Modules tab content for the platform admin.
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import WebSocket from "/home/hatch/workspace/repos/healthconnect-ride-07/node_modules/ws/wrapper.mjs";

const CHROME = "/home/hatch/.cache/puppeteer/chrome-headless-shell/linux-156.0.8078.47/chrome-headless-shell-linux64/chrome-headless-shell";
const BASE = "http://localhost:4181";
const REF = "tthzcijscedgxjfnfnky";
const OUT = "/home/hatch/workspace/docswarm-instadmin/qa/evidence/render";
const TOK = JSON.parse(fs.readFileSync("/home/hatch/.qa-tokens/docswarm-instadmin.json", "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9700 + Math.floor(Math.random() * 200);
const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, "--no-sandbox", "--disable-gpu",
  "--proxy-server=http://127.0.0.1:18080",
  "--ignore-certificate-errors", "--hide-scrollbars", `--user-data-dir=/tmp/rp-modtab-${port}`, "about:blank"],
  { stdio: "ignore" });
await sleep(3000);
const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res) => ws.on("open", res));
let seq = 0; const pending = new Map();
ws.on("message", (raw) => { const m = JSON.parse(raw.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const sendGlobal = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const { result: { targetId } } = await sendGlobal("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await sendGlobal("Target.attachToTarget", { targetId, flatten: true });
const s = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params, sessionId })); });
await s("Page.enable"); await s("Runtime.enable");
await s("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
const t = TOK.platform;
const sess = JSON.stringify({ access_token: t.access_token, refresh_token: t.refresh_token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: t.user_id, email: t.email } });
await s("Page.addScriptToEvaluateOnNewDocument", { source: `try{ localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(sess)}); }catch(e){}` });
const ev = async (expr) => {
  const r = await s("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return { __err: String(r.result.exceptionDetails.text || "").slice(0, 300) };
  return r.result?.result?.value;
};
await s("Page.navigate", { url: `${BASE}/admin-dashboard?tab=modules` });
await sleep(10000);
console.log("URL:", await ev(`location.href`));
console.log("AFTER-TEXT-HAS-MANAGER:", await ev(`({ grantUI: document.body.innerText.includes('Grant'), selectInst: /select.*institution/i.test(document.body.innerText), hasModules: document.body.innerText.includes('Module'), snippet: document.body.innerText.slice(0, 900) })`));
const shot = await s("Page.captureScreenshot", { format: "png" });
if (shot.result?.data) fs.writeFileSync(`${OUT}/admin-modules-tab.png`, Buffer.from(shot.result.data, "base64"));
console.log("shot saved");
proc.kill();
process.exit(0);
