/**
 * 访问统计管理页面（完整版 + IP 详情弹窗）
 * 访问：https://www.mkejga.de5.net/admin
 *
 * 环境变量：
 *   ADMIN_PASSWORD   后台登录密码
 *   HOMEPAGE_KV      KV 绑定（已有）
 *   CF_API_TOKEN     Cloudflare API Token（Account Analytics: Read）
 *   CF_ACCOUNT_ID    Cloudflare Account ID
 *   IPAPI_TOKEN      （可选）ipapi.is 的 token，用于提升速率限制
 */

const COOKIE_NAME = "admin_session";
const SESSION_TTL = 60 * 60 * 8;
const QUOTA_LIMIT = 100000;

/* ---------------- 工具函数 ---------------- */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function securityHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    ...extra,
  };
}

function ccToFlag(cc) {
  if (!cc || cc.length !== 2) return "🌐";
  const OFFSET = 127397;
  try {
    return String.fromCodePoint(
      cc.toUpperCase().charCodeAt(0) + OFFSET,
      cc.toUpperCase().charCodeAt(1) + OFFSET
    );
  } catch {
    return "🌐";
  }
}

/* ---------------- 主题脚本 ---------------- */

const THEME_SCRIPT = `
(function(){
  try {
    var saved = localStorage.getItem('admin-theme');
    var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.setAttribute('data-theme', saved || (prefersLight ? 'light' : 'dark'));
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  window.__toggleTheme = function(btn){
    var cur = document.documentElement.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('admin-theme', next); } catch(e){}
    if (btn) btn.textContent = next === 'dark' ? '🌙' : '☀️';
  };
  window.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('themeBtn');
    if (!btn) return;
    var cur = document.documentElement.getAttribute('data-theme');
    btn.textContent = cur === 'dark' ? '🌙' : '☀️';
    btn.addEventListener('click', function(){ window.__toggleTheme(btn); });
  });
})();
`;

/* ---------------- 主题变量 ---------------- */

const THEME_CSS = `
:root {
  --bg: #0d0d0f;
  --bg-glow1: rgba(255,68,68,.10);
  --bg-glow2: rgba(80,120,255,.08);
  --card: rgba(37,37,37,.7);
  --card-strong: #252525;
  --card-border: rgba(255,255,255,.06);
  --text: #eee;
  --text-dim: #888;
  --text-strong: #fff;
  --table-head: rgba(255,255,255,.03);
  --row-border: rgba(255,255,255,.03);
  --quota-bg: #151515;
  --accent: #FF4444;
  --accent-2: #ff6b6b;
  --warn-bg: rgba(255,176,32,.06);
  --warn-border: rgba(255,176,32,.18);
  --warn-text: #d99419;
  --btn-ghost-bg: rgba(255,255,255,.05);
  --btn-ghost-hover: rgba(255,68,68,.12);
  --shadow-card: 0 12px 32px rgba(0,0,0,.4);
  --split-border: #3b82f6;
  --color-workers: #17DD62;
  --color-pages: #3b82f6;
  --color-quota: #FFB020;
  --tip-highlight: #d97706;
  --modal-bg: #1e1e20;
  --modal-card: rgba(255,255,255,.03);
}
html[data-theme="light"] {
  --bg: #f4f5f7;
  --bg-glow1: rgba(255,68,68,.08);
  --bg-glow2: rgba(80,120,255,.06);
  --card: rgba(255,255,255,.85);
  --card-strong: #ffffff;
  --card-border: rgba(0,0,0,.07);
  --text: #1f2328;
  --text-dim: #6a737d;
  --text-strong: #111;
  --table-head: rgba(0,0,0,.03);
  --row-border: rgba(0,0,0,.05);
  --quota-bg: #e9ebee;
  --accent: #e63946;
  --accent-2: #ff5555;
  --warn-bg: rgba(217,148,25,.08);
  --warn-border: rgba(217,148,25,.2);
  --warn-text: #a9741a;
  --btn-ghost-bg: rgba(0,0,0,.04);
  --btn-ghost-hover: rgba(255,68,68,.1);
  --shadow-card: 0 12px 32px rgba(0,0,0,.08);
  --split-border: #2563eb;
  --color-workers: #16a34a;
  --color-pages: #2563eb;
  --color-quota: #d97706;
  --tip-highlight: #b45309;
  --modal-bg: #ffffff;
  --modal-card: #fafafa;
}
`;

/* ---------------- 登录页 ---------------- */

function loginPage(hasTried) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<script>${THEME_SCRIPT}</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>管理员登录</title>
<style>
  ${THEME_CSS}
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin:0; background:var(--bg); color:var(--text);
    font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
    display:flex; align-items:center; justify-content:center;
    overflow:hidden;
    transition: background .4s, color .4s;
  }
  body::before {
    content:""; position:fixed; inset:-20%;
    background:
      radial-gradient(circle at 20% 30%, var(--bg-glow1), transparent 40%),
      radial-gradient(circle at 80% 70%, var(--bg-glow2), transparent 45%);
    animation: floatBg 12s ease-in-out infinite alternate;
    z-index:0;
  }
  @keyframes floatBg {
    from { transform: translate(0,0) scale(1); }
    to   { transform: translate(3%, -3%) scale(1.05); }
  }
  .box {
    position:relative; z-index:1;
    background:var(--card);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    padding:40px; border-radius:16px; width:340px;
    border:1px solid var(--card-border);
    box-shadow: 0 20px 60px rgba(0,0,0,.35);
    animation: popIn .5s cubic-bezier(.2,.8,.2,1) both;
    transition: background .4s, border-color .4s, box-shadow .4s;
  }
  @keyframes popIn {
    from { opacity:0; transform: translateY(20px) scale(.96); }
    to   { opacity:1; transform: translateY(0) scale(1); }
  }
  h1 { font-size:20px; margin:0 0 24px; text-align:center; color:var(--accent); letter-spacing:.5px; }
  input {
    width:100%; padding:13px 14px; border:1px solid var(--card-border); border-radius:10px;
    background:var(--card-strong); color:var(--text); font-size:14px;
    transition: border-color .25s, box-shadow .25s, background .25s;
  }
  input:focus {
    outline:none; border-color:var(--accent);
    box-shadow:0 0 0 3px rgba(255,68,68,.15), 0 0 20px rgba(255,68,68,.25);
  }
  button[type=submit] {
    width:100%; margin-top:18px; padding:13px; border:none; border-radius:10px;
    background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:white;
    font-size:14px; font-weight:bold; cursor:pointer; letter-spacing:.5px;
    transition: transform .15s, box-shadow .25s, filter .25s;
  }
  button[type=submit]:hover { filter:brightness(1.1); box-shadow:0 8px 24px rgba(255,68,68,.4); }
  button[type=submit]:active { transform: scale(.97); }
  .err {
    color:var(--accent-2); font-size:12px; margin-top:10px; text-align:center;
    animation: shake .4s;
    ${hasTried ? "" : "display:none;"}
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  .theme-toggle {
    position: fixed; top: 20px; right: 20px; z-index: 10;
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--card); border:1px solid var(--card-border);
    color: var(--text); font-size: 16px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition: transform .2s, background .3s;
  }
  .theme-toggle:hover { transform: rotate(20deg) scale(1.1); }
  .top-band {
    position: fixed; top:0; left:0; right:0; height:3px; z-index: 100;
    background: linear-gradient(90deg, #FF4444, #3b82f6, #FFB020, #FF4444);
    background-size: 300% 100%;
    animation: bandFlow 6s linear infinite;
  }
  @keyframes bandFlow {
    0% { background-position: 0% 0; }
    100% { background-position: 300% 0; }
  }
</style>
</head>
<body>
  <div class="top-band" aria-hidden="true"></div>
  <button class="theme-toggle" id="themeBtn" title="切换主题">🌙</button>
  <div class="box">
    <h1>管理员登录</h1>
    <form method="post">
      <input type="password" name="pwd" placeholder="请输入密码" autofocus autocomplete="current-password">
      <button type="submit">登 录</button>
      <div class="err">${hasTried ? "密码错误" : ""}</div>
    </form>
  </div>
</body>
</html>`;
}

/* ---------------- Cloudflare API ---------------- */

async function fetchUsageSplit(env, dateStr) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
    return { workers: 0, pages: 0, error: "missing_config" };
  }

  const query = `
    query {
      viewer {
        accounts(filter: {accountTag: "${env.CF_ACCOUNT_ID}"}) {
          workers: workersInvocationsAdaptive(
            limit: 1,
            filter: { date_geq: "${dateStr}", date_leq: "${dateStr}" }
          ) { sum { requests } }
          pages: pagesFunctionsInvocationsAdaptiveGroups(
            limit: 1,
            filter: { date_geq: "${dateStr}", date_leq: "${dateStr}" }
          ) { sum { requests } }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) return { workers: 0, pages: 0, error: "api_" + res.status };
    const json = await res.json();
    if (json.errors) return { workers: 0, pages: 0, error: "api_error" };

    const acc = json.data?.viewer?.accounts?.[0] || {};
    const workers = acc.workers?.[0]?.sum?.requests || 0;
    const pages = acc.pages?.[0]?.sum?.requests || 0;
    return { workers, pages, error: null };
  } catch {
    return { workers: 0, pages: 0, error: "network" };
  }
}

/* ---------------- 倒计时 ---------------- */

function getResetCountdown() {
  const now = Date.now();
  const bj = new Date(now + 8 * 3600 * 1000);
  const today8 = Date.UTC(bj.getUTCFullYear(), bj.getUTCMonth(), bj.getUTCDate(), 8, 0, 0) - 8 * 3600 * 1000;
  const target = now >= today8 ? today8 + 24 * 3600 * 1000 : today8;
  return { resetAt: target, diffMs: target - now };
}

/* ---------------- 主入口 ---------------- */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const adminPwd = env.ADMIN_PASSWORD || "";
  const cookieToken = getCookie(request, COOKIE_NAME);

  let isAdmin = false;
  if (adminPwd && cookieToken) {
    const session = await env.HOMEPAGE_KV.get(`admin:session:${cookieToken}`);
    if (session === "1") isAdmin = true;
  }

  if (url.pathname === "/admin/logout") {
    if (cookieToken) await env.HOMEPAGE_KV.delete(`admin:session:${cookieToken}`);
    return new Response(null, {
      status: 302,
      headers: securityHeaders({
        "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
        Location: "/admin",
      }),
    });
  }

  if (request.method === "POST") {
    const form = await request.formData();
    const providedPwd = String(form.get("pwd") || "");
    if (adminPwd && safeEqual(providedPwd, adminPwd)) {
      const token = randomToken();
      await env.HOMEPAGE_KV.put(`admin:session:${token}`, "1", { expirationTtl: SESSION_TTL });
      return new Response(null, {
        status: 302,
        headers: securityHeaders({
          "Set-Cookie": `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL}`,
          Location: "/admin",
        }),
      });
    }
    return new Response(loginPage(true), {
      status: 401,
      headers: securityHeaders({ "Content-Type": "text/html; charset=utf-8" }),
    });
  }

  if (!isAdmin) {
    const hasTried = url.searchParams.has("pwd");
    return new Response(loginPage(hasTried), {
      status: hasTried ? 401 : 200,
      headers: securityHeaders({ "Content-Type": "text/html; charset=utf-8" }),
    });
  }

  try {
    const total = (await env.HOMEPAGE_KV.get("visit:total")) || "0";

    let ipMap = {};
    try {
      ipMap = JSON.parse((await env.HOMEPAGE_KV.get("visit:ipmap")) || "{}");
    } catch { ipMap = {}; }

    const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      dates.push(d.toISOString().slice(0, 10));
    }

    let days7Map = null;
    try {
      const raw = await env.HOMEPAGE_KV.get("visit:days:7");
      if (raw) days7Map = JSON.parse(raw);
    } catch { days7Map = null; }

    let days;
    if (days7Map && typeof days7Map === "object" && !Array.isArray(days7Map)) {
      days = dates.map((date) => ({ date, count: Number(days7Map[date]) || 0 }));
    } else {
      days = await Promise.all(
        dates.map(async (date) => {
          let set = [];
          try {
            set = JSON.parse((await env.HOMEPAGE_KV.get(`visit:today:${date}`)) || "[]");
          } catch { set = []; }
          return { date, count: Array.isArray(set) ? set.length : 0 };
        })
      );
    }

    const todayStr = dates[0];
    const { workers, pages, error: apiError } = await fetchUsageSplit(env, todayStr);

    const quotaLimit = QUOTA_LIMIT;
    const quotaUsed = workers + pages;
    const quotaPct = Math.min(100, (quotaUsed / quotaLimit) * 100);
    const quotaColor = quotaPct >= 80 ? "#FF4444" : quotaPct >= 60 ? "#FFB020" : "#17DD62";

    const resetInfo = getResetCountdown();

    const entries = Object.entries(ipMap)
      .map(([ip, val]) => {
        if (typeof val === "number") return [ip, { c: val, cc: "XX" }];
        return [ip, { c: Number(val?.c) || 0, cc: val?.cc || "XX" }];
      })
      .filter(([, v]) => Number.isFinite(v.c))
      .sort((a, b) => b[1].c - a[1].c);

    const ipRows = entries.slice(0, 100).map(([ipAddr, v], i) => {
      const flag = ccToFlag(v.cc);
      return `<tr>
        <td>${i + 1}</td>
        <td>
          <span class="ip-flag" title="${escapeHtml(v.cc)}">${flag}</span>
          <span class="ip-text">${escapeHtml(ipAddr)}</span>
          <button class="ip-detail-btn" data-ip="${escapeHtml(ipAddr)}" title="查看详情">ℹ</button>
        </td>
        <td>${escapeHtml(v.c)}</td>
      </tr>`;
    }).join("");

    const dayRows = days
      .map((d) => `<tr><td>${escapeHtml(d.date)}</td><td>${d.count}</td></tr>`)
      .join("");

    const warnHtml = apiError
      ? `<div class="warn animate-in">ℹ Cloudflare 数据暂不可用，配额显示为 0</div>`
      : "";

    const updatedAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(11, 19);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<script>${THEME_SCRIPT}</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>访问统计</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  ${THEME_CSS}
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin:0; padding:28px 20px 60px;
    background: var(--bg); color: var(--text);
    font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
    min-height:100vh; position:relative; overflow-x:hidden;
    transition: background .4s, color .4s;
  }
  body::before {
    content:""; position:fixed; inset:-20%; z-index:0; pointer-events:none;
    background:
      radial-gradient(circle at 15% 10%, var(--bg-glow1), transparent 40%),
      radial-gradient(circle at 85% 90%, var(--bg-glow2), transparent 45%);
    animation: floatBg 15s ease-in-out infinite alternate;
  }
  @keyframes floatBg {
    from { transform: translate(0,0) scale(1); }
    to   { transform: translate(3%, -3%) scale(1.06); }
  }
  .top-band {
    position: fixed; top:0; left:0; right:0; height:3px; z-index: 100;
    background: linear-gradient(90deg, var(--accent), var(--split-border), var(--color-quota), var(--accent));
    background-size: 300% 100%;
    animation: bandFlow 6s linear infinite;
  }
  @keyframes bandFlow {
    0% { background-position: 0% 0; }
    100% { background-position: 300% 0; }
  }
  .cursor-glow {
    position: fixed; width: 320px; height: 320px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,68,68,.10), transparent 65%);
    transform: translate(-50%, -50%);
    pointer-events:none; z-index:0; opacity:0;
    transition: opacity .4s;
    mix-blend-mode: screen;
  }
  html[data-theme="light"] .cursor-glow {
    mix-blend-mode: multiply;
    background: radial-gradient(circle, rgba(230,57,70,.07), transparent 65%);
  }
  .container { max-width:960px; margin:0 auto; position:relative; z-index:1; }

  .hero {
    position:relative;
    display:flex; align-items:center; justify-content:space-between;
    gap:16px; flex-wrap:wrap;
    padding:18px 22px; margin-bottom:22px;
    border-radius:16px;
    background: var(--card);
    border:1px solid var(--card-border);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    overflow:hidden;
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both;
  }
  .hero::after {
    content:""; position:absolute; left:0; right:0; bottom:0; height:2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--split-border), transparent);
    background-size: 200% 100%;
    animation: heroLine 6s linear infinite;
    opacity:.7;
  }
  @keyframes heroLine {
    0% { background-position: 0% 0; }
    100% { background-position: 200% 0; }
  }
  .hero-title {
    display:flex; align-items:center; gap:12px;
    font-size:22px; font-weight:700; color: var(--text-strong);
    letter-spacing:.3px;
  }
  .hero-icon {
    width:36px; height:36px; border-radius:10px;
    display:flex; align-items:center; justify-content:center;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color:#fff; font-size:18px;
    box-shadow:0 6px 18px rgba(255,68,68,.35);
    animation: iconPulse 3s ease-in-out infinite;
  }
  @keyframes iconPulse {
    0%,100% { transform: translateY(0); box-shadow:0 6px 18px rgba(255,68,68,.35); }
    50% { transform: translateY(-2px); box-shadow:0 10px 24px rgba(255,68,68,.5); }
  }
  .hero-sub { font-size:12px; color: var(--text-dim); margin-top:6px; letter-spacing:.3px; }

  .actions { display:flex; gap:10px; align-items:center; }
  .btn {
    padding:9px 16px; border-radius:9px; font-size:13px; font-weight:500;
    text-decoration:none; cursor:pointer; border:none;
    transition: transform .15s, box-shadow .25s, filter .25s, background .25s, color .25s, border-color .25s;
    display:inline-flex; align-items:center; justify-content:center; gap:6px;
  }
  .btn-primary {
    background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:#fff;
    box-shadow:0 4px 14px rgba(255,68,68,.3);
  }
  .btn-primary:hover { filter:brightness(1.1); box-shadow:0 8px 24px rgba(255,68,68,.45); }
  .btn-ghost {
    background: var(--btn-ghost-bg); color: var(--text-dim);
    border:1px solid var(--card-border);
  }
  .btn-ghost:hover {
    background: var(--btn-ghost-hover); color: var(--accent);
    border-color: rgba(255,68,68,.3);
  }
  .btn:active { transform: scale(.96); }
  .theme-toggle-btn { width: 38px; padding: 0; height: 36px; font-size: 15px; line-height: 1; }
  .theme-toggle-btn:hover { transform: rotate(20deg) scale(1.08); }

  .animate-in { animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes fadeUp {
    from { opacity:0; transform: translateY(18px); }
    to   { opacity:1; transform: translateY(0); }
  }

  .cards {
    display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
    gap:16px; margin-bottom:24px;
  }
  .card {
    background: var(--card);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    padding:22px; border-radius:14px;
    border:1px solid var(--card-border);
    position:relative; overflow:hidden;
    transition: transform .3s, border-color .3s, box-shadow .3s, background .4s;
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both;
  }
  .card:nth-child(1) { animation-delay:.05s; }
  .card:nth-child(2) { animation-delay:.12s; }
  .card:nth-child(3) { animation-delay:.19s; }
  .card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,68,68,.3);
    box-shadow: var(--shadow-card), 0 0 0 1px rgba(255,68,68,.1);
  }
  .card .label {
    font-size:12px; color: var(--text-dim); margin-bottom:10px;
    letter-spacing:.5px; text-transform:uppercase;
  }
  .card .value {
    font-size:36px; font-weight:700; font-variant-numeric: tabular-nums;
    background: linear-gradient(135deg, var(--text-strong), var(--accent-2));
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height:1.1;
  }

  .quota {
    background: var(--card);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    padding:22px; border-radius:14px; margin-bottom:20px;
    border:1px solid var(--card-border);
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both;
    animation-delay:.26s;
    transition: background .4s, border-color .4s;
  }
  .quota-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
  .quota-title { font-size:15px; color: var(--text); font-weight:600; }
  .quota-sub { font-size:12px; color: var(--text-dim); }
  .quota-bar {
    position:relative; height:26px;
    background: var(--quota-bg); border-radius:13px; overflow:hidden;
    border:1px solid var(--card-border);
    transition: background .4s;
  }
  .quota-fill {
    height:100%; border-radius:13px;
    transition: width 1.2s cubic-bezier(.2,.8,.2,1);
    position:relative; overflow:hidden;
    box-shadow: 0 0 20px currentColor;
  }
  .quota-fill::after {
    content:""; position:absolute; inset:0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
    animation: shimmer 2.4s infinite;
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .quota-text {
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    font-size:12px; color:#fff; font-weight:600;
    text-shadow:0 1px 3px rgba(0,0,0,.8);
    letter-spacing:.3px;
  }

  .split-card {
    display:grid; grid-template-columns:1fr 1fr 1fr;
    gap:0; margin-bottom:16px;
    background: var(--card);
    border:1px solid var(--card-border);
    border-left:4px solid var(--split-border);
    border-radius:12px; overflow:hidden;
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both;
    animation-delay:.3s;
    transition: background .4s, border-color .4s;
  }
  .split-item { padding:18px 22px; border-right:1px solid var(--card-border); }
  .split-item:last-child { border-right:none; }
  .split-label {
    font-size:11px; color: var(--text-dim);
    letter-spacing:.6px; text-transform:uppercase; margin-bottom:8px;
  }
  .split-value {
    font-size:26px; font-weight:700; font-variant-numeric: tabular-nums;
    line-height:1.1;
  }
  .split-value.workers { color: var(--color-workers); }
  .split-value.pages   { color: var(--color-pages); }
  .split-value.quota   { color: var(--color-quota); }

  .reset-tip {
    display:flex; align-items:center; gap:8px; flex-wrap:wrap;
    background: var(--warn-bg);
    border:1px solid var(--warn-border);
    color: var(--warn-text);
    padding:12px 16px; border-radius:10px;
    font-size:13px; margin-bottom:28px;
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both;
    animation-delay:.34s;
    transition: background .4s, border-color .4s, color .4s;
  }
  .reset-tip b { color: var(--tip-highlight); font-weight:700; }
  .reset-icon {
    display:inline-flex; align-items:center; justify-content:center;
    width:20px; height:20px; border-radius:5px;
    background: var(--split-border); color:#fff; font-size:12px; flex-shrink:0;
  }

  h2 {
    font-size:15px; margin:36px 0 14px; color: var(--text); font-weight:600;
    letter-spacing:.4px; display:flex; align-items:center; gap:8px;
  }
  h2::before {
    content:""; width:3px; height:14px; border-radius:2px;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
    box-shadow: 0 0 8px rgba(255,68,68,.6);
  }

  .table-wrap {
    background: var(--card);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-radius:14px; overflow:hidden;
    border:1px solid var(--card-border);
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both;
    animation-delay:.38s;
    transition: background .4s, border-color .4s;
  }
  table { width:100%; border-collapse:collapse; }
  th, td { padding:12px 18px; text-align:left; font-size:13px; }
  th {
    background: var(--table-head); color: var(--text-dim);
    font-weight:500; letter-spacing:.4px; text-transform:uppercase; font-size:11px;
  }
  tbody tr {
    transition: background .2s, transform .2s;
    border-bottom:1px solid var(--row-border);
  }
  tbody tr:last-child { border-bottom:none; }
  tbody tr:hover { background: rgba(255,68,68,.06); }
  td:nth-child(3) { color:#17DD62; font-weight:600; font-variant-numeric: tabular-nums; }
  .empty { text-align:center; color: var(--text-dim); padding:28px; font-size:13px; }

  .ip-flag { display:inline-block; margin-right:8px; font-size:15px; vertical-align:-1px; }
  .ip-text { font-variant-numeric: tabular-nums; }
  .ip-detail-btn {
    margin-left:8px; padding:2px 8px; border-radius:6px; cursor:pointer;
    border:1px solid var(--card-border); background: var(--btn-ghost-bg);
    color: var(--text-dim); font-size:12px;
    transition: background .2s, color .2s, border-color .2s, transform .15s;
  }
  .ip-detail-btn:hover {
    background: var(--btn-ghost-hover); color: var(--accent);
    border-color: rgba(255,68,68,.35);
  }
  .ip-detail-btn:active { transform: scale(.94); }

  .warn {
    background: var(--warn-bg);
    border:1px solid var(--warn-border);
    color: var(--warn-text);
    padding:10px 16px; border-radius:10px;
    font-size:12px; margin-bottom:20px;
  }

  .footer {
    max-width:960px; margin:32px auto 0;
    padding:18px 22px 0;
    display:flex; align-items:center; justify-content:space-between;
    gap:12px; flex-wrap:wrap;
    font-size:12px; color: var(--text-dim);
    border-top:1px solid var(--card-border);
    position:relative; z-index:1;
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both;
    animation-delay:.5s;
  }
  .footer-dot { opacity:.4; margin:0 2px; }
  .footer a {
    color: var(--text-dim); text-decoration:none; margin-left:16px;
    transition: color .2s, transform .2s; display:inline-block;
  }
  .footer a:hover { color: var(--accent); transform: translateX(2px); }

  /* ---------- IP 详情弹窗 ---------- */
  .ip-modal {
    position: fixed; inset: 0; z-index: 200;
    display: none; align-items: center; justify-content: center;
  }
  .ip-modal.show { display: flex; }
  .ip-modal-backdrop {
    position: absolute; inset: 0;
    background: rgba(0,0,0,.5);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    animation: fadeIn .3s ease both;
  }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  .ip-modal-panel {
    position: relative; width: min(920px, 92vw); max-height: 90vh;
    overflow: auto; border-radius: 16px;
    background: var(--modal-bg); color: var(--text);
    box-shadow: 0 30px 80px rgba(0,0,0,.45);
    border: 1px solid var(--card-border);
    animation: popIn .3s cubic-bezier(.2,.8,.2,1) both;
  }
  .ip-modal-head {
    display:flex; align-items:center; gap:10px;
    padding: 16px 22px; border-bottom: 1px solid var(--card-border);
    position: sticky; top: 0; background: var(--modal-bg); z-index: 2;
  }
  .ip-modal-title { font-weight: 700; color: var(--accent); font-size: 15px; }
  .ip-modal-source { font-size: 12px; color: var(--text-dim); }
  .ip-modal-close {
    margin-left: auto; border: none;
    background: var(--btn-ghost-bg); color: var(--text);
    width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
    transition: background .2s, transform .2s;
  }
  .ip-modal-close:hover { background: var(--btn-ghost-hover); transform: rotate(90deg); }
  .ip-map { height: 340px; background: var(--card-strong); }
  .ip-cards {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    padding: 18px 22px 24px;
  }
  @media (max-width: 640px) {
    .ip-cards { grid-template-columns: 1fr; }
    .split-card { grid-template-columns:1fr; }
    .split-item { border-right:none; border-bottom:1px solid var(--card-border); }
    .split-item:last-child { border-bottom:none; }
    .hero { flex-direction: column; align-items: flex-start; }
  }
  .ip-card {
    background: var(--modal-card); border-radius: 12px;
    padding: 16px 18px; border: 1px solid var(--card-border);
  }
  .ip-card h4 { margin: 0 0 12px; font-size: 13px; color: var(--accent); }
  .ip-kv {
    display: grid; grid-template-columns: 1fr auto; gap: 8px 12px;
    font-size: 13px;
  }
  .ip-kv span:nth-child(odd) { color: var(--text-dim); }
  .ip-kv span:nth-child(even) { color: var(--text); font-weight: 600; text-align: right; }
  .ip-loading { text-align: center; padding: 40px; color: var(--text-dim); font-size: 13px; }
  .ip-badge-ok {
    display:inline-block; padding:1px 8px; border-radius: 999px;
    font-size: 11px; font-weight:700;
    background: rgba(23,221,98,.12); color:#17DD62;
    border: 1px solid rgba(23,221,98,.35);
  }
  .ip-badge-no {
    display:inline-block; padding:1px 8px; border-radius: 999px;
    font-size: 11px; font-weight:700;
    background: rgba(255,68,68,.12); color:#FF4444;
    border: 1px solid rgba(255,68,68,.35);
  }
</style>
</head>
<body>
  <div class="top-band" aria-hidden="true"></div>
  <div class="cursor-glow" id="cursorGlow" aria-hidden="true"></div>

  <div class="container">
    <div class="hero">
      <div>
        <div class="hero-title">
          <span class="hero-icon">📊</span>
          <span>访问统计</span>
        </div>
        <div class="hero-sub">更新于 ${updatedAt} (UTC+8)</div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost theme-toggle-btn" id="themeBtn" title="切换主题">🌙</button>
        <a href="/admin" class="btn btn-primary">↻ 刷新</a>
        <a href="/admin/logout" class="btn btn-ghost">退出</a>
      </div>
    </div>

    ${warnHtml}

    <div class="cards">
      <div class="card">
        <div class="label">总计访问</div>
        <div class="value" data-count="${escapeHtml(total)}">0</div>
      </div>
      <div class="card">
        <div class="label">今日人数</div>
        <div class="value" data-count="${days[0]?.count || 0}">0</div>
      </div>
      <div class="card">
        <div class="label">独立 IP 数</div>
        <div class="value" data-count="${entries.length}">0</div>
      </div>
    </div>

    <div class="quota">
      <div class="quota-head">
        <span class="quota-title">Workers/Pages 请求使用情况</span>
        <span class="quota-sub">今日 · 上限 ${quotaLimit.toLocaleString()}</span>
      </div>
      <div class="quota-bar">
        <div class="quota-fill"
             style="width:0%;background:${quotaColor};color:${quotaColor};"
             data-width="${quotaPct.toFixed(2)}%"></div>
        <div class="quota-text">请求使用进度: ${quotaUsed.toLocaleString()} (${quotaPct.toFixed(2)}%)</div>
      </div>
    </div>

    <div class="split-card">
      <div class="split-item">
        <div class="split-label">Workers 请求</div>
        <div class="split-value workers">${workers.toLocaleString()}</div>
      </div>
      <div class="split-item">
        <div class="split-label">Pages 请求</div>
        <div class="split-value pages">${pages.toLocaleString()}</div>
      </div>
      <div class="split-item">
        <div class="split-label">日配额</div>
        <div class="split-value quota">${quotaLimit.toLocaleString()}</div>
      </div>
    </div>

    <div class="reset-tip" data-reset-at="${resetInfo.resetAt}">
      <span class="reset-icon">⏱</span>
      每日请求数重置清零：距离重置还有 <b id="countdown">--</b>，
      北京时间（UTC+8）<b>8:00</b> 重置，
      今日使用情况总计：<b>${quotaUsed.toLocaleString()}</b>。
    </div>

    <h2>最近 7 天</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>日期</th><th>人数</th></tr></thead>
        <tbody>${dayRows}</tbody>
      </table>
    </div>

    <h2>IP 访问排行（前 100）</h2>
    <div class="table-wrap" style="animation-delay:.44s;">
      <table>
        <thead><tr><th>#</th><th>IP</th><th>次数</th></tr></thead>
        <tbody>${ipRows || '<tr><td colspan="3" class="empty">暂无记录</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-left">
      <span>访问统计后台</span>
      <span class="footer-dot">·</span>
      <span>数据源：KV + Cloudflare Analytics</span>
    </div>
    <div class="footer-right">
      <a href="/admin">刷新</a>
      <a href="/admin/logout">退出</a>
    </div>
  </footer>

  <!-- IP 详情弹窗 -->
  <div class="ip-modal" id="ipModal">
    <div class="ip-modal-backdrop" data-close></div>
    <div class="ip-modal-panel">
      <div class="ip-modal-head">
        <span class="ip-modal-title">🔍 IP 详细信息</span>
        <span class="ip-modal-source" id="ipModalSource">数据来源：ipapi.is</span>
        <button class="ip-modal-close" id="ipModalClose">✕</button>
      </div>
      <div id="ipModalBody">
        <div class="ip-loading">加载中…</div>
      </div>
    </div>
  </div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  // 数字滚动
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count) || 0;
    const duration = 900;
    const start = performance.now();
    const format = (n) => n.toLocaleString();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  // 进度条
  requestAnimationFrame(() => {
    const fill = document.querySelector('.quota-fill');
    if (fill) fill.style.width = fill.dataset.width;
  });

  // 倒计时
  (function(){
    const tip = document.querySelector('.reset-tip');
    const el = document.getElementById('countdown');
    if (!tip || !el) return;
    const resetAt = Number(tip.dataset.resetAt) || Date.now();
    function tick() {
      const diff = Math.max(0, resetAt - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = h + "小时" + String(m).padStart(2,'0') + "分" + String(s).padStart(2,'0') + "秒";
      if (diff > 0) setTimeout(tick, 1000);
      else el.textContent = "即将重置";
    }
    tick();
  })();

  // 鼠标跟随光斑
  (function(){
    const g = document.getElementById('cursorGlow');
    if (!g) return;
    let x = 0, y = 0, cx = 0, cy = 0;
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; g.style.opacity = 1; });
    addEventListener('mouseleave', () => g.style.opacity = 0);
    (function loop(){
      cx += (x - cx) * 0.12;
      cy += (y - cy) * 0.12;
      g.style.left = cx + 'px';
      g.style.top  = cy + 'px';
      requestAnimationFrame(loop);
    })();
  })();

  // ---------------- IP 详情弹窗 ----------------
  const ipModal = document.getElementById('ipModal');
  const ipModalBody = document.getElementById('ipModalBody');
  let leafletMap = null, leafletMarker = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function kvRow(k, v) {
    return '<span>' + esc(k) + '</span><span>' + v + '</span>';
  }

  function badge(flag) {
    if (flag === true)  return '<span class="ip-badge-ok">是</span>';
    if (flag === false) return '<span class="ip-badge-no">否</span>';
    return '—';
  }

  async function openIpDetail(ip) {
    ipModal.classList.add('show');
    ipModalBody.innerHTML = '<div class="ip-loading">加载中…</div>';

    try {
      const res = await fetch('/admin/ipinfo?ip=' + encodeURIComponent(ip));
      const d = await res.json();

      if (!res.ok || d.error) {
        ipModalBody.innerHTML = '<div class="ip-loading">获取失败：' + esc(d.error || res.status) + '</div>';
        return;
      }

      const loc = d.location || {};
      const asn = d.asn || {};
      const comp = d.company || {};
      const score = typeof comp.abuser_score === 'number'
        ? (comp.abuser_score * 100).toFixed(2) + '% ' + (comp.abuser_score < 0.01 ? '纯净' : '可疑')
        : '—';

      const basic = [
        kvRow('IP 地址', esc(d.ip || ip)),
        kvRow('地理位置', esc([loc.country_code ? '[' + loc.country_code + ']' : '', loc.country || '', loc.city || ''].filter(Boolean).join(' '))),
        kvRow('时区', esc(loc.timezone || '-')),
        kvRow('运营商 / ASN', esc((asn.org || '-') + ' / ' + (asn.asn != null ? asn.asn : '-'))),
        kvRow('网络类型', esc(asn.type || '-')),
        kvRow('风控评级', esc(score)),
      ].join('');

      const safety = [
        kvRow('数据中心', badge(d.is_datacenter)),
        kvRow('代理服务器', badge(d.is_proxy)),
        kvRow('VPN 连线', badge(d.is_vpn)),
        kvRow('Tor 网络', badge(d.is_tor)),
        kvRow('网络爬虫', badge(d.is_crawler)),
        kvRow('移动网络', badge(d.is_mobile)),
        kvRow('卫星网络', badge(d.is_satellite)),
        kvRow('已知滥用', badge(d.is_abuser)),
      ].join('');

      ipModalBody.innerHTML =
        '<div id="ipMap" class="ip-map"></div>' +
        '<div class="ip-cards">' +
          '<div class="ip-card"><h4>📍 基本信息</h4><div class="ip-kv">' + basic + '</div></div>' +
          '<div class="ip-card"><h4>🛡 安全检测</h4><div class="ip-kv">' + safety + '</div></div>' +
        '</div>';

      // 渲染地图
      const lat = Number(loc.latitude), lng = Number(loc.longitude);
      if (isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0) {
        if (!leafletMap) {
          leafletMap = L.map('ipMap').setView([lat, lng], 6);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(leafletMap);
        } else {
          leafletMap.setView([lat, lng], 6);
        }
        if (leafletMarker) leafletMap.removeLayer(leafletMarker);
        leafletMarker = L.marker([lat, lng]).addTo(leafletMap).bindPopup(ip).openPopup();
        setTimeout(() => leafletMap.invalidateSize(), 100);
      }
    } catch (e) {
      ipModalBody.innerHTML = '<div class="ip-loading">网络错误</div>';
    }
  }

  function closeIpModal() {
    ipModal.classList.remove('show');
    if (leafletMap) { leafletMap.remove(); leafletMap = null; leafletMarker = null; }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.ip-detail-btn');
    if (btn) { openIpDetail(btn.dataset.ip); return; }
    if (e.target.id === 'ipModalClose' || e.target.hasAttribute('data-close')) {
      closeIpModal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ipModal.classList.contains('show')) closeIpModal();
  });
</script>
</body>
</html>`;

    return new Response(html, {
      headers: securityHeaders({ "Content-Type": "text/html; charset=utf-8" }),
    });
  } catch {
    return new Response("<h1>读取失败</h1><p>请稍后重试</p>", {
      status: 500,
      headers: securityHeaders({ "Content-Type": "text/html; charset=utf-8" }),
    });
  }
}
