/**
 * 访问统计管理页面（方案 B + 深浅主题 + 动画）
 * 访问：https://www.mkejga.de5.net/admin
 *
 * 环境变量：
 *   ADMIN_PASSWORD   后台登录密码
 *   HOMEPAGE_KV      KV 绑定（已有）
 *   CF_API_TOKEN     Cloudflare API Token（Account Analytics: Read）
 *   CF_ACCOUNT_ID    Cloudflare Account ID
 *   QUOTA_LIMIT      每日请求配额（免费版 100000）
 */

const COOKIE_NAME = "admin_session";
const SESSION_TTL = 60 * 60 * 8; // 8 小时

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
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
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

/* ---------------- 主题脚本（内联，最先执行，避免闪屏） ---------------- */

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

/* ---------------- 主题 CSS 变量（共用） ---------------- */

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
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
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
  button {
    width:100%; margin-top:18px; padding:13px; border:none; border-radius:10px;
    background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:white;
    font-size:14px; font-weight:bold; cursor:pointer; letter-spacing:.5px;
    transition: transform .15s, box-shadow .25s, filter .25s;
  }
  button:hover { filter:brightness(1.1); box-shadow:0 8px 24px rgba(255,68,68,.4); }
  button:active { transform: scale(.97); }
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
</style>
</head>
<body>
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

/* ---------------- Cloudflare GraphQL API ---------------- */

async function fetchWorkersRequests(env, dateStr) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
    return { requests: 0, error: "missing_config" };
  }

  const query = `
    query {
      viewer {
        accounts(filter: {accountTag: "${env.CF_ACCOUNT_ID}"}) {
          workersInvocationsAdaptive(
            limit: 1,
            filter: { date_geq: "${dateStr}", date_leq: "${dateStr}" }
          ) {
            sum { requests }
          }
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

    if (!res.ok) return { requests: 0, error: "api_" + res.status };

    const json = await res.json();
    if (json.errors) return { requests: 0, error: "api_error" };

    const nodes =
      json.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];
    return { requests: nodes[0]?.sum?.requests || 0, error: null };
  } catch (e) {
    return { requests: 0, error: "network" };
  }
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

  // ---- 登出 ----
  if (url.pathname === "/admin/logout") {
    if (cookieToken) {
      await env.HOMEPAGE_KV.delete(`admin:session:${cookieToken}`);
    }
    return new Response(null, {
      status: 302,
      headers: securityHeaders({
        "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
        Location: "/admin",
      }),
    });
  }

  // ---- 登录 POST ----
  if (request.method === "POST") {
    const form = await request.formData();
    const providedPwd = String(form.get("pwd") || "");
    if (adminPwd && safeEqual(providedPwd, adminPwd)) {
      const token = randomToken();
      await env.HOMEPAGE_KV.put(`admin:session:${token}`, "1", {
        expirationTtl: SESSION_TTL,
      });
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

  // ---- 未登录 ----
  if (!isAdmin) {
    const hasTried = url.searchParams.has("pwd");
    return new Response(loginPage(hasTried), {
      status: hasTried ? 401 : 200,
      headers: securityHeaders({ "Content-Type": "text/html; charset=utf-8" }),
    });
  }

  /* ---------------- 已登录：读取数据 ---------------- */
  try {
    const total = (await env.HOMEPAGE_KV.get("visit:total")) || "0";

    let ipMap = {};
    try {
      ipMap = JSON.parse((await env.HOMEPAGE_KV.get("visit:ipmap")) || "{}");
    } catch {
      ipMap = {};
    }

    // 最近 7 天（并行）
    const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      dates.push(d.toISOString().slice(0, 10));
    }

    const days = await Promise.all(
      dates.map(async (date) => {
        let set = [];
        try {
          set = JSON.parse(
            (await env.HOMEPAGE_KV.get(`visit:today:${date}`)) || "[]"
          );
        } catch {
          set = [];
        }
        return { date, count: Array.isArray(set) ? set.length : 0 };
      })
    );

    // 真实请求量
    const todayStr = dates[0];
    const { requests: apiRequests, error: apiError } = await fetchWorkersRequests(
      env,
      todayStr
    );

    const quotaLimit = Number(env.QUOTA_LIMIT) || 100000;
    const quotaUsed = apiRequests;
    const quotaPct = Math.min(100, (quotaUsed / quotaLimit) * 100);
    const quotaColor =
      quotaPct >= 80 ? "#FF4444" : quotaPct >= 60 ? "#FFB020" : "#17DD62";

    const entries = Object.entries(ipMap)
      .filter(([, cnt]) => Number.isFinite(Number(cnt)))
      .sort((a, b) => Number(b[1]) - Number(a[1]));

    const ipRows = entries
      .slice(0, 100)
      .map(
        ([ipAddr, cnt], i) =>
          `<tr><td>${i + 1}</td><td>${escapeHtml(ipAddr)}</td><td>${escapeHtml(
            cnt
          )}</td></tr>`
      )
      .join("");

    const dayRows = days
      .map((d) => `<tr><td>${escapeHtml(d.date)}</td><td>${d.count}</td></tr>`)
      .join("");

    // API 异常时只显示中性提示
    const warnHtml = apiError
      ? `<div class="warn animate-in">ℹ Cloudflare 数据暂不可用，配额显示为 0</div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<script>${THEME_SCRIPT}</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>访问统计</title>
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
  .container { max-width:960px; margin:0 auto; position:relative; z-index:1; }

  h1 {
    font-size:26px; color: var(--text-strong); margin:0 0 28px;
    display:flex; align-items:center; justify-content:space-between;
    font-weight:600; letter-spacing:.3px;
  }
  h1 .title-dot {
    display:inline-block; width:10px; height:10px; border-radius:50%;
    background: var(--accent); margin-right:12px;
    box-shadow: 0 0 12px var(--accent);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100% { opacity:1; transform:scale(1); }
    50% { opacity:.5; transform:scale(1.3); }
  }
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
  .theme-toggle-btn {
    width: 38px; padding: 0; height: 36px;
    font-size: 15px; line-height: 1;
  }
  .theme-toggle-btn:hover { transform: rotate(20deg) scale(1.08); }

  .animate-in { animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes fadeUp {
    from { opacity:0; transform: translateY(18px); }
    to   { opacity:1; transform: translateY(0); }
  }

  /* 统计卡片 */
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
  .card::after {
    content:""; position:absolute; top:0; left:0; right:0; height:2px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    opacity:0; transition: opacity .3s;
  }
  .card:hover::after { opacity:1; }
  .card .label {
    font-size:12px; color: var(--text-dim); margin-bottom:10px;
    letter-spacing:.5px; text-transform:uppercase;
  }
  .card .value {
    font-size:36px; font-weight:700;
    font-variant-numeric: tabular-nums;
    background: linear-gradient(135deg, var(--text-strong), var(--accent-2));
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height:1.1;
  }

  /* 配额进度条 */
  .quota {
    background: var(--card);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    padding:22px; border-radius:14px; margin-bottom:28px;
    border:1px solid var(--card-border);
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both;
    animation-delay:.26s;
    transition: background .4s, border-color .4s;
  }
  .quota-head {
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:16px;
  }
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
    background: linear-gradient(90deg,
      transparent, rgba(255,255,255,.35), transparent);
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

  h2 {
    font-size:15px; margin:36px 0 14px; color: var(--text); font-weight:600;
    letter-spacing:.4px; display:flex; align-items:center; gap:8px;
  }
  h2::before {
    content:""; width:3px; height:14px; border-radius:2px;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
    box-shadow: 0 0 8px rgba(255,68,68,.6);
  }

  /* 表格 */
  .table-wrap {
    background: var(--card);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-radius:14px; overflow:hidden;
    border:1px solid var(--card-border);
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both;
    animation-delay:.32s;
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
  tbody tr:hover {
    background: rgba(255,68,68,.06);
    transform: translateX(3px);
  }
  td:nth-child(3) { color:#17DD62; font-weight:600; font-variant-numeric: tabular-nums; }
  tbody tr:hover td:nth-child(3) { color:#22ff7a; text-shadow: 0 0 10px rgba(23,221,98,.5); }
  .empty { text-align:center; color: var(--text-dim); padding:28px; font-size:13px; }
  .warn {
    background: var(--warn-bg);
    border:1px solid var(--warn-border);
    color: var(--warn-text);
    padding:10px 16px; border-radius:10px;
    font-size:12px; margin-bottom:20px;
    transition: background .4s, border-color .4s, color .4s;
  }
</style>
</head>
<body>
  <div class="container">
    <h1 class="animate-in">
      <span><span class="title-dot"></span>访问统计</span>
      <span class="actions">
        <button class="btn btn-ghost theme-toggle-btn" id="themeBtn" title="切换主题">🌙</button>
        <a href="/admin" class="btn btn-primary">↻ 刷新</a>
        <a href="/admin/logout" class="btn btn-ghost">退出</a>
      </span>
    </h1>

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

    <h2>最近 7 天</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>日期</th><th>人数</th></tr></thead>
        <tbody>${dayRows}</tbody>
      </table>
    </div>

    <h2>IP 访问排行（前 100）</h2>
    <div class="table-wrap" style="animation-delay:.4s;">
      <table>
        <thead><tr><th>#</th><th>IP</th><th>次数</th></tr></thead>
        <tbody>${ipRows || '<tr><td colspan="3" class="empty">暂无记录</td></tr>'}</tbody>
      </table>
    </div>
  </div>

<script>
  // 数字滚动动画
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

  // 进度条宽度动画
  requestAnimationFrame(() => {
    const fill = document.querySelector('.quota-fill');
    if (fill) fill.style.width = fill.dataset.width;
  });
</script>
</body>
</html>`;

    return new Response(html, {
      headers: securityHeaders({ "Content-Type": "text/html; charset=utf-8" }),
    });
  } catch (e) {
    return new Response("<h1>读取失败</h1><p>请稍后重试</p>", {
      status: 500,
      headers: securityHeaders({ "Content-Type": "text/html; charset=utf-8" }),
    });
  }
}
