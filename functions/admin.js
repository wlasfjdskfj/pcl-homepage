/**
 * 访问统计管理页面
 * 访问：https://www.mkejga.de5.net/admin
 * 或：https://www.mkejga.de5.net/admin?pwd=你的密码
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const adminPwd = env.ADMIN_PASSWORD || "";
  const providedPwd = url.searchParams.get("pwd") || "";
  const isAdmin = adminPwd && providedPwd === adminPwd;

  // ---- 未登录：显示密码输入框 ----
  if (!isAdmin) {
    const hasTried = url.searchParams.has("pwd");
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>管理员登录</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; padding:0; background:#1a1a1a; color:#eee; font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .box { background:#252525; padding:40px; border-radius:12px; width:320px; box-shadow:0 8px 32px rgba(0,0,0,0.5); }
  h1 { font-size:20px; margin:0 0 20px; text-align:center; color:#FF4444; }
  input { width:100%; padding:12px; border:1px solid #444; border-radius:8px; background:#1a1a1a; color:#eee; font-size:14px; }
  input:focus { outline:none; border-color:#FF4444; }
  button { width:100%; margin-top:16px; padding:12px; border:none; border-radius:8px; background:#FF4444; color:white; font-size:14px; font-weight:bold; cursor:pointer; }
  button:hover { background:#FF5555; }
  .err { color:#FF5555; font-size:12px; margin-top:8px; text-align:center; ${hasTried ? "" : "display:none;"} }
</style>
</head>
<body>
  <div class="box">
    <h1>管理员登录</h1>
    <form method="get">
      <input type="password" name="pwd" placeholder="请输入密码" autofocus autocomplete="current-password">
      <button type="submit">登录</button>
      <div class="err">${hasTried ? "密码错误" : ""}</div>
    </form>
  </div>
</body>
</html>`;
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // ---- 已登录：读 KV 显示统计 ----
  try {
    const total = await env.HOMEPAGE_KV.get("visit:total") || "0";

    let ipMap = {};
    try {
      ipMap = JSON.parse(await env.HOMEPAGE_KV.get("visit:ipmap") || "{}");
    } catch { ipMap = {}; }

    // 最近 7 天
    const days = [];
    const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = "visit:today:" + d.toISOString().slice(0, 10);
      let set = [];
      try {
        set = JSON.parse(await env.HOMEPAGE_KV.get(key) || "[]");
      } catch { set = []; }
      days.push({ date: d.toISOString().slice(0, 10), count: set.length });
    }

    // 排序 IP
    const entries = Object.entries(ipMap).sort((a, b) => b[1] - a[1]);

    const ipRows = entries.slice(0, 100).map(([ipAddr, cnt], i) => {
      const safeIp = String(ipAddr).replace(/[<>&"]/g, "");
      return `<tr><td>${i + 1}</td><td>${safeIp}</td><td>${cnt}</td></tr>`;
    }).join("");

    const dayRows = days.map(d =>
      `<tr><td>${d.date}</td><td>${d.count}</td></tr>`
    ).join("");

    const pwdParam = encodeURIComponent(providedPwd);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>访问统计</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; padding:24px; background:#1a1a1a; color:#eee; font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif; }
  .container { max-width:900px; margin:0 auto; }
  h1 { font-size:24px; color:#FF4444; margin:0 0 24px; display:flex; align-items:center; justify-content:space-between; }
  .refresh { padding:8px 16px; background:#FF4444; color:white; text-decoration:none; border-radius:6px; font-size:13px; font-weight:normal; }
  .refresh:hover { background:#FF5555; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:32px; }
  .card { background:#252525; padding:20px; border-radius:12px; }
  .card .label { font-size:12px; color:#888; margin-bottom:8px; }
  .card .value { font-size:32px; font-weight:bold; color:#FF4444; }
  h2 { font-size:16px; margin:32px 0 12px; color:#ccc; font-weight:normal; }
  table { width:100%; border-collapse:collapse; background:#252525; border-radius:12px; overflow:hidden; }
  th, td { padding:10px 16px; text-align:left; font-size:13px; }
  th { background:#2f2f2f; color:#888; font-weight:normal; }
  tr:not(:last-child) td { border-bottom:1px solid #2f2f2f; }
  td:nth-child(3) { color:#17DD62; font-weight:bold; }
  .empty { text-align:center; color:#666; padding:20px; }
  .logout { font-size:12px; color:#888; text-decoration:none; margin-left:16px; }
  .logout:hover { color:#FF4444; }
</style>
</head>
<body>
  <div class="container">
    <h1>
      访问统计
      <span>
        <a href="?pwd=${pwdParam}" class="refresh">刷新</a>
        <a href="/admin" class="logout">退出</a>
      </span>
    </h1>

    <div class="cards">
      <div class="card"><div class="label">总计访问</div><div class="value">${total}</div></div>
      <div class="card"><div class="label">今日人数</div><div class="value">${days[0]?.count || 0}</div></div>
      <div class="card"><div class="label">独立 IP 数</div><div class="value">${entries.length}</div></div>
    </div>

    <h2>最近 7 天</h2>
    <table>
      <tr><th>日期</th><th>人数</th></tr>
      ${dayRows}
    </table>

    <h2>IP 访问排行（前 100）</h2>
    <table>
      <tr><th>#</th><th>IP</th><th>次数</th></tr>
      ${ipRows || '<tr><td colspan="3" class="empty">暂无记录</td></tr>'}
    </table>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });

  } catch (e) {
    return new Response("<h1>读取失败</h1><pre>" + String(e) + "</pre>", {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
