/**
 * 每日签到 / 玩家数据
 *
 * 数据来源是既有的 visits 表（ip, country, ts），不新增表。
 * 两个关键设计：
 *
 * 1) 同一天同一 IP 只记一次
 *    用 KV 键 visit:today:<日期>:<ip> 标记（TTL 25 小时）。否则玩家反复刷新
 *    页面会插入大量重复行，把 visitDays 与 lifetime 统计全部污染。
 *
 * 2) 连续天数从「去重后的日期集合」倒推，而不是累加计数器
 *    这样即使用户清理了浏览器数据 / 换了网络，也只是重新开始，不会算错。
 */

const VISIT_RETENTION_DAYS = 30;   // visits 表保留天数（stats.js 的清理也按此调整）
const LIFETIME_KEY = "visits_lifetime";
const COMMUNITY_KEY = "community_stats";
const COMMUNITY_TTL = 600;          // 社区数据缓存 10 分钟，避免每次请求都聚合

function ymd(ms) {
  // 北京时间（UTC+8）的 YYYY-MM-DD
  const d = new Date(ms + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function dayOffset(dateStr, delta) {
  const t = Date.parse(dateStr + "T00:00:00Z") + delta * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * 记录一次访问（同一天同一 IP 只记一次），返回该玩家的统计。
 * 返回 { isNewDay, streak, visitDays, lifetime, todayVisitors }，任一步失败返回 null。
 */
async function recordDailyVisit(env, ip, country) {
  if (!env || !env.STATS_DB || !ip || ip === "unknown") return null;

  const today = ymd(Date.now());
  const todayKey = "visit:today:" + today + ":" + ip;

  try {
    // 1) 是否为本日首次
    let isNewDay = true;
    if (env.HOMEPAGE_KV) {
      try {
        const seen = await env.HOMEPAGE_KV.get(todayKey);
        if (seen) isNewDay = false;
      } catch (e) { /* KV 读失败按首次处理，宁可多记一次 */ }
    }

    if (isNewDay) {
      await env.STATS_DB.prepare(
        "INSERT INTO visits (ip, country, ts) VALUES (?, ?, ?)"
      ).bind(ip, country || "XX", Date.now()).run();
      if (env.HOMEPAGE_KV) {
        try { await env.HOMEPAGE_KV.put(todayKey, "1", { expirationTtl: 90000 }); } catch (e) {}
      }
    }

    // 2) 该 IP 的历史访问日期（去重）
    const res = await env.STATS_DB.prepare(
      "SELECT DISTINCT substr(datetime(ts/1000,'unixepoch','+8 hours'),1,10) AS d " +
      "FROM visits WHERE ip = ? ORDER BY d DESC LIMIT 400"
    ).bind(ip).all();
    const days = new Set(((res && res.results) || []).map((r) => r.d));

    // 3) 连续天数：从今天（或昨天）向前数
    let streak = 0;
    let cursor = days.has(today) ? today : dayOffset(today, -1);
    // 若昨天也没来，连续天数为 0（今天刚来时 days 里已有 today，从今天开始数）
    while (days.has(cursor)) {
      streak += 1;
      cursor = dayOffset(cursor, -1);
    }

    // 4) 社区数据（缓存）
    let community = null;
    if (env.HOMEPAGE_KV) {
      try {
        const raw = await env.HOMEPAGE_KV.get(COMMUNITY_KEY);
        if (raw) community = JSON.parse(raw);
      } catch (e) {}
    }
    if (!community) {
      community = await buildCommunityStats(env);
      if (community && env.HOMEPAGE_KV) {
        try { await env.HOMEPAGE_KV.put(COMMUNITY_KEY, JSON.stringify(community), { expirationTtl: COMMUNITY_TTL }); } catch (e) {}
      }
    }

    return {
      isNewDay: isNewDay,
      streak: streak,
      visitDays: days.size,
      lifetime: community ? community.lifetime : null,
      todayVisitors: community ? community.todayVisitors : null,
    };
  } catch (e) {
    console.error("[Daily] 统计失败：", e);
    return null;
  }
}

/** 聚合社区数据：今日独立访客 + 累计访问人次（lifetime 用 KV 计数器，不受 7/30 天清理影响） */
async function buildCommunityStats(env) {
  try {
    const today = ymd(Date.now());
    const row = await env.STATS_DB.prepare(
      "SELECT COUNT(DISTINCT ip) AS c FROM visits " +
      "WHERE substr(datetime(ts/1000,'unixepoch','+8 hours'),1,10) = ?"
    ).bind(today).first();

    let lifetime = 0;
    if (env.HOMEPAGE_KV) {
      try { lifetime = parseInt((await env.HOMEPAGE_KV.get(LIFETIME_KEY)) || "0", 10) || 0; } catch (e) {}
      // 每次重建缓存时递增一次（近似累计访问人次；热点下可能少计，可接受）
      try {
        lifetime += 1;
        await env.HOMEPAGE_KV.put(LIFETIME_KEY, String(lifetime));
      } catch (e) {}
    }
    return { todayVisitors: (row && row.c) || 0, lifetime: lifetime };
  } catch (e) {
    console.error("[Daily] 社区统计失败：", e);
    return null;
  }
}

/** 生成「每日签到」整张卡片 XAML；无数据时返回空串（整卡消失，不留空标题） */
function buildDailyXaml(stats) {
  if (!stats) return "";
  const streak = stats.streak || 0;

  const parts = [];
  parts.push(
    '<StackPanel Orientation="Horizontal" Margin="0,0,0,8">' +
    '<Border Width="3" Height="11" CornerRadius="1.5" Background="{DynamicResource ColorBrush3}" Margin="0,0,8,0" VerticalAlignment="Center" />' +
    '<TextBlock Text="每日签到" FontSize="12" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" VerticalAlignment="Center" />' +
    '</StackPanel>'
  );

  // 连续天数为主数字
  parts.push(
    '<Border CornerRadius="10" Padding="16,16" Background="{DynamicResource ColorBrush7}">' +
    '<StackPanel>' +
    '<StackPanel Orientation="Horizontal" HorizontalAlignment="Center">' +
    '<TextBlock Text="' + streak + '" FontSize="36" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />' +
    '<TextBlock Text="天" FontSize="15" VerticalAlignment="Bottom" Margin="4,0,0,8" Foreground="{DynamicResource ColorBrush3}" />' +
    '</StackPanel>' +
    '<TextBlock Text="连续签到" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,2,0,0" />' +
    '</StackPanel>' +
    '</Border>'
  );

  // 明细：累计天数 / 今日访客 / 累计人次
  const items = [];
  if (stats.visitDays != null) items.push("累计 " + stats.visitDays + " 天");
  if (stats.todayVisitors != null) items.push("今日 " + stats.todayVisitors + " 人");
  if (stats.lifetime != null && stats.lifetime > 0) items.push("共 " + stats.lifetime + " 人次");
  if (items.length) {
    parts.push(
      '<TextBlock Text="' + items.join("  ·  ") + '" FontSize="11" HorizontalAlignment="Center" ' +
      'Foreground="{DynamicResource ColorBrush3}" Margin="0,8,0,0" TextWrapping="Wrap" TextAlignment="Center" />'
    );
  }

  return '<local:MyCard Title="每日签到" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">' +
    '<StackPanel Margin="25,40,23,16">' + parts.join("") + '</StackPanel>' +
    '</local:MyCard>';
}

export { recordDailyVisit, buildDailyXaml, VISIT_RETENTION_DAYS, LIFETIME_KEY };
