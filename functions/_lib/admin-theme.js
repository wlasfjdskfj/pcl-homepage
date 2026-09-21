/**
 * 后台主题脚本、样式表与登录页。
 * 由 functions/admin.js 引用；放在 _lib/ 下不会被当成路由。
 */

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

export { THEME_SCRIPT, THEME_CSS, loginPage };
