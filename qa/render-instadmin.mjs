// DOC SWARM Group 3 — local-build render pass (CDP, chrome-headless-shell).
// Signs in via seeded Supabase session (QA users only) and checks:
//  - /institution/settings renders the Modules list with NO Enable/Disable
//    toggle buttons (fix 2026-11-16) at 390px light + dark + 1280px.
//  - /institution-dashboard renders the QA institution at 390px.
//  - /admin-dashboard Modules tab renders for the platform admin.
//  - horizontal overflow at phone widths 360/390/414/430.
// Screenshots -> qa/evidence/render/*.png ; results -> qa/evidence/render/results.json
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import WebSocket from "/home/hatch/workspace/repos/healthconnect-ride-07/node_modules/ws/wrapper.mjs";

const CHROME = "/home/hatch/.cache/puppeteer/chrome-headless-shell/linux-156.0.8078.47/chrome-headless-shell-linux64/chrome-headless-shell";
const BASE = "http://localhost:4181";
const REF = "tthzcijscedgxjfnfnky";
const OUT = "/home/hatch/workspace/docswarm-instadmin/qa/evidence/render";
fs.mkdirSync(OUT, { recursive: true });
const TOK = JSON.parse(fs.readFileSync("/home/hatch/.qa-tokens/docswarm-instadmin.json", "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = { checks: {}, screenshots: [] };

function sessionJson(key) {
  const t = TOK[key];
  const sess = {
    access_token: t.access_token, refresh_token: t.refresh_token,
    token_type: "bearer", expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: t.user_id, email: t.email },
  };
  return JSON.stringify(sess);
}

const port = 9700 + Math.floor(Math.random() * 200);
const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, "--no-sandbox", "--disable-gpu",
  "--proxy-server=http://127.0.0.1:18080",
  "--ignore-certificate-errors", "--hide-scrollbars", `--user-data-dir=/tmp/rp-instadmin-${port}`, "about:blank"],
  { stdio: "ignore" });
await sleep(3000);
const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res) => ws.on("open", res));
let seq = 0; const pending = new Map();
ws.on("message", (raw) => { const m = JSON.parse(raw.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const sendGlobal = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });

async function newPage({ width = 390, height = 844, dark = false, sessionKey = null } = {}) {
  const { result: { targetId } } = await sendGlobal("Target.createTarget", { url: "about:blank" });
  const { result: { sessionId } } = await sendGlobal("Target.attachToTarget", { targetId, flatten: true });
  const s = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  await s("Page.enable"); await s("Runtime.enable"); await s("Log.enable");
  await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  if (dark) await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  let seed = "";
  if (sessionKey) seed += `try{ localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(sessionJson(sessionKey))}); }catch(e){}\n`;
  seed += `try{ localStorage.setItem('doc-oclock-theme', '${dark ? "dark" : "light"}'); }catch(e){}\n`;
  await s("Page.addScriptToEvaluateOnNewDocument", { source: seed });
  const ev = async (expr) => {
    const r = await s("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) return { __err: String(r.result.exceptionDetails.text || r.result.exceptionDetails.exception?.description || "").slice(0, 300) };
    return r.result?.result?.value;
  };
  const nav = async (url, wait = 9000) => { await s("Page.navigate", { url }); await sleep(wait); };
  const shot = async (name) => {
    const r = await s("Page.captureScreenshot", { format: "png" });
    const file = `${OUT}/${name}.png`;
    if (r.result?.data) { fs.writeFileSync(file, Buffer.from(r.result.data, "base64")); results.screenshots.push(file); }
    return file;
  };
  const close = async () => { await sendGlobal("Target.closeTarget", { targetId }); };
  return { ev, nav, shot, close, s };
}

const overflow = () => `({sw: document.documentElement.scrollWidth, iw: window.innerWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth + 1, bodyText: document.body.innerText.slice(0, 400)})`;
const countModuleToggles = () => `(() => {
  const cards = [...document.querySelectorAll('*')].filter(e => e.textContent === 'Modules & Add-ons');
  const btns = [...document.querySelectorAll('button')].filter(b => /^(Enable|Disable)$/.test(b.textContent.trim()));
  const modSection = document.body.innerText.includes('Modules & Add-ons');
  return { modSection, toggleButtons: btns.length, toggleLabels: btns.map(b => b.textContent.trim()) };
})()`;

// 1. Institution settings — admin A, 390px light
{
  const p = await newPage({ width: 390, sessionKey: "a" });
  await p.nav(`${BASE}/institution/settings`);
  results.checks.settings_390_light = {
    ...(await p.ev(overflow())),
    ...(await p.ev(countModuleToggles())),
    modulesUnavailable: await p.ev(`document.body.innerText.includes('Modules unavailable')`),
  };
  await p.shot("settings-390-light");
  await p.close();
}
// 2. Institution settings — admin A, 390px dark
{
  const p = await newPage({ width: 390, dark: true, sessionKey: "a" });
  await p.nav(`${BASE}/institution/settings`);
  results.checks.settings_390_dark = {
    ...(await p.ev(overflow())),
    ...(await p.ev(countModuleToggles())),
  };
  await p.shot("settings-390-dark");
  await p.close();
}
// 3. Institution settings — admin A, desktop 1280px
{
  const p = await newPage({ width: 1280, height: 900, sessionKey: "a" });
  await p.nav(`${BASE}/institution/settings`);
  results.checks.settings_1280 = {
    ...(await p.ev(overflow())),
    ...(await p.ev(countModuleToggles())),
  };
  await p.shot("settings-1280");
  await p.close();
}
// 4. Institution dashboard — admin A, 390px
{
  const p = await newPage({ width: 390, sessionKey: "a" });
  await p.nav(`${BASE}/institution-dashboard`);
  results.checks.dashboard_390 = {
    ...(await p.ev(overflow())),
    hasQaInstitution: await p.ev(`document.body.innerText.includes('QA Swarm')`),
    snippet: await p.ev(`document.body.innerText.slice(0, 300)`),
  };
  await p.shot("dashboard-390");
  await p.close();
}
// 5. Phone widths overflow sweep on settings (360/414/430)
for (const w of [360, 414, 430]) {
  const p = await newPage({ width: w, sessionKey: "a" });
  await p.nav(`${BASE}/institution/settings`);
  results.checks[`settings_${w}`] = await p.ev(overflow());
  await p.close();
}
// 6. Admin dashboard Modules tab — platform admin, 1280px
{
  const p = await newPage({ width: 1280, height: 900, sessionKey: "platform" });
  await p.nav(`${BASE}/admin-dashboard`);
  await sleep(3000);
  const clicked = await p.ev(`(() => {
    const t = [...document.querySelectorAll('button, [role=tab]')].find(e => /modules/i.test(e.textContent) && e.textContent.trim().length < 30);
    if (t) { t.click(); return t.textContent.trim(); } return null;
  })()`);
  await sleep(4000);
  results.checks.admin_modules_tab = {
    clickedTab: clicked,
    ...(await p.ev(overflow())),
    hasModuleManager: await p.ev(`document.body.innerText.includes('Modules')`),
    snippet: await p.ev(`document.body.innerText.slice(0, 300)`),
  };
  await p.shot("admin-modules-1280");
  await p.close();
}

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
proc.kill();
process.exit(0);
