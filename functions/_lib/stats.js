// D1 访问统计：异步写入 visits 表，每天清理 7 天前数据（从 _middleware.js 抽离）
// 清理时间戳优先用模块级内存缓存，Worker 实例存活期间不再每次访问都读 KV。

let d1TableReady = false;
let lastCleanupTs = 0;      // 模块级内存缓存（毫秒），0 表示本实例尚未确认
const CLEANUP_INTERVAL = 86400000; // 24 小时

async function ensureD1Table(env) {
  if (d1TableReady || !env.STATS_DB) return;
  try {
    await env.STATS_DB.prepare(
      "CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT NOT NULL, country TEXT, ts INTEGER NOT NULL)"
    ).run();
    d1TableReady = true;
  } catch (e) { /* 建表失败忽略，下次重试 */ }
}

// 异步记录一次访问（在 context.waitUntil 中调用），并按天清理旧数据
async function recordVisit(env, ip, country) {
  if (!env.STATS_DB) return;
  try {
    await ensureD1Table(env);
    await env.STATS_DB.prepare(
      "INSERT INTO visits (ip, country, ts) VALUES (?, ?, ?)"
    ).bind(ip, country, Date.now()).run();

    // 清理节流：内存里记录过且未满 24h 就完全不碰 KV
    const now = Date.now();
    if (lastCleanupTs && now - lastCleanupTs < CLEANUP_INTERVAL) return;

    // 本实例首次或跨天：读一次 KV 确认（多实例可能都在第一天各清一次，可接受）
    let kvTs = 0;
    if (env.HOMEPAGE_KV) {
      try { kvTs = parseInt((await env.HOMEPAGE_KV.get('d1_last_cleanup')) || '0', 10) || 0; } catch (e) {}
    }
    const ref = Math.max(lastCleanupTs, kvTs);
    if (now - ref >= CLEANUP_INTERVAL) {
      await env.STATS_DB.prepare(
        "DELETE FROM visits WHERE ts < (unixepoch('now','-7 days') * 1000)"
      ).run();
      lastCleanupTs = now;
      if (env.HOMEPAGE_KV) {
        try { await env.HOMEPAGE_KV.put('d1_last_cleanup', String(now)); } catch (e) {}
      }
    } else {
      lastCleanupTs = ref;
    }
  } catch (e) {
    console.error("[Visit] D1 统计失败：", e);
  }
}

export { ensureD1Table, recordVisit };
