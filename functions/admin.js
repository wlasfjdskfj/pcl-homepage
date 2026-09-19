/**
 * 访问统计管理页面
 * 访问：https://www.mkejga.de5.net/admin
 * 退出：GET /admin?action=logout
 *
 * 环境变量：
 *   ADMIN_PASSWORD   后台登录密码
 *   HOMEPAGE_KV      KV 绑定
 *   CF_API_TOKEN     Cloudflare API Token（Account Analytics: Read）
 *   CF_ACCOUNT_ID    Cloudflare Account ID
 *
 * 请求数说明：
 *   Cloudflare GraphQL 按 UTC 日期统计，
 *   每天北京时间 8:00（UTC 0:00）清零。
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

// 带超时的 fetch（第三方音乐接口可能挂起，避免卡死后台）
async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || 6000);
  try {
    return await fetch(url, Object.assign({ signal: ctrl.signal }, opts || {}));
  } finally {
    clearTimeout(timer);
  }
}

function ccToFlag(cc) {
  if (!cc || !/^[A-Za-z]{2}$/.test(cc)) return "🌐";
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

/* ---------------- 国家/地区中文映射 ---------------- */

const COUNTRY_NAMES = {
  CN: "中国", HK: "中国香港", MO: "中国澳门", TW: "中国台湾",
  US: "美国", JP: "日本", KR: "韩国", KP: "朝鲜", MN: "蒙古",
  SG: "新加坡", MY: "马来西亚", TH: "泰国", VN: "越南",
  PH: "菲律宾", ID: "印度尼西亚", IN: "印度", PK: "巴基斯坦",
  BD: "孟加拉国", LK: "斯里兰卡", NP: "尼泊尔", KH: "柬埔寨",
  LA: "老挝", MM: "缅甸", BN: "文莱", KZ: "哈萨克斯坦",
  GB: "英国", IE: "爱尔兰", DE: "德国", FR: "法国",
  NL: "荷兰", BE: "比利时", LU: "卢森堡", CH: "瑞士",
  AT: "奥地利", IT: "意大利", ES: "西班牙", PT: "葡萄牙",
  GR: "希腊", SE: "瑞典", NO: "挪威", DK: "丹麦",
  FI: "芬兰", IS: "冰岛", PL: "波兰", CZ: "捷克",
  SK: "斯洛伐克", HU: "匈牙利", RO: "罗马尼亚", BG: "保加利亚",
  HR: "克罗地亚", SI: "斯洛文尼亚", RS: "塞尔维亚", UA: "乌克兰",
  BY: "白俄罗斯", RU: "俄罗斯", LT: "立陶宛", LV: "拉脱维亚",
  EE: "爱沙尼亚", TR: "土耳其", IL: "以色列", SA: "沙特阿拉伯",
  AE: "阿联酋", QA: "卡塔尔", KW: "科威特", BH: "巴林",
  OM: "阿曼", JO: "约旦", LB: "黎巴嫩", IR: "伊朗",
  IQ: "伊拉克", EG: "埃及", ZA: "南非", NG: "尼日利亚",
  KE: "肯尼亚", ET: "埃塞俄比亚", GH: "加纳", TZ: "坦桑尼亚",
  MA: "摩洛哥", DZ: "阿尔及利亚", TN: "突尼斯", LY: "利比亚",
  CA: "加拿大", MX: "墨西哥", BR: "巴西", AR: "阿根廷",
  CL: "智利", CO: "哥伦比亚", PE: "秘鲁", VE: "委内瑞拉",
  EC: "厄瓜多尔", UY: "乌拉圭", PY: "巴拉圭", BO: "玻利维亚",
  AU: "澳大利亚", NZ: "新西兰", FJ: "斐济", PG: "巴布亚新几内亚",
};

function ccToName(cc) {
  if (!cc || cc === "XX") return "未知";
  const key = String(cc).toUpperCase();
  return COUNTRY_NAMES[key] || key;
}

// 时间戳格式化为北京时间 MM-DD HH:MM
function fmtTime(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const d = new Date(n + 8 * 3600 * 1000);
  const M = String(d.getUTCMonth() + 1).padStart(2, "0");
  const D = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return M + "-" + D + " " + h + ":" + m;
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
    overflow:hidden; transition: background .4s, color .4s;
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
  .box {
    position:relative; z-index:1;
    background:var(--card);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    padding:40px; border-radius:16px; width:340px;
    border:1px solid var(--card-border);
    box-shadow: 0 20px 60px rgba(0,0,0,.35);
    animation: popIn .5s cubic-bezier(.2,.8,.2,1) both;
    transition: background .4s, border-color .4s;
  }
  @keyframes popIn {
    from { opacity:0; transform: translateY(20px) scale(.96); }
    to   { opacity:1; transform: translateY(0) scale(1); }
  }
  .login-logo {
    width:62px; height:62px; margin:0 auto 18px; border-radius:17px;
    display:flex; align-items:center; justify-content:center;
    font-size:28px; color:#fff;
    background:linear-gradient(135deg,var(--accent),var(--accent-2));
    box-shadow:0 10px 26px rgba(255,68,68,.4);
    animation: popIn .5s cubic-bezier(.2,.8,.2,1) both;
  }
  h1 { font-size:20px; margin:0 0 24px; text-align:center; color:var(--accent); letter-spacing:.5px; }
  input {
    width:100%; padding:13px 14px; border:1px solid var(--card-border); border-radius:10px;
    background:var(--card-strong); color:var(--text); font-size:14px;
    transition: border-color .25s, box-shadow .25s;
  }
  input:focus {
    outline:none; border-color:var(--accent);
    box-shadow:0 0 0 3px rgba(255,68,68,.15), 0 0 20px rgba(255,68,68,.25);
  }
  button[type=submit] {
    width:100%; margin-top:18px; padding:13px; border:none; border-radius:10px;
    background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:white;
    font-size:14px; font-weight:bold; cursor:pointer;
    transition: transform .15s, box-shadow .25s, filter .25s;
  }
  button[type=submit]:hover { filter:brightness(1.1); box-shadow:0 8px 24px rgba(255,68,68,.4); }
  button[type=submit]:active { transform: scale(.97); }
  .err {
    color:var(--accent-2); font-size:12px; margin-top:10px; text-align:center;
    animation: shake .4s; ${hasTried ? "" : "display:none;"}
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
  <div class="top-band" aria-hidden="true"></div>
  <button class="theme-toggle" id="themeBtn" title="切换主题">🌙</button>
  <div class="box">
    <div class="login-logo">🔒</div>
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

/**
 * 执行一次 GraphQL 查询，带超时
 */
async function cfGraphQL(env, query) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, error: "api_" + res.status };
    const json = await res.json();
    return { ok: true, json };
  } catch (e) {
    return {
      ok: false,
      error: e && e.name === "AbortError" ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUsageSplit(env, dateStr) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
    return { workers: 0, pages: 0, error: "missing_config" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
    return { workers: 0, pages: 0, error: "bad_date" };
  }

  if (!/^[a-f0-9]{32}$/i.test(String(env.CF_ACCOUNT_ID))) {
    return { workers: 0, pages: 0, error: "bad_account" };
  }

  // 首选：Workers + Pages Functions 一起查
  const fullQuery = `
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

  let r = await cfGraphQL(env, fullQuery);
  if (!r.ok) {
    console.error("[fetchUsageSplit] primary", r.error);
    return { workers: 0, pages: 0, error: r.error };
  }

  // 检测 GraphQL 字段错误：如果 pages 字段不存在，降级为只查 workers
  const hasFieldError =
    r.json.errors &&
    r.json.errors.some((e) =>
      String(e.message || "").toLowerCase().includes("pagesfunctions") ||
      String(e.message || "").toLowerCase().includes("cannot query field")
    );

  if (hasFieldError) {
    console.warn("[fetchUsageSplit] pages field missing, fallback to workers only");
    const fallbackQuery = `
      query {
        viewer {
          accounts(filter: {accountTag: "${env.CF_ACCOUNT_ID}"}) {
            workers: workersInvocationsAdaptive(
              limit: 1,
              filter: { date_geq: "${dateStr}", date_leq: "${dateStr}" }
            ) { sum { requests } }
          }
        }
      }
    `;
    r = await cfGraphQL(env, fallbackQuery);
    if (!r.ok) {
      console.error("[fetchUsageSplit] fallback", r.error);
      return { workers: 0, pages: 0, error: r.error };
    }
    if (r.json.errors) {
      console.error("[fetchUsageSplit] fallback graphql errors", r.json.errors);
      return { workers: 0, pages: 0, error: "api_error" };
    }
    const acc = r.json.data?.viewer?.accounts?.[0] || {};
    return {
      workers: acc.workers?.[0]?.sum?.requests || 0,
      pages: 0,
      error: null,
    };
  }

  // 其他 GraphQL 错误，直接报错
  if (r.json.errors) {
    console.error("[fetchUsageSplit] graphql errors", r.json.errors);
    return { workers: 0, pages: 0, error: "api_error" };
  }

  const acc = r.json.data?.viewer?.accounts?.[0] || {};
  return {
    workers: acc.workers?.[0]?.sum?.requests || 0,
    pages: acc.pages?.[0]?.sum?.requests || 0,
    error: null,
  };
}

/* ---------------- 倒计时 ---------------- */

function getResetCountdown() {
  const now = Date.now();
  const bj = new Date(now + 8 * 3600 * 1000);
  const today8 = Date.UTC(bj.getUTCFullYear(), bj.getUTCMonth(), bj.getUTCDate(), 8, 0, 0) - 8 * 3600 * 1000;
  const target = now >= today8 ? today8 + 24 * 3600 * 1000 : today8;
  return { resetAt: target, diffMs: target - now };
}

/* ---------------- D1 初始化 ---------------- */

let d1TableReady = false;
async function ensureD1Table(env) {
  if (d1TableReady || !env.STATS_DB) return;
  try {
    await env.STATS_DB.batch([
      env.STATS_DB.prepare("CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT NOT NULL, country TEXT, ts INTEGER NOT NULL)"),
      env.STATS_DB.prepare("CREATE TABLE IF NOT EXISTS admin_sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL)"),
      env.STATS_DB.prepare("CREATE TABLE IF NOT EXISTS admin_kv (key TEXT PRIMARY KEY, value TEXT)"),
    ]);
    d1TableReady = true;
  } catch (e) { /* 建表失败忽略，下次重试 */ }
}

/* ---------------- 主入口 ---------------- */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const adminPwd = env.ADMIN_PASSWORD || "";
  const cookieToken = getCookie(request, COOKIE_NAME);

  // 密码未配置时直接报错，避免后台静默锁死
  if (!adminPwd) {
    return new Response(
      `<h1 style="font-family:sans-serif">后台未配置</h1>
       <p style="font-family:sans-serif;color:#888">请在环境变量中设置 <code>ADMIN_PASSWORD</code> 后重试。</p>`,
      {
        status: 500,
        headers: securityHeaders({ "Content-Type": "text/html; charset=utf-8" }),
      }
    );
  }

  let isAdmin = false;
  if (cookieToken) {
    try {
      if (env.STATS_DB) {
        await ensureD1Table(env);
        const sess = await env.STATS_DB.prepare(
          "SELECT token FROM admin_sessions WHERE token = ? AND expires > ?"
        ).bind(cookieToken, Date.now()).first();
        if (sess) isAdmin = true;
      }
    } catch (e) { isAdmin = false; }
  }

  if (url.searchParams.get("action") === "logout") {
    if (cookieToken) {
      try {
        if (env.STATS_DB) await env.STATS_DB.prepare("DELETE FROM admin_sessions WHERE token = ?").bind(cookieToken).run();
      } catch (e) {}
    }
    return new Response(null, {
      status: 302,
      headers: securityHeaders({
        "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
        Location: "/admin",
      }),
    });
  }

  if (isAdmin && request.method === "GET" && url.searchParams.get("action") === "musicsrc") {
    const q = String(url.searchParams.get("q") || "").trim();
    const pf = String(url.searchParams.get("pf") || "1");
    const pmap = { "1": "wy.music", "2": "mg.music", "3": "bd.music" };
    const pmusic = pmap[pf] || "wy.music";
    let songs = [];
    if (q) {
      try {
        const r = await fetchWithTimeout("https://a.aa.cab/" + pmusic + "?msg=" + encodeURIComponent(q) + "&num=8", { headers: { "User-Agent": "Mozilla/5.0" } }, 6000);
        const data = await r.json();
        if (data && data.code === 0) {
          const res = data.data;
          const arr = Array.isArray(res) ? res : (res && res.music ? [res] : []);
          songs = arr.filter((i) => i && (i.song || i.music)).map((i) => ({ song: String(i.song || "未知"), singer: String(i.singer || "未知") }));
        }
      } catch (e) { /* ignore */ }
    }
    return new Response(JSON.stringify({ ok: true, songs }), { headers: securityHeaders({ "Content-Type": "application/json; charset=utf-8" }) });
  }

  if (request.method === "POST") {
    let rawBody = "";
    try {
      rawBody = await request.text();
    } catch (e) { rawBody = ""; }
    let form;
    try {
      form = new URLSearchParams(rawBody);
    } catch (e) {
      form = new URLSearchParams();
    }
    const providedPwd = String(form.get("pwd") || "");
    if (safeEqual(providedPwd, adminPwd)) {
      try {
        await ensureD1Table(env);
        const token = randomToken();
        await env.STATS_DB.prepare(
          "INSERT INTO admin_sessions (token, expires) VALUES (?, ?)"
        ).bind(token, Date.now() + SESSION_TTL * 1000).run();
        try { await env.STATS_DB.prepare("DELETE FROM admin_sessions WHERE expires < ?").bind(Date.now()).run(); } catch (e) {}
        return new Response(null, {
        status: 302,
        headers: securityHeaders({
          "Set-Cookie": `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL}`,
          Location: "/admin",
        }),
      });
      } catch (e) {
        return new Response("login error: " + (e && e.message ? e.message : String(e)), {
          status: 500,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    if (isAdmin) {
      const action = String(form.get("action") || "");
      let actionOk = true;
      try {
        if (action === "block") {
          const ip = String(form.get("ip") || "").trim();
          if (ip) {
            const blk = JSON.parse((await env.HOMEPAGE_KV.get('block:list')) || '{}');
            blk[ip] = Date.now();
            await env.HOMEPAGE_KV.put('block:list', JSON.stringify(blk));
          }
        } else if (action === "unblock") {
          const ip = String(form.get("ip") || "").trim();
          if (ip) {
            const blk = JSON.parse((await env.HOMEPAGE_KV.get('block:list')) || '{}');
            delete blk[ip];
            await env.HOMEPAGE_KV.put('block:list', JSON.stringify(blk));
          }
        } else if (action === "resetweather") {
          const ver = parseInt((await env.HOMEPAGE_KV.get('weather_version')) || "0", 10) + 1;
          await env.HOMEPAGE_KV.put('weather_version', String(ver));
        } else if (action === "maint") {
          const on = form.get("on") === "1";
          const eta = (form.get("eta") || "").trim();
          const reason = (form.get("reason") || "").trim();
          if (on) {
            await env.HOMEPAGE_KV.put('maint_mode_live', String(Date.now()));
            if (eta) await env.HOMEPAGE_KV.put('maint_eta', eta);
            else await env.HOMEPAGE_KV.delete('maint_eta');
            if (reason) await env.HOMEPAGE_KV.put('maint_reason', reason);
            else await env.HOMEPAGE_KV.delete('maint_reason');
          } else {
            await env.HOMEPAGE_KV.put('maint_mode_live', '0');
          }
        } else if (action === "maintwladd") {
          const wlip = String(form.get("ip") || "").trim() || (request.headers.get("CF-Connecting-IP") || "").trim();
          if (wlip) {
            const wl = JSON.parse((await env.HOMEPAGE_KV.get('maint_whitelist')) || '{}');
            wl[wlip] = Date.now();
            await env.HOMEPAGE_KV.put('maint_whitelist', JSON.stringify(wl));
          }
        } else if (action === "maintwldel") {
          const wlip = String(form.get("ip") || "").trim();
          if (wlip) {
            const wl = JSON.parse((await env.HOMEPAGE_KV.get('maint_whitelist')) || '{}');
            delete wl[wlip];
            await env.HOMEPAGE_KV.put('maint_whitelist', JSON.stringify(wl));
          }
        } else if (action === "banner") {
          const text = String(form.get("text") || "").trim();
          const on = form.get("on") === "0" ? false : true;
          await env.HOMEPAGE_KV.put('homepage_banner', JSON.stringify({ text, enabled: on && text ? true : false }));
        } else if (action === "servercfg") {
          const addr = String(form.get("addr") || "").trim();
          const email = String(form.get("email") || "").trim();
          await env.HOMEPAGE_KV.put('server_cfg', JSON.stringify({ addr, email }));
        } else if (action === "quotecfg") {
          const text = String(form.get("text") || "").trim();
          if (text) await env.HOMEPAGE_KV.put('quote_custom', text);
          else await env.HOMEPAGE_KV.delete('quote_custom');
        } else if (action === "countdown") {
          const name = String(form.get("name") || "").trim();
          const date = String(form.get("date") || "").trim();
          if (name && /^\d{4}-\d{2}-\d{2}$/.test(date)) await env.HOMEPAGE_KV.put('custom_countdown', JSON.stringify({ name, date }));
          else await env.HOMEPAGE_KV.delete('custom_countdown');
        } else if (action === "festadd") {
          const fm = parseInt(form.get("month") || "0", 10);
          const fd = parseInt(form.get("day") || "0", 10);
          const fname = String(form.get("name") || "").trim();
          const fmsg = String(form.get("msg") || "").trim();
          let flist = [];
          try { const fr = await env.HOMEPAGE_KV.get("custom_festivals"); if (fr) flist = JSON.parse(fr) || []; } catch (e) { flist = []; }
          if (fm >= 1 && fm <= 12 && fd >= 1 && fd <= 31 && fname) {
            flist.push({ month: fm, day: fd, name: fname, msg: fmsg });
            await env.HOMEPAGE_KV.put('custom_festivals', JSON.stringify(flist));
          }
        } else if (action === "festdel") {
          const idx = parseInt(form.get("i") || "-1", 10);
          let flist = [];
          try { const fr = await env.HOMEPAGE_KV.get("custom_festivals"); if (fr) flist = JSON.parse(fr) || []; } catch (e) { flist = []; }
          if (idx >= 0 && idx < flist.length) { flist.splice(idx, 1); await env.HOMEPAGE_KV.put('custom_festivals', JSON.stringify(flist)); }
        } else if (action === "banners") {
          const text = String(form.get("text") || "").trim();
          if (text) await env.HOMEPAGE_KV.put('banners', text);
          else await env.HOMEPAGE_KV.delete('banners');
        } else if (action === "kvdel") {
          const key = String(form.get("key") || "").trim();
          if (key) await env.HOMEPAGE_KV.delete(key);
        } else if (action === "musicadd") {
          const name = String(form.get("name") || "").trim();
          const url = String(form.get("url") || "").trim();
          const song = String(form.get("song") || "").trim();
          const singer = String(form.get("singer") || "").trim();
          const pf = String(form.get("pf") || "1");
          const pmap = { "1": "wy.music", "2": "mg.music", "3": "bd.music" };
          const pmusic = pmap[pf] || "wy.music";
          let finalUrl = url;
          let finalName = name;
          let finalLyric = "";
          if (!finalUrl && song) {
            try {
              const query = (singer && singer !== "未知") ? (song + " " + singer) : song;
              const rr = await fetchWithTimeout("https://a.aa.cab/" + pmusic + "?msg=" + encodeURIComponent(query) + "&n=1&gc=1", { headers: { "User-Agent": "Mozilla/5.0" } }, 6000);
              const dd = await rr.json();
              if (dd && dd.code === 0 && dd.data && dd.data.music) {
                finalUrl = String(dd.data.music);
                if (finalUrl.indexOf("http://") === 0) finalUrl = "https://" + finalUrl.slice(7);
                finalLyric = dd.data.lyric ? String(dd.data.lyric) : "";
                if (!finalName) finalName = String(dd.data.song || song);
              }
            } catch (e) { /* ignore */ }
          }
          if (finalUrl && /^https?:/i.test(finalUrl)) {
            let ml = [];
            if (env.STATS_DB) {
              try {
                await ensureD1Table(env);
                const mr = await env.STATS_DB.prepare("SELECT value FROM admin_kv WHERE key = ?").bind("admin_music").first();
                if (mr && mr.value) ml = JSON.parse(mr.value) || [];
              } catch (e) { ml = []; }
            }
            ml.push({ name: (finalName || "音乐 " + (ml.length + 1)), url: finalUrl, lyric: finalLyric });
            if (env.STATS_DB) await env.STATS_DB.prepare("INSERT INTO admin_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind("admin_music", JSON.stringify(ml)).run();
          } else if (song) {
            actionOk = false;
          }
        } else if (action === "musicdel") {
          const idx = parseInt(form.get("i") || "-1", 10);
          let ml = [];
          if (env.STATS_DB) {
            try {
              await ensureD1Table(env);
              const mr = await env.STATS_DB.prepare("SELECT value FROM admin_kv WHERE key = ?").bind("admin_music").first();
              if (mr && mr.value) ml = JSON.parse(mr.value) || [];
            } catch (e) { ml = []; }
          }
          if (idx >= 0 && idx < ml.length) { ml.splice(idx, 1); if (env.STATS_DB) await env.STATS_DB.prepare("INSERT INTO admin_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind("admin_music", JSON.stringify(ml)).run(); }
        }
      } catch (e) {
        console.error("[admin action]", action, e && e.message);
      }
      if (form.get("ajax") === "1") {
        return new Response(JSON.stringify({ ok: actionOk }), { headers: securityHeaders({ "Content-Type": "application/json; charset=utf-8" }) });
      }
      // 表单提交时前端把当前标签页放在 URL（?tab=xxx），302 必须带回去，否则会跳回概览
      const postTab = url.searchParams.get("tab");
      const safeTab = /^(overview|visitors|content|settings)$/.test(postTab || "") ? postTab : "";
      return new Response(null, {
        status: 302,
        headers: securityHeaders({ Location: safeTab ? ("/admin?tab=" + safeTab) : "/admin" }),
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
    // 并发读取全部 KV
    // 并发读取 KV（统计已迁 D1，KV 只保留封禁/维护/天气版本）
    const [
      blockRaw,
      weatherVerRaw,
      maintModeRaw,
      maintEtaRaw,
      maintReasonRaw,
      bannerRaw,
      serverCfgRaw,
      quoteCfgRaw,
      countdownRaw,
      festivalsRaw,
      bannersRaw,
      maintWlRaw,
    ] = await Promise.all([
      env.HOMEPAGE_KV.get("block:list"),
      env.HOMEPAGE_KV.get("weather_version"),
      env.HOMEPAGE_KV.get("maint_mode_live"),
      env.HOMEPAGE_KV.get("maint_eta"),
      env.HOMEPAGE_KV.get("maint_reason"),
      env.HOMEPAGE_KV.get("homepage_banner"),
      env.HOMEPAGE_KV.get("server_cfg"),
      env.HOMEPAGE_KV.get("quote_custom"),
      env.HOMEPAGE_KV.get("custom_countdown"),
      env.HOMEPAGE_KV.get("custom_festivals"),
      env.HOMEPAGE_KV.get("banners"),
      env.HOMEPAGE_KV.get("maint_whitelist"),
    ]);

    // KV 键列表（用于存储管理）
    let kvKeys = [];
    try {
      const kl = await env.HOMEPAGE_KV.list({ limit: 1000 });
      kvKeys = (kl.keys || []).map((k) => String(k.name)).sort();
    } catch (e) { console.error("[admin] KV list 失败", e); }

    // 从 D1 读取访问统计
    let total = 0;
    let entries = [];
    let daysMap = {};
    if (env.STATS_DB) {
      await ensureD1Table(env);
      try {
        const totalRes = await env.STATS_DB.prepare("SELECT COUNT(*) AS c FROM visits").first();
        total = totalRes ? Number(totalRes.c) || 0 : 0;

        const ipRes = await env.STATS_DB.prepare(
          "SELECT ip, country, COUNT(*) AS c, MAX(ts) AS t FROM visits GROUP BY ip ORDER BY t DESC LIMIT 100"
        ).all();
        entries = (ipRes.results || []).map((r) => [r.ip, { c: Number(r.c) || 0, cc: String(r.country || "XX").toUpperCase(), t: Number(r.t) || 0 }]);

        const weekAgo = Date.now() - 6 * 86400000;
        const dayRes = await env.STATS_DB.prepare(
          "SELECT substr(datetime(ts/1000,'unixepoch','+8 hours'),1,10) AS d, COUNT(DISTINCT ip) AS c FROM visits WHERE ts >= ? GROUP BY d ORDER BY d"
        ).bind(weekAgo).all();
        (dayRes.results || []).forEach((r) => { daysMap[r.d] = Number(r.c) || 0; });
      } catch (e) { console.error("[admin] D1 统计查询失败", e); }
    }
    let musicRaw = "";
    if (env.STATS_DB) {
      try {
        const mr = await env.STATS_DB.prepare("SELECT value FROM admin_kv WHERE key = ?").bind("admin_music").first();
        musicRaw = mr ? String(mr.value || "") : "";
      } catch (e) { console.error("[admin] D1 admin_kv 读取失败", e); musicRaw = ""; }
    }
    let kvTodayIp = 0;
    if (env.STATS_DB) {
      try {
        const utcStart = Date.now() - (Date.now() % 86400000);
        const kvRes = await env.STATS_DB.prepare("SELECT COUNT(DISTINCT ip) AS c FROM visits WHERE ts >= ?").bind(utcStart).first();
        kvTodayIp = kvRes ? Number(kvRes.c) || 0 : 0;
      } catch (e) { console.error("[admin] KV 估算查询失败", e); }
    }

    let blockList = {};
    try { blockList = JSON.parse(blockRaw || "{}"); } catch { blockList = {}; }
    const blockCount = Object.keys(blockList).length;

    const weatherVer = weatherVerRaw || "0";
    const maintMode = maintModeRaw || "0";
    const maintOn = !!(maintMode && maintMode !== "0");
    const maintEta = maintEtaRaw || "";
    const maintReason = maintReasonRaw || "";
    let maintWhitelist = {};
    try { maintWhitelist = JSON.parse(maintWlRaw || "{}"); } catch { maintWhitelist = {}; }
    const myIp = (request.headers.get("CF-Connecting-IP") || "").trim();
    const myIpWhitelisted = !!(myIp && maintWhitelist[myIp]);
    const maintWlRows = Object.keys(maintWhitelist).length
      ? Object.entries(maintWhitelist).map(([wip, t]) =>
          `<li class="block-item"><span class="block-ip">${escapeHtml(wip)}${wip === myIp ? ' <span style="color:#17DD62;">（你）</span>' : ''}</span><span class="block-time">${escapeHtml(new Date(t).toLocaleString('zh-CN'))}</span><form method="post" class="inline-form"><input type="hidden" name="action" value="maintwldel"><input type="hidden" name="ip" value="${escapeHtml(wip)}"><button type="submit" class="btn btn-ghost btn-sm">移除</button></form></li>`
        ).join("")
      : '<li class="empty-block">暂无放行 IP</li>';
    let bannerText = "", bannerOn = false;
    try {
      const b = JSON.parse(bannerRaw || "{}");
      bannerText = b.text || "";
      bannerOn = !!(b.enabled && b.text);
    } catch { bannerText = ""; bannerOn = false; }
    let serverAddr = "mc.hypixel.net", serverEmail = "jklahhranget@163.com";
    try {
      const sc = JSON.parse(serverCfgRaw || "{}");
      if (sc.addr) serverAddr = String(sc.addr);
      if (sc.email) serverEmail = String(sc.email);
    } catch { /* 默认值 */ }
    const quoteCustom = quoteCfgRaw || "";
    let countdownName = "", countdownDate = "";
    try {
      const cc = JSON.parse(countdownRaw || "{}");
      if (cc.name) countdownName = String(cc.name);
      if (cc.date) countdownDate = String(cc.date);
    } catch { /* 默认 */ }
    let festivals = [];
    try { const fa = JSON.parse(festivalsRaw || "[]"); if (Array.isArray(fa)) festivals = fa; } catch { festivals = []; }
    const festRows = festivals.length
      ? festivals.map((f, i) =>
          '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);">'
          + '<span style="flex:0 0 64px;color:#888;font-size:12px;">' + (Number(f.month) || 0) + '/' + (Number(f.day) || 0) + '</span>'
          + '<span style="flex:1;font-size:12px;">' + escapeHtml(String(f.name || "")) + (f.msg ? ' <span style="color:#888;font-size:11px;">' + escapeHtml(String(f.msg)) + '</span>' : '') + '</span>'
          + '<form method="post" style="margin:0;"><input type="hidden" name="action" value="festdel"><input type="hidden" name="i" value="' + i + '"><button type="submit" class="btn btn-ghost">删</button></form>'
          + '</div>'
        ).join('')
      : '<div style="color:#888;font-size:12px;margin-top:6px;">还没有自定义纪念日。</div>';
    const multiBanners = bannersRaw || "";
    const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      dates.push(d.toISOString().slice(0, 10));
    }

    let days = dates.map((date) => ({ date, count: Number(daysMap[date]) || 0 }));

    const utcToday = new Date().toISOString().slice(0, 10);
    const { workers, pages, error: apiError } = await fetchUsageSplit(env, utcToday);

    const quotaLimit = QUOTA_LIMIT;
    const quotaUsed = workers + pages;
    const quotaPct = Math.min(100, (quotaUsed / quotaLimit) * 100);
    const quotaColor = quotaPct >= 80 ? "#FF4444" : quotaPct >= 60 ? "#FFB020" : "#17DD62";
    // KV 写入估算：天气缓存(每IP首次写) + 封禁/维护等低频
    const kvUsed = Math.min(1000, kvTodayIp + 10);
    const kvPct = (kvUsed / 1000) * 100;
    const kvColor = kvPct >= 80 ? "#FF4444" : kvPct >= 50 ? "#FFB020" : "#17DD62";
    const kvWarn = kvPct >= 80 ? '<span style="color:#FF4444;font-weight:600;">⚠ 接近上限，注意排查</span>' : '';
    const resetInfo = getResetCountdown();
    const maxDay = Math.max(1, ...days.map((d) => d.count));

    // entries 已在上方 D1 查询中生成

    const ipRows = entries.slice(0, 100).map(([ipAddr, v], i) => {
      const flag = ccToFlag(v.cc);
      const country = ccToName(v.cc);
      return `<tr>
        <td>${i + 1}</td>
        <td><span class="ip-flag">${flag}</span><span class="ip-text">${escapeHtml(ipAddr)}</span></td>
        <td>${escapeHtml(country)}</td>
        <td>${escapeHtml(v.c)}</td>
        <td>${v.t ? fmtTime(v.t) : "—"}</td>
      </tr>`;
    }).join("");

    const dayRows = days
      .map((d) => `<tr><td>${escapeHtml(d.date)}</td><td>${d.count}</td></tr>`)
      .join("");

    const blockRows = blockCount
      ? Object.entries(blockList).map(([ip, t]) =>
          `<li class="block-item"><span class="block-ip">${escapeHtml(ip)}</span><span class="block-time">${escapeHtml(new Date(t).toLocaleString('zh-CN'))}</span><form method="post" class="inline-form"><input type="hidden" name="action" value="unblock"><input type="hidden" name="ip" value="${escapeHtml(ip)}"><button type="submit" class="btn btn-ghost btn-sm">解封</button></form></li>`
        ).join("")
      : '<li class="empty-block">暂无封禁 IP</li>';

    const kvSafe = new Set(["block:list","weather_version","maint_mode_live","maint_eta","maint_reason","maint_whitelist","homepage_banner","server_cfg","quote_custom","custom_countdown","custom_festivals","banners","d1_last_cleanup"]);
    const kvRows = kvKeys.length
      ? kvKeys.map((key) =>
          '<tr><td class="ip-text">' + escapeHtml(key) + '</td><td style="text-align:right;">'
          + (kvSafe.has(key)
              ? '<span style="color:#888;font-size:11px;">系统键</span>'
              : `<form method="post" class="inline-form" onsubmit="return confirm('确定删除 KV 键 ${escapeHtml(key)}？');"><input type="hidden" name="action" value="kvdel"><input type="hidden" name="key" value="${escapeHtml(key)}"><button type="submit" class="btn btn-danger btn-sm">删除</button></form>`)
          + '</td></tr>'
        ).join("")
      : '<tr><td colspan="2" class="empty">无 KV 键</td></tr>';

    let musicList = [];
    try { if (musicRaw) musicList = JSON.parse(musicRaw) || []; } catch (e) { musicList = []; }
    musicList = musicList.map(function(m, di){ return Object.assign({}, m, { d1Index: di }); });
    try {
      const mres = await fetch(new URL('/music/music.json', request.url).toString(), { headers: { "User-Agent": "PCL-Homepage" } });
      if (mres && mres.ok) {
        const arr = await mres.json();
        if (Array.isArray(arr)) {
          const extra = arr.filter(function(s){ return s && s.url; }).map(function(s){ return { name: String(s.name || "音乐"), url: String(s.url), d1Index: -1 }; });
          musicList = extra.concat(musicList);
        }
      }
    } catch (e) { /* 静态歌单加载失败仅用 D1 */ }
    const musicRows = musicList.length
      ? musicList.map((m, i) =>
          '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);">'
          + '<button type="button" class="btn btn-ghost btn-sm" data-play="' + i + '" title="播放">▶</button>'
          + '<span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(String(m.name || "")) + '</span>'
          + (m.d1Index >= 0
              ? '<form method="post" style="margin:0;"><input type="hidden" name="action" value="musicdel"><input type="hidden" name="i" value="' + m.d1Index + '"><button type="submit" class="btn btn-ghost btn-sm">删</button></form>'
              : '<span style="color:#888;font-size:11px;">内置</span>')
          + '</div>'
        ).join('')
      : '<div style="color:#888;font-size:12px;margin-top:6px;">还没有音乐，添加音频直链（mp3 等）即可播放。</div>';
    const musicJson = JSON.stringify(musicList.map((m) => ({ name: String(m.name || ""), url: String(m.url || ""), lyric: String(m.lyric || "") }))).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

    const warnHtml = apiError
      ? `<div class="warn animate-in">ℹ Cloudflare 请求数据暂不可用（${escapeHtml(apiError)}），配额显示为 0</div>`
      : "";

    const initialTime = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(11, 19);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<script>${THEME_SCRIPT}</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/png" href="/favicon.png?v=2">
<title>访问统计</title>
<style>
  ${THEME_CSS}
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin:0; padding:0;
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
  .hero-left { display:flex; flex-direction:column; gap:6px; }
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
  .hero-sub {
    display:flex; align-items:center; flex-wrap:wrap; gap:8px;
    font-size:12.5px; color: var(--text-dim); letter-spacing:.2px;
  }
  .hero-date, .hero-time { display:inline-flex; align-items:center; gap:5px; }
  .hero-date-icon, .hero-time-icon { font-size:12px; opacity:.9; }
  .hero-date { color: var(--text); font-weight:500; }
  .hero-time b {
    color: var(--text-strong);
    font-variant-numeric: tabular-nums;
    font-weight:600;
  }
  .hero-tz {
    font-size:11px; padding:1px 6px; border-radius:6px;
    background: var(--btn-ghost-bg); color: var(--text-dim);
    border:1px solid var(--card-border); margin-left:2px;
  }
  .hero-divider { width:1px; height:12px; background: var(--card-border); }

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
  .card:nth-child(1) { animation-delay:.05s; --cc:#5b9dff; --cc-bg:rgba(91,157,255,.15); }
  .card:nth-child(2) { animation-delay:.12s; --cc:#17DD62; --cc-bg:rgba(23,221,98,.15); }
  .card:nth-child(3) { animation-delay:.19s; --cc:#a78bfa; --cc-bg:rgba(167,139,250,.17); }
  .card:nth-child(4) { animation-delay:.26s; --cc:#FFB020; --cc-bg:rgba(255,176,32,.17); }
  .card:nth-child(5) { animation-delay:.33s; --cc:#FF5555; --cc-bg:rgba(255,85,85,.17); }
  .card::before {
    content:""; position:absolute; top:0; left:0; right:0; height:3px;
    background: linear-gradient(90deg, var(--cc), transparent 78%);
    opacity:0; transition: opacity .3s;
  }
  .card:hover {
    transform: translateY(-4px);
    border-color: var(--cc);
    box-shadow: var(--shadow-card), 0 10px 28px var(--cc-bg);
  }
  .card:hover::before { opacity:1; }
  .card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .card .label {
    font-size:12px; color: var(--text-dim);
    letter-spacing:.5px; text-transform:uppercase;
  }
  .card .ico {
    width:38px; height:38px; border-radius:10px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:18px; background: var(--cc-bg); line-height:1;
    transition: transform .3s;
  }
  .card:hover .ico { transform: scale(1.08) rotate(-5deg); }
  .card .value {
    font-size:36px; font-weight:700; font-variant-numeric: tabular-nums;
    background: linear-gradient(135deg, var(--text-strong), var(--cc));
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
    transition: background .2s;
    border-bottom:1px solid var(--row-border);
  }
  tbody tr:last-child { border-bottom:none; }
  tbody tr:hover { background: rgba(255,68,68,.06); }
  td:nth-child(3) { color: var(--text-dim); }
  td:nth-child(4) { color:#17DD62; font-weight:600; font-variant-numeric: tabular-nums; }
  .empty { text-align:center; color: var(--text-dim); padding:28px; font-size:13px; }

  .ip-flag { display:inline-block; margin-right:8px; font-size:15px; vertical-align:-1px; }
  .ip-text { font-variant-numeric: tabular-nums; }

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
    transition: color .2s;
    display:inline-block;
  }
  .footer a:hover { color: var(--accent); }

  .chart {
    display:flex; align-items:flex-end; gap:10px; height:170px;
    background: var(--card); border:1px solid var(--card-border);
    border-radius:14px; padding:18px 18px 12px; margin-bottom:24px;
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both;
    animation-delay:.42s;
  }
  .chart-col { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; }
  .chart-bar { width:72%; background:linear-gradient(180deg,var(--accent),var(--accent-2)); border-radius:6px 6px 0 0; min-height:3px; transition:height .8s; box-shadow:0 0 10px rgba(255,68,68,.25); }
  .chart-val { font-size:11px; color:var(--text); margin-top:5px; font-variant-numeric:tabular-nums; }
  .chart-date { font-size:10px; color:var(--text-dim); margin-top:2px; }

  .manage-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; }
  .manage-card {
    background: var(--card); border:1px solid var(--card-border); border-radius:14px; padding:20px;
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    animation: fadeUp .6s cubic-bezier(.2,.8,.2,1) both; animation-delay:.46s;
  }
  .manage-title { font-size:15px; font-weight:600; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
  .manage-form { display:flex; gap:8px; margin-bottom:14px; }
  .manage-form input {
    flex:1; padding:10px 12px; border:1px solid var(--card-border); border-radius:9px;
    background: var(--card-strong); color:var(--text); font-size:13px;
  }
  .manage-form input:focus { outline:none; border-color:var(--accent); }
  .btn-danger { background:linear-gradient(135deg,#FF4444,#c0392b); color:#fff; box-shadow:0 4px 14px rgba(255,68,68,.3); }
  .btn-danger:hover { filter:brightness(1.1); }
  .btn-warn { background:linear-gradient(135deg,#FFB020,#e67e22); color:#fff; box-shadow:0 4px 14px rgba(255,68,68,.2); }
  .btn-warn:hover { filter:brightness(1.08); }
  .btn-sm { padding:6px 12px; font-size:12px; }
  .inline-form { margin:0; display:inline-flex; }
  .block-list { list-style:none; margin:0; padding:0; max-height:230px; overflow:auto; }
  .block-item { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 2px; border-bottom:1px solid var(--row-border); font-size:13px; }
  .block-item:last-child { border-bottom:none; }
  .block-ip { font-variant-numeric:tabular-nums; font-weight:500; }
  .block-time { font-size:11px; color:var(--text-dim); }
  .manage-desc { font-size:12.5px; color:var(--text-dim); margin:0 0 14px; }
  .empty-block { text-align:center; color:var(--text-dim); padding:16px; font-size:13px; }

  .layout { display:flex; min-height:100vh; position:relative; z-index:1; }
  .sidebar {
    width:214px; flex-shrink:0; position:sticky; top:0; height:100vh;
    background: var(--card);
    border-right:1px solid var(--card-border);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    display:flex; flex-direction:column;
    padding:20px 14px;
    z-index:20;
  }
  .brand { display:flex; align-items:center; gap:10px; font-size:16px; font-weight:700; color:var(--text-strong); padding:4px 8px 20px; }
  .brand-icon {
    width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center;
    background: linear-gradient(135deg, var(--accent), var(--accent-2)); color:#fff; font-size:16px;
    box-shadow: 0 6px 16px rgba(255,68,68,.35);
  }
  .nav { display:flex; flex-direction:column; gap:4px; margin-top:6px; flex:1; }
  .nav-item {
    display:flex; align-items:center; gap:11px;
    padding:11px 13px; border-radius:10px;
    color: var(--text-dim); text-decoration:none; font-size:13.5px; font-weight:500;
    transition: background .2s, color .2s, transform .15s;
    cursor:pointer; border:1px solid transparent; user-select:none;
  }
  .nav-item .nav-ico { font-size:15px; opacity:.9; }
  .nav-item:hover { background: var(--btn-ghost-bg); color: var(--text); }
  .nav-item.active {
    background: linear-gradient(135deg, rgba(255,68,68,.12), rgba(255,68,68,.06));
    color: var(--accent); border-color: rgba(255,68,68,.22);
    box-shadow: inset 3px 0 0 var(--accent);
  }
  .sidebar-foot { display:flex; gap:6px; padding-top:12px; border-top:1px solid var(--card-border); }
  .sidebar-foot .btn { flex:1; justify-content:center; }

  .main { flex:1; min-width:0; display:flex; flex-direction:column; }
  .topbar {
    position:sticky; top:0; z-index:15;
    display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
    padding:16px 26px;
    background: var(--bg);
    border-bottom:1px solid var(--card-border);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  }
  .topbar-title { font-size:17px; font-weight:700; color:var(--text-strong); }
  .topbar-right { display:flex; align-items:center; gap:10px; font-size:12.5px; color:var(--text-dim); flex-wrap:wrap; }
  .content { flex:1; padding:24px 26px 40px; }
  .section { animation: fadeUp .4s ease both; }

  @media (max-width: 860px) {
    .layout { flex-direction:column; }
    .sidebar { width:100%; height:auto; position:static; flex-direction:row; align-items:center; padding:12px 16px; border-right:none; border-bottom:1px solid var(--card-border); }
    .brand { padding:0 12px 0 0; }
    .brand-text { display:none; }
    .nav { flex-direction:row; margin:0; overflow-x:auto; }
    .nav-item { white-space:nowrap; }
    .sidebar-foot { border-top:none; padding-top:0; margin-left:auto; }
    .content { padding:20px 16px 36px; }
    .topbar { padding:14px 16px; }
  }

  @media (max-width: 640px) {
    .manage-grid { grid-template-columns:1fr; }
    .split-card { grid-template-columns:1fr; }
    .split-item { border-right:none; border-bottom:1px solid var(--card-border); }
    .split-item:last-child { border-bottom:none; }
    .hero { flex-direction: column; align-items: flex-start; }
  }
</style>
</head>
<body>
  <div class="top-band" aria-hidden="true"></div>
  <div class="cursor-glow" id="cursorGlow" aria-hidden="true"></div>

  <div class="layout">
    <aside class="sidebar">
      <div class="brand"><span class="brand-icon">📊</span><span class="brand-text">PCL 后台</span></div>
      <nav class="nav">
        <a class="nav-item active" data-tab="overview"><span class="nav-ico">📈</span>概览</a>
        <a class="nav-item" data-tab="visitors"><span class="nav-ico">🌍</span>访问记录</a>
        <a class="nav-item" data-tab="content"><span class="nav-ico">📝</span>内容管理</a>
        <a class="nav-item" data-tab="settings"><span class="nav-ico">🛠</span>系统设置</a>
      </nav>
      <div class="sidebar-foot">
        <button class="btn btn-ghost theme-toggle-btn" id="themeBtn" title="切换主题">🌙</button>
        <a href="/admin" class="btn btn-ghost" title="刷新">↻</a>
        <a href="/admin?action=logout" class="btn btn-ghost">退出</a>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="topbar-title" id="tabTitle">概览</div>
        <div class="topbar-right">
          <span class="hero-date"><span class="hero-date-icon">📅</span><span id="bjDate">--</span></span>
          <span class="hero-divider"></span>
          <span class="hero-time"><span class="hero-time-icon">🕒</span>更新于 <b id="bjTime">${initialTime}</b><span class="hero-tz">UTC+8</span></span>
        </div>
      </header>
      <div class="content">
        <section id="tab-overview" class="section">
    ${warnHtml}

    <div class="cards">
      <div class="card">
        <div class="card-top"><div class="label">总计访问</div><div class="ico">👥</div></div>
        <div class="value" data-count="${escapeHtml(total)}">0</div>
      </div>
      <div class="card">
        <div class="card-top"><div class="label">今日人数</div><div class="ico">🔥</div></div>
        <div class="value" data-count="${days[0]?.count || 0}">0</div>
      </div>
      <div class="card">
        <div class="card-top"><div class="label">独立 IP 数</div><div class="ico">🌐</div></div>
        <div class="value" data-count="${entries.length}">0</div>
      </div>
      <div class="card">
        <div class="card-top"><div class="label">近7天峰值</div><div class="ico">📈</div></div>
        <div class="value" data-count="${maxDay}">0</div>
      </div>
      <div class="card">
        <div class="card-top"><div class="label">封禁 IP 数</div><div class="ico">🚫</div></div>
        <div class="value" data-count="${blockCount}">0</div>
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

    <div class="quota" style="margin-top:14px;">
      <div class="quota-head">
        <span class="quota-title">KV 写入使用情况（估算）</span>
        <span class="quota-sub">今日 · 上限 1,000 · 天气缓存按独立IP估算</span>
      </div>
      <div class="quota-bar">
        <div class="quota-fill"
             style="width:0%;background:${kvColor};color:${kvColor};"
             data-width="${kvPct.toFixed(2)}%"></div>
        <div class="quota-text">KV 写入估算: ${kvUsed.toLocaleString()} (${kvPct.toFixed(2)}%) ${kvWarn}</div>
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

        </section>
        <section id="tab-visitors" class="section" hidden>
          <h2>IP 访问记录（最近 100 条）· 按最近访问排序</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>#</th><th>IP</th><th>国家/地区</th><th>次数</th><th>最近访问</th></tr></thead>
              <tbody>${ipRows || '<tr><td colspan="5" class="empty">暂无记录</td></tr>'}</tbody>
            </table>
          </div>
        </section>
        <section id="tab-content" class="section" hidden>
          <h2>内容管理</h2>
          <div class="manage-grid">
      <div class="manage-card">
        <div class="manage-title">📢 主页公告</div>
        <p class="manage-desc">在主页顶部显示公告。当前：<b style="color:${bannerOn ? '#17DD62' : '#888'}">${bannerOn ? '已启用' : '已关闭'}</b></p>
        <form method="post" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input type="hidden" name="action" value="banner">
          <input name="text" type="text" value="${escapeHtml(bannerText)}" placeholder="公告内容，如：服务器近期维护中" style="flex:1;min-width:200px;">
          <button type="submit" class="btn btn-warn">保存公告</button>
        </form>
        <form method="post" style="margin-top:8px;">
          <input type="hidden" name="action" value="banner">
          <input type="hidden" name="on" value="0">
          <button type="submit" class="btn btn-ghost">关闭公告</button>
        </form>
      </div>
      <div class="manage-card">
        <div class="manage-title">🖥 服务器推荐</div>
        <p class="manage-desc">主推地址与投稿邮箱，主页"服务器推荐"卡片实时生效。</p>
        <form method="post" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input type="hidden" name="action" value="servercfg">
          <input name="addr" type="text" value="${escapeHtml(serverAddr)}" placeholder="主推地址，如 mc.hypixel.net" style="flex:1;min-width:200px;">
          <input name="email" type="text" value="${escapeHtml(serverEmail)}" placeholder="投稿邮箱" style="flex:1;min-width:160px;">
          <button type="submit" class="btn btn-warn">保存</button>
        </form>
      </div>
      <div class="manage-card">
        <div class="manage-title">💬 每日一言</div>
        <p class="manage-desc">每行一条，主页优先从这些里随机。留空保存即恢复默认一言。</p>
        <form method="post">
          <input type="hidden" name="action" value="quotecfg">
          <textarea name="text" rows="6" placeholder="每行一条一言，如：今天也要好好挖矿。" style="width:100%;box-sizing:border-box;resize:vertical;font-size:12px;padding:8px;">${escapeHtml(quoteCustom)}</textarea>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button type="submit" class="btn btn-warn">保存一言</button>
          </div>
        </form>
        <form method="post" style="margin-top:8px;">
          <input type="hidden" name="action" value="quotecfg">
          <input type="hidden" name="text" value="">
          <button type="submit" class="btn btn-ghost">恢复默认一言</button>
        </form>
      </div>
      <div class="manage-card">
        <div class="manage-title">⏳ 自定义倒计时目标</div>
        <p class="manage-desc">主页顶部显示"距目标还有 X 天"。留空保存即恢复节日倒计时。</p>
        <form method="post" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input type="hidden" name="action" value="countdown">
          <input name="name" type="text" value="${escapeHtml(countdownName)}" placeholder="目标名称，如：国庆节" style="flex:1;min-width:140px;">
          <input name="date" type="date" value="${escapeHtml(countdownDate)}" style="flex:1;min-width:150px;">
          <button type="submit" class="btn btn-warn">保存</button>
        </form>
        <form method="post" style="margin-top:8px;">
          <input type="hidden" name="action" value="countdown">
          <input type="hidden" name="name" value="">
          <input type="hidden" name="date" value="">
          <button type="submit" class="btn btn-ghost">恢复节日倒计时</button>
        </form>
      </div>
      <div class="manage-card">
        <div class="manage-title">🎊 节日 / 纪念日</div>
        <p class="manage-desc">添加你自己的纪念日（生日等），会显示在主页节日横幅和倒计时中。</p>
        <form method="post" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input type="hidden" name="action" value="festadd">
          <input name="month" type="number" min="1" max="12" placeholder="月" style="width:60px;">
          <input name="day" type="number" min="1" max="31" placeholder="日" style="width:60px;">
          <input name="name" type="text" placeholder="名称，如：我的生日" style="flex:1;min-width:110px;">
          <input name="msg" type="text" placeholder="祝福语（可选）" style="flex:1;min-width:130px;">
          <button type="submit" class="btn btn-warn">添加</button>
        </form>
        <div style="margin-top:10px;">${festRows}</div>
      </div>
      <div class="manage-card">
        <div class="manage-title">📢 多公告轮播</div>
        <p class="manage-desc">每行一条，≥2 条时主页公告自动轮播切换。留空保存即清除（回退到上方单条公告）。</p>
        <form method="post">
          <input type="hidden" name="action" value="banners">
          <textarea name="text" rows="5" placeholder="每行一条公告，如：&#10;服务器近期维护中&#10;记得领取每日福利" style="width:100%;box-sizing:border-box;resize:vertical;font-size:12px;padding:8px;">${escapeHtml(multiBanners)}</textarea>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button type="submit" class="btn btn-warn">保存轮播</button>
          </div>
        </form>
        <form method="post" style="margin-top:8px;">
          <input type="hidden" name="action" value="banners">
          <input type="hidden" name="text" value="">
          <button type="submit" class="btn btn-ghost">清除多公告</button>
        </form>
      </div>
          </div>
        </section>
        <section id="tab-settings" class="section" hidden>
          <h2>系统设置</h2>
    <div class="manage-grid">
      <div class="manage-card">
        <div class="manage-title">🚫 IP 封禁</div>
        <form method="post" class="manage-form">
          <input type="hidden" name="action" value="block">
          <input name="ip" placeholder="输入要封禁的 IP，如 1.2.3.4" required autocomplete="off">
          <button type="submit" class="btn btn-danger">封禁</button>
        </form>
        <ul class="block-list">${blockRows}</ul>
      </div>
      <div class="manage-card">
        <div class="manage-title">🌤 天气缓存</div>
        <p class="manage-desc">当前缓存版本 v${weatherVer}。重置后所有已缓存天气失效，下次访问将重新从接口盒子拉取。</p>
        <form method="post">
          <input type="hidden" name="action" value="resetweather">
          <button type="submit" class="btn btn-warn">重置天气缓存</button>
        </form>
      </div>
      <div class="manage-card">
        <div class="manage-title">🛠 服务器更新</div>
        <p class="manage-desc">开启后主页显示"服务器正在更新"兜底页（带敲字动画 + 预计完成时间）。当前：<b style="color:${maintOn ? '#FF4444' : '#17DD62'}">${maintOn ? '已开启' : '已关闭'}</b></p>
        <form method="post" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input type="hidden" name="action" value="maint">
          <input type="hidden" name="on" value="1">
          <input name="eta" type="text" value="${escapeHtml(maintEta)}" placeholder="预计完成时间，如 19:00" style="flex:1;min-width:120px;">
          <input name="reason" type="text" value="${escapeHtml(maintReason)}" placeholder="更新原因（可选），如：修复天气接口" style="flex:2;min-width:200px;">
          <button type="submit" class="btn btn-warn">开启</button>
        </form>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-ghost eta-quick-btn" data-min="30" style="font-size:12px;padding:6px 10px;">+30分钟</button>
          <button type="button" class="btn btn-ghost eta-quick-btn" data-min="60" style="font-size:12px;padding:6px 10px;">+1小时</button>
          <button type="button" class="btn btn-ghost eta-quick-btn" data-min="120" style="font-size:12px;padding:6px 10px;">+2小时</button>
          <button type="button" class="btn btn-ghost eta-quick-btn" data-time="明天" style="font-size:12px;padding:6px 10px;">切到明天</button>
        </div>
        <form method="post" style="margin-top:8px;">
          <input type="hidden" name="action" value="maint">
          <input type="hidden" name="on" value="0">
          <button type="submit" class="btn btn-ghost">关闭</button>
        </form>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--card-border);">
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px;line-height:1.7;">🚪 维护期间<b>白名单</b>：仅这些 IP 能看到正常主页，其他人看到更新页（后台 /admin 始终可访问，不会被锁在外面）。</div>
          <div style="font-size:12px;margin-bottom:6px;">你的当前 IP：<b>${escapeHtml(myIp) || '未知'}</b>${myIpWhitelisted ? ' <span style="color:#17DD62;">已放行 ✓</span>' : ''}</div>
          <form method="post" style="margin-bottom:8px;">
            <input type="hidden" name="action" value="maintwladd">
            <input type="hidden" name="ip" value="${escapeHtml(myIp)}">
            <button type="submit" class="btn btn-ghost btn-sm"${myIpWhitelisted ? ' disabled' : ''}>＋ 维护期间允许我访问</button>
          </form>
          <ul class="block-list">${maintWlRows}</ul>
        </div>
      </div>
      <div class="manage-card">
        <div class="manage-title">🗄 KV 存储</div>
        <p class="manage-desc">共 ${kvKeys.length} 个键。系统关键键已锁定，其余键可删除（带确认）。</p>
        <div class="table-wrap" style="max-height:280px;overflow:auto;">
          <table>
            <thead><tr><th>键名</th><th style="text-align:right;">操作</th></tr></thead>
            <tbody>${kvRows}</tbody>
          </table>
        </div>
      </div>
      <div class="manage-card">
        <div class="manage-title">🎵 音乐播放</div>
        <p class="manage-desc">后台摸鱼音乐，音频直链存于 D1，随后台加载。</p>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <input type="text" id="musicName" placeholder="名称（可选）" style="flex:0 0 28%;min-width:0;background:var(--quota-bg);border:1px solid var(--card-border);color:var(--text);border-radius:8px;padding:7px 10px;font-size:12px;outline:none;">
          <input type="text" id="musicUrl" placeholder="https://.../music.mp3" style="flex:1;min-width:0;background:var(--quota-bg);border:1px solid var(--card-border);color:var(--text);border-radius:8px;padding:7px 10px;font-size:12px;outline:none;">
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap;">
          <button type="button" class="btn" id="musicAddBtn">添加</button>
          <button type="button" class="btn btn-ghost" id="musicPrevBtn">⏮ 上一首</button>
          <button type="button" class="btn btn-ghost" id="musicNextBtn">下一首 ⏭</button>
          <button type="button" class="btn btn-ghost" id="musicFloatBtn">↗ 歌词</button>
        </div>
        <audio id="adminAudio" controls preload="auto" style="width:100%;margin-top:10px;height:36px;"></audio>
        <div id="musicListBox" style="margin-top:8px;">${musicRows}</div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--card-border);">
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:6px;">🔍 搜索并添加（网易云/咪咕/波点，直链有有效期，失效重新加入即可）</div>
          <div style="display:flex;gap:8px;">
            <select id="musicPf" style="background:var(--quota-bg);border:1px solid var(--card-border);color:var(--text);border-radius:8px;padding:7px 8px;font-size:12px;outline:none;">
              <option value="1">网易云</option>
              <option value="2">咪咕</option>
              <option value="3">波点</option>
            </select>
            <input type="text" id="musicQ" placeholder="歌名 / 歌手" style="flex:1;min-width:0;background:var(--quota-bg);border:1px solid var(--card-border);color:var(--text);border-radius:8px;padding:7px 10px;font-size:12px;outline:none;">
            <button type="button" class="btn" id="musicSearchBtn">搜索</button>
          </div>
          <div id="musicResult" style="margin-top:8px;max-height:220px;overflow:auto;"></div>
        </div>
      </div>
          </div>
        </section>
      </div>

      <footer class="footer">
        <div class="footer-left">
          <span>访问统计后台</span>
          <span class="footer-dot">·</span>
          <span>数据源：KV + request.cf</span>
        </div>
        <div class="footer-right">
          <a href="/admin">刷新</a>
          <a href="/admin?action=logout">退出</a>
        </div>
      </footer>
      <div id="lyricFloat" style="position:fixed;right:16px;bottom:16px;width:340px;max-width:92vw;z-index:9999;background:var(--card);border:1px solid var(--card-border);border-radius:12px;box-shadow:var(--shadow-card);overflow:hidden;font-family:inherit;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.03);border-bottom:1px solid var(--card-border);">
          <span id="lyricTitle" style="font-size:12px;color:var(--text);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">🎵 音乐</span>
          <button type="button" class="btn btn-ghost btn-sm" id="lyricMinBtn" title="最小化">—</button>
          <button type="button" class="btn btn-ghost btn-sm" id="lyricCloseBtn" title="关闭">✕</button>
        </div>
        <div id="lyricBody" style="height:220px;overflow:auto;padding:8px 12px;"></div>
        <div style="display:flex;gap:6px;align-items:center;justify-content:center;padding:8px;border-top:1px solid var(--card-border);">
          <button type="button" class="btn btn-ghost btn-sm" id="lyricPrevBtn" title="上一首">⏮</button>
          <button type="button" class="btn btn-sm" id="lyricPlayBtn" title="播放/暂停">⏸</button>
          <button type="button" class="btn btn-ghost btn-sm" id="lyricNextBtn" title="下一首">⏭</button>
        </div>
      </div>
    </div>
  </div>

<script>
  (function(){
    const navs = document.querySelectorAll('.nav-item');
    const title = document.getElementById('tabTitle');
    const tabs = { overview:'概览', visitors:'访问记录', content:'内容管理', settings:'系统设置' };
    function switchTab(t){
      navs.forEach(x => x.classList.toggle('active', x.dataset.tab === t));
      document.querySelectorAll('.section').forEach(s => { s.hidden = true; });
      const sec = document.getElementById('tab-' + t);
      if (sec) sec.hidden = false;
      if (title && tabs[t]) title.textContent = tabs[t];
    }
    navs.forEach(a => {
      a.addEventListener('click', () => switchTab(a.dataset.tab));
    });
    // 页面加载时恢复之前所在的标签页（表单提交后 URL 带 ?tab=xxx）
    const urlTab = new URLSearchParams(location.search).get('tab');
    if (urlTab && tabs[urlTab]) switchTab(urlTab);
    // 表单提交时把当前标签页附加到 action，避免提交后跳回概览
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', () => {
        const active = document.querySelector('.nav-item.active');
        const t = active ? active.dataset.tab : '';
        if (t && t !== 'overview') {
          const sep = form.action.indexOf('?') >= 0 ? '&' : '?';
          form.action = form.action + sep + 'tab=' + t;
        }
      });
    });
  })();

  document.querySelectorAll('.eta-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.manage-card').querySelector('input[name=eta]');
      if (!input) return;
      if (btn.dataset.time) { input.value = btn.dataset.time; return; }
      const mins = Number(btn.dataset.min) || 0;
      const now = new Date(Date.now() + 8 * 3600 * 1000);
      const t = new Date(now.getTime() + mins * 60000);
      const hh = String(t.getUTCHours()).padStart(2, '0');
      const mm = String(t.getUTCMinutes()).padStart(2, '0');
      input.value = hh + ':' + mm;
    });
  });

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

  requestAnimationFrame(() => {
    const fill = document.querySelector('.quota-fill');
    if (fill) fill.style.width = fill.dataset.width;
  });

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

  (function(){
    const box = document.getElementById('musicListBox');
    const audio = document.getElementById('adminAudio');
    const prevBtn = document.getElementById('musicPrevBtn');
    const nextBtn = document.getElementById('musicNextBtn');
    const addBtn = document.getElementById('musicAddBtn');
    const floatW = document.getElementById('lyricFloat');
    const titleEl = document.getElementById('lyricTitle');
    const bodyEl = document.getElementById('lyricBody');
    const playBtn = document.getElementById('lyricPlayBtn');
    const minBtn = document.getElementById('lyricMinBtn');
    const closeBtn = document.getElementById('lyricCloseBtn');
    const openBtn = document.getElementById('musicFloatBtn');
    if (!box || !audio || !prevBtn || !nextBtn || !addBtn) return;
    const list = ${musicJson};
    let idx = -1;
    let lrc = [];
    function escLrc(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function parseLrc(lrcText){
      const out = [];
      if (!lrcText) return out;
      const lines = String(lrcText).split(String.fromCharCode(10));
      for (let i = 0; i < lines.length; i++){
        const ln = lines[i];
        const m = ln.indexOf(']');
        if (m < 2) continue;
        const head = ln.slice(1, m);
        const t = head.split(':');
        if (t.length < 2) continue;
        const mm = Number(t[0]);
        const ss = Number(t[1]);
        if (isNaN(mm) || isNaN(ss)) continue;
        const text = ln.slice(m + 1).trim();
        if (!text) continue;
        out.push({ time: mm * 60 + ss, text: text });
      }
      out.sort(function(a, b){ return a.time - b.time; });
      return out;
    }
    function renderLrc(){
      if (!bodyEl) return;
      if (!lrc.length){ bodyEl.innerHTML = '<div style="color:#888;font-size:12px;padding:10px;">暂无歌词，播放后显示</div>'; return; }
      bodyEl.innerHTML = lrc.map(function(l, i){
        return '<div class="lrc-line" data-i="' + i + '" style="padding:6px 0;font-size:13px;color:var(--text-dim);transition:color .2s,transform .2s;text-align:center;">' + escLrc(l.text) + '</div>';
      }).join('');
    }
    function scrollLrc(sec){
      if (!bodyEl || !lrc.length) return;
      let active = 0;
      for (let i = 0; i < lrc.length; i++){ if (lrc[i].time <= sec) active = i; else break; }
      const lines = bodyEl.children;
      for (let i = 0; i < lines.length; i++){
        if (i === active){ lines[i].style.color = 'var(--accent)'; lines[i].style.transform = 'scale(1.08)'; }
        else { lines[i].style.color = ''; lines[i].style.transform = ''; }
      }
      const line = lines[active];
      if (line) bodyEl.scrollTop = line.offsetTop - bodyEl.clientHeight / 2;
    }
    function loadLrc(i){
      const it = list[i];
      lrc = (it && it.lyric) ? parseLrc(it.lyric) : [];
      if (titleEl) titleEl.textContent = (it && it.name) ? it.name : '音乐';
      renderLrc();
      scrollLrc(0);
    }
    function play(i){
      if (!list.length) return;
      if (i < 0) i = list.length - 1;
      if (i >= list.length) i = 0;
      idx = i;
      try { localStorage.setItem('mIdx', String(i)); } catch (e) {}
      const it = list[i];
      audio.src = it.url.indexOf("http://") === 0 ? ("https://" + it.url.slice(7)) : it.url;
      loadLrc(i);
      audio.play().catch(function(){});
      if (playBtn) playBtn.textContent = '⏸';
    }
    function setPlaying(p){
      if (playBtn) playBtn.textContent = p ? '⏸' : '▶';
    }
    box.addEventListener('click', function(e){
      const b = e.target.closest('[data-play]');
      if (b) play(Number(b.dataset.play));
    });
    prevBtn.addEventListener('click', function(){ play(idx - 1); });
    nextBtn.addEventListener('click', function(){ play(idx + 1); });
    if (playBtn) playBtn.addEventListener('click', function(){
      if (audio.paused){ audio.play().catch(function(){}); setPlaying(true); }
      else { audio.pause(); setPlaying(false); }
    });
    const lprev = document.getElementById('lyricPrevBtn');
    const lnext = document.getElementById('lyricNextBtn');
    if (lprev) lprev.addEventListener('click', function(){ play(idx - 1); });
    if (lnext) lnext.addEventListener('click', function(){ play(idx + 1); });
    if (minBtn) minBtn.addEventListener('click', function(){
      if (!bodyEl) return;
      if (bodyEl.style.display === 'none'){ bodyEl.style.display = ''; minBtn.textContent = '—'; }
      else { bodyEl.style.display = 'none'; minBtn.textContent = '▦'; }
    });
    if (closeBtn && floatW) closeBtn.addEventListener('click', function(){ floatW.style.display = 'none'; });
    if (openBtn && floatW) openBtn.addEventListener('click', function(){ floatW.style.display = 'block'; });
    audio.addEventListener('timeupdate', function(){ scrollLrc(audio.currentTime); });
    audio.addEventListener('ended', function(){ play(idx + 1); });
    audio.addEventListener('play', function(){ setPlaying(true); });
    audio.addEventListener('pause', function(){ setPlaying(false); });
    addBtn.addEventListener('click', function(){
      const name = (document.getElementById('musicName').value || '').trim();
      const url = (document.getElementById('musicUrl').value || '').trim();
      if (url.indexOf("://") === -1 || !/^https?:/i.test(url)) { alert('请输入 http(s) 音频直链'); return; }
      const f = document.createElement('form');
      f.method = 'post';
      f.innerHTML = '<input type="hidden" name="action" value="musicadd">'
        + '<input type="hidden" name="name" value="' + name.replace(/"/g, '&quot;') + '">'
        + '<input type="hidden" name="url" value="' + url.replace(/"/g, '&quot;') + '">';
      document.body.appendChild(f); f.submit();
    });
    if (!lrc.length && bodyEl) bodyEl.innerHTML = '<div style="color:#888;font-size:12px;padding:10px;">暂无歌词，播放后显示</div>';
    if (list.length){
      let saved = -1;
      try { saved = Number(localStorage.getItem('mIdx') || '-1'); } catch (e) { saved = -1; }
      if (!isNaN(saved) && saved >= 0 && saved < list.length) play(saved);
      else play(0);
      ['pointerdown','keydown','touchstart'].forEach(function(ev){
        document.addEventListener(ev, function(){
          if (audio.paused && list.length){ if (idx < 0) play(0); else audio.play().catch(function(){}); }
        }, { once: true, passive: true });
      });
    }
  })();

  (function(){
    const rbox = document.getElementById('musicResult');
    const searchBtn = document.getElementById('musicSearchBtn');
    const qIn = document.getElementById('musicQ');
    const pfIn = document.getElementById('musicPf');
    if (!rbox || !searchBtn || !qIn || !pfIn) return;
    function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    searchBtn.addEventListener('click', function(){
      const kw = qIn.value.trim();
      if (!kw) { rbox.innerHTML = '<div style="color:#888;font-size:12px;">请输入歌名或歌手</div>'; return; }
      rbox.innerHTML = '<div style="color:#888;font-size:12px;">搜索中…</div>';
      fetch('/admin?action=musicsrc&pf=' + encodeURIComponent(pfIn.value) + '&q=' + encodeURIComponent(kw))
        .then(function(r){ return r.json(); })
        .then(function(j){
          if (!j || !j.ok || !j.songs || !j.songs.length) { rbox.innerHTML = '<div style="color:#888;font-size:12px;">未找到结果</div>'; return; }
          rbox.innerHTML = j.songs.map(function(song){
            return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">'
              + '<span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(song.song) + ' <span style="color:#888;font-size:11px;">' + esc(song.singer) + '</span></span>'
              + '<button type="button" class="btn btn-ghost btn-sm" data-add="1" data-song="' + esc(song.song) + '" data-singer="' + esc(song.singer) + '" data-pf="' + esc(pfIn.value) + '">加入</button>'
              + '</div>';
          }).join('');
        })
        .catch(function(){ rbox.innerHTML = '<div style="color:#888;font-size:12px;">搜索失败</div>'; });
    });
    rbox.addEventListener('click', function(e){
      const b = e.target.closest('[data-add]');
      if (!b) return;
      b.disabled = true; b.textContent = '获取中…';
      const fd = new URLSearchParams();
      fd.append('action', 'musicadd');
      fd.append('song', b.dataset.song);
      fd.append('singer', b.dataset.singer);
      fd.append('pf', b.dataset.pf);
      fd.append('ajax', '1');
      fetch('/admin', { method: 'POST', body: fd })
        .then(function(r){ return r.json(); })
        .then(function(j){
          if (j && j.ok) { b.textContent = '✓ 已加入'; b.disabled = false; setTimeout(function(){ b.textContent = '加入'; }, 1500); }
          else { b.textContent = '加入失败'; b.disabled = false; }
        })
        .catch(function(){ b.textContent = '加入失败'; b.disabled = false; });
    });
  })();

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

  (function(){
    const dateEl = document.getElementById('bjDate');
    const timeEl = document.getElementById('bjTime');
    if (!dateEl && !timeEl) return;

    const 周 = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    const pad = (n) => String(n).padStart(2, '0');

    function tick(){
      const now = new Date(Date.now() + 8 * 3600 * 1000);
      if (dateEl) {
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth() + 1;
        const d = now.getUTCDate();
        const w = 周[now.getUTCDay()];
        dateEl.textContent = y + '年' + m + '月' + d + '日 ' + w;
      }
      if (timeEl) {
        const hh = pad(now.getUTCHours());
        const mm = pad(now.getUTCMinutes());
        const ss = pad(now.getUTCSeconds());
        timeEl.textContent = hh + ':' + mm + ':' + ss;
      }
    }

    tick();
    setInterval(tick, 1000);
  })();
</script>
</body>
</html>`;

    return new Response(html, {
      headers: securityHeaders({ "Content-Type": "text/html; charset=utf-8" }),
    });
  } catch (e) {
    console.error("[admin render]", e && e.message);
    return new Response("<h1>读取失败</h1><p>请稍后重试</p>", {
      status: 500,
      headers: securityHeaders({ "Content-Type": "text/html; charset=utf-8" }),
    });
  }
}
