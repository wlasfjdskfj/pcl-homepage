/**
 * Cloudflare Pages Functions 中间件
 * - /Custom.xaml：动态替换日期、幸运数字、幸运颜色、彩蛋、每日一言、人品分数、用户 IP、天气、节日等
 * - /version、/Custom.xaml.version、/Custom.xaml.ini：每次返回时间戳，强制 PCL 重新下载主页
 * - 来源守卫：仅 PCL2 客户端与真实浏览器可访问动态数据端点，扫描器/爬虫直接拦截
 * - 访问统计：异步写入 D1（recordVisit），数据在 /admin 页面查看
 *
 * 数据与构建函数已拆分到 ./_lib/*，本文件只保留路由与组装逻辑。
 */

import {
  QUOTES, EGGS, GREETING_SUBS, COLORS, FORTUNE_GOOD, FORTUNE_BAD, FORTUNE_TIPS,
  CHALLENGES, SEEDS, SCORE_COMMENTS,
} from './_lib/content.js';
import { QUIZ } from './_lib/quiz.js';
import { getFestival, buildFestivalBanner, buildCountdownXaml } from './_lib/lunar.js';
import { fetchWeather } from './_lib/weather.js';
import { quizImageFor } from './_lib/quizimage.js';
import { escapeXaml, buildScoreBar, buildFallbackXaml, buildQuizTag, quizAccent } from './_lib/xaml.js';
import { buildMultiBanner, buildSingleBanner } from './_lib/banner.js';
import { recordVisit } from './_lib/stats.js';
import { kvGet, kvGetJson } from './_lib/kv.js';

// ============ 纯工具函数 ============

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getBeijingDate() {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = beijing.getUTCFullYear();
  const month = beijing.getUTCMonth() + 1;
  const day = beijing.getUTCDate();
  const hour = beijing.getUTCHours();
  const weekdayMap = ["日", "一", "二", "三", "四", "五", "六"];
  const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  let greeting, period;
  if (hour < 6) { greeting = "凌晨好"; period = "dawn"; }
  else if (hour < 11) { greeting = "早上好"; period = "morning"; }
  else if (hour < 14) { greeting = "中午好"; period = "noon"; }
  else if (hour < 18) { greeting = "下午好"; period = "afternoon"; }
  else if (hour < 23) { greeting = "晚上好"; period = "evening"; }
  else { greeting = "夜深了"; period = "night"; }
  return {
    year: String(year), month: String(month), day: String(day),
    weekday: weekdayMap[beijing.getUTCDay()], dateStr, greeting, period,
  };
}

function hashCode(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return hash;
}

// 按 IP + 日期 + 盐值确定性取模，保证同一人当天运势稳定
function deterministicIndex(ip, date, salt, max) {
  return hashCode(ip + '|' + date + '|' + salt) % max;
}

function getScoreInfo(score) {
  let grade, comments;
  if (score >= 95) { grade = "SSR"; comments = SCORE_COMMENTS.SSR; }
  else if (score >= 80) { grade = "SR"; comments = SCORE_COMMENTS.SR; }
  else if (score >= 60) { grade = "R"; comments = SCORE_COMMENTS.R; }
  else if (score >= 40) { grade = "N"; comments = SCORE_COMMENTS.N; }
  else { grade = "N--"; comments = SCORE_COMMENTS["N--"]; }
  return { comment: comments[score % comments.length], grade };
}

// ============ 响应工具 ============

const BASE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

const XAML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  ...BASE_SECURITY_HEADERS,
};

const XAML_HEADERS_NO_STORE = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'CDN-Cache-Control': 'no-store',
  'Cloudflare-CDN-Cache-Control': 'no-store',
  ...BASE_SECURITY_HEADERS,
};

function xamlResponse(body, headers) {
  return new Response(body, { headers: headers || XAML_HEADERS });
}

function maintenanceResponse(eta, reason) {
  return xamlResponse(
    buildFallbackXaml('服务器正在更新', '服务器正在更新中，请稍后刷新重试。', eta || '', reason || '')
  );
}

// 只放行 PCL 客户端与真实浏览器（供人工测试），拦截扫描器 / 爬虫 UA，避免它们拖慢服务、污染访问统计
function isTrustedClient(ua, referer) {
  // PCL 启动器自身请求（UA 形如 PCL2/2.13.x）
  if (/PCL2/i.test(ua)) return true;
  // PCL 帮助页等内部跳转带的 Referer
  if (/pcl2\.server|pcl2\.open\.server/i.test(referer || '')) return true;
  // 空 UA 一律视为扫描器
  if (!ua) return false;
  // 常见爬虫 / 脚本库 / 扫描器特征（即使伪装成 Mozilla 也拦截）
  const bad = /bot|crawler|spider|scrapy|python-requests|python-urllib|aiohttp|httpx|python\/|curl\/|wget|go-http-client|okhttp|libwww|httpclient|node-fetch|axios|headless|facebookexternalhit|petalbot|semrush|ahrefs|mj12|dotbot|censys|zmap|masscan|nmap|zgrab|java\/|ruby|php\//i;
  if (bad.test(ua)) return false;
  // 其余带 Mozilla 的真实浏览器放行（用户 / 管理员浏览器测试与预览）
  if (/mozilla/i.test(ua)) return true;
  // 未知 UA 一律拦截
  return false;
}

// 动态数据端点：主页、面板、帮助元数据、根路径
const DATA_ENDPOINTS = ['/Custom.xaml', '/panel.xaml', '/panel.json', '/'];

// ============ 中间件 ============

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const isVersionPath = url.pathname === '/Custom.xaml.version' || url.pathname === '/Custom.xaml.ini' || url.pathname === '/version';

  // 0. 来源守卫：仅 PCL 客户端与真实浏览器可访问动态数据端点；扫描器/爬虫直接返回占位，不计数、不调外部接口
  if ((DATA_ENDPOINTS.indexOf(url.pathname) !== -1 || isVersionPath) && !isTrustedClient(ua, referer)) {
    return xamlResponse(
      buildFallbackXaml('访问被拒绝', '检测到异常访问（爬虫或扫描器）。如需使用本主页，请在 PCL2 启动器中打开。')
    );
  }

  // 1. 版本号：每次请求返回新时间戳，强制 PCL 后台静默重新下载
  //    兼容 .xaml 结尾地址（PCL 请求 Custom.xaml.ini）、.version 与根路径 /version
  if (isVersionPath) {
    return new Response(Date.now().toString(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
      },
    });
  }

  // 2. 主页
  if (url.pathname === '/Custom.xaml' || url.pathname === '/') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // 2.1 第一批：封禁 + 维护（决定是否直接拦截，4 个 KV 并行读）
    const [blockRaw, maintRaw, maintEta, maintReason, maintWlRaw] = await Promise.all([
      kvGet(env, 'block:list', '{}'),
      kvGet(env, 'maint_mode_live', ''),
      kvGet(env, 'maint_eta', ''),
      kvGet(env, 'maint_reason', ''),
      kvGet(env, 'maint_whitelist', '{}'),
    ]);

    // 封禁检查
    if (ip && ip !== 'unknown') {
      let blockList = {};
      try { blockList = JSON.parse(blockRaw || '{}'); } catch (e) { console.error('[Middleware] 封禁列表解析失败，本次放行：', e); }
      if (blockList[ip]) {
        return xamlResponse(buildFallbackXaml('访问被拒绝', '你的 IP 已被管理员禁止访问本主页。'));
      }
    }
    // 维护模式（白名单 IP 放行，方便管理员维护期间查看；后台 /admin 始终可访问）
    let maintWhitelist = {};
    try { maintWhitelist = JSON.parse(maintWlRaw || '{}'); } catch (e) { console.error('[Middleware] 维护白名单解析失败：', e); }
    if (maintRaw && maintRaw !== '0' && !(ip && maintWhitelist[ip])) {
      return maintenanceResponse(maintEta, maintReason);
    }

    // 2.2 访问统计异步写 D1（不阻塞响应）
    context.waitUntil(recordVisit(env, ip, (request.cf && request.cf.country) || "XX"));

    // 2.3 第二批：静态资源 + 全部配置 KV + 天气，三类 IO 并行
    const assetUrl = new URL('/Custom.xaml', url.origin);
    const [assetResp, cfg, weather] = await Promise.all([
      env.ASSETS.fetch(assetUrl).catch((e) => {
        console.error('[Middleware] 获取静态资源失败：', e);
        return null;
      }),
      Promise.all([
        kvGet(env, "quote_custom", null),
        kvGetJson(env, "server_cfg", null),
        kvGet(env, "custom_festivals", null),
        kvGetJson(env, "custom_countdown", null),
        kvGet(env, "banners", null),
        kvGetJson(env, "homepage_banner", null),
      ]),
      fetchWeather(env, ip, url.origin),
    ]);
    const weatherBody = (weather && weather.body) || "";

    if (!assetResp || !assetResp.ok) {
      console.error('[Middleware] 静态资源返回错误：', assetResp && assetResp.status);
      return maintenanceResponse();
    }
    let xaml;
    try {
      xaml = await assetResp.text();
    } catch (e) {
      console.error('[Middleware] 读取响应文本失败：', e);
      return maintenanceResponse();
    }
    if (!xaml || xaml.trim().length < 50) {
      console.error('[Middleware] 主页内容为空或过短');
      return maintenanceResponse();
    }

    // 2.4 组装与替换：任何未预期异常都兜底为"服务器正在更新"，避免 PCL 白屏
    try {
      const [quoteRaw, serverCfg, efRaw, customCountdown, multiBannersRaw, singleBanner] = cfg;

      const num = Math.floor(Math.random() * 99) + 1;
      const egg = pickRandom(EGGS);
      const date = getBeijingDate();
      const today = date.dateStr;

      // 欢迎语副标题（时段 + IP + 日期确定性，每天每时段自动换一句）
      const subPool = GREETING_SUBS[date.period] || GREETING_SUBS.morning;
      const greetingSub = subPool[deterministicIndex(ip, today, "greeting_" + date.period, subPool.length)];

      // 每日一言（IP+日期确定性下发，后台自定义优先；支持 {date}/{weekday}/{year} 占位）
      let quote = QUOTES[deterministicIndex(ip, today, "quote", QUOTES.length)];
      if (quoteRaw) {
        const qList = quoteRaw.split(/\r?\n/).map((x) => x.trim()).filter((x) => x);
        if (qList.length) quote = qList[deterministicIndex(ip, today, "quote", qList.length)];
      }
      quote = quote.replace(/\{date\}/g, date.month + "月" + date.day + "日")
                   .replace(/\{weekday\}/g, date.weekday)
                   .replace(/\{year\}/g, String(date.year));

      // 服务器推荐配置
      let serverAddr = "mc.hypixel.net";
      let serverEmail = "jklahhranget@163.com";
      if (serverCfg) {
        if (serverCfg.addr) serverAddr = String(serverCfg.addr);
        if (serverCfg.email) serverEmail = String(serverCfg.email);
      }

      // 后台可配置文案进 XAML 前统一转义
      const quoteSafe = escapeXaml(quote);
      const serverAddrSafe = escapeXaml(serverAddr);
      const serverEmailSafe = escapeXaml(serverEmail);

      // 人品分数（IP+日期确定性）
      const score = deterministicIndex(ip, today, "score", 100) + 1;
      const info = getScoreInfo(score);
      const scoreBar = buildScoreBar(score);

      // 幸运颜色
      const color = COLORS[deterministicIndex(ip, today, "color", COLORS.length)];

      // 今日运势
      const fortuneGood = FORTUNE_GOOD[deterministicIndex(ip, today, "fortune_good", FORTUNE_GOOD.length)];
      const fortuneBad = FORTUNE_BAD[deterministicIndex(ip, today, "fortune_bad", FORTUNE_BAD.length)];
      const fortuneTip = FORTUNE_TIPS[deterministicIndex(ip, today, "fortune_tip", FORTUNE_TIPS.length)];

      // 随机挑战
      const challenge = pickRandom(CHALLENGES);

      // 今日种子（主种子 + 8 个可选种子弹窗）
      const seed = SEEDS[Math.floor(Math.random() * SEEDS.length)];
      const SEED_PICKER_COUNT = 8;
      const pickerSeeds = [];
      for (let i = 0; i < SEED_PICKER_COUNT; i++) {
        pickerSeeds.push(SEEDS[Math.floor(Math.random() * SEEDS.length)]);
      }
      const seedPicker = "选择种子|" + pickerSeeds.map((s, n) => (n + 1) + ". " + s.seed + " — " + s.desc).join("&#xA;");

      // 节日 / 倒计时
      let extraFestivals = [];
      if (efRaw) {
        try {
          const arr = JSON.parse(efRaw);
          if (Array.isArray(arr)) extraFestivals = arr.filter((f) => f && f.month && f.day && f.name);
        } catch (e) { /* 自定义节日格式错误忽略 */ }
      }
      const festival = getFestival(date, extraFestivals);
      const festivalBanner = buildFestivalBanner(festival);
      const countdownBody = buildCountdownXaml(date, customCountdown, extraFestivals);

      // 公告：多公告轮播优先，否则单条公告
      let bannerBody = buildMultiBanner(multiBannersRaw);
      if (!bannerBody) bannerBody = buildSingleBanner(singleBanner);

      xaml = xaml
        .replace(/__DATE_MONTH__/g, date.month)
        .replace(/__DATE_DAY__/g, date.day)
        .replace(/__DATE_WEEKDAY__/g, date.weekday)
        .replace(/__GREETING__/g, date.greeting)
        .replace(/__GREETING_SUB__/g, escapeXaml(greetingSub))
        .replace(/__USER_IP__/g, escapeXaml(ip))
        .replace(/__LUCKY_NUMBER__/g, String(num))
        .replace(/__LUCKY_COLOR_NAME__/g, color.name)
        .replace(/__LUCKY_COLOR_HEX__/g, color.hex)
        .replace(/__QUOTE__/g, quoteSafe)
        .replace(/__SERVER_ADDR__/g, serverAddrSafe)
        .replace(/__SERVER_EMAIL__/g, serverEmailSafe)
        .replace(/__SCORE__/g, String(score))
        .replace(/__COMMENT__/g, info.comment)
        .replace(/__GRADE__/g, info.grade)
        .replace(/<!--\s*__SCORE_BAR__\s*-->|__SCORE_BAR__/g, scoreBar)
        .replace(/__FORTUNE_GOOD__/g, fortuneGood)
        .replace(/__FORTUNE_BAD__/g, fortuneBad)
        .replace(/__FORTUNE_TIP__/g, fortuneTip)
        .replace(/__CHALLENGE__/g, challenge.text)
        .replace(/__CHALLENGE_DIFF__/g, challenge.diff)
        .replace(/__SEED__/g, seed.seed)
        .replace(/__SEED_DESC__/g, seed.desc)
        .replace(/__SEED_PICKER__/g, seedPicker)
        .replace(/<!--\s*__FESTIVAL_BANNER__\s*-->|__FESTIVAL_BANNER__/g, festivalBanner)
        .replace(/<!--\s*__WEATHER_BODY__\s*-->|__WEATHER_BODY__/g, weatherBody)
        .replace(/<!--\s*__COUNTDOWN_BODY__\s*-->|__COUNTDOWN_BODY__/g, countdownBody)
        .replace(/<!--\s*__BANNER__\s*-->|__BANNER__/g, bannerBody);

      return new Response(xaml, {
        headers: Object.assign({}, XAML_HEADERS_NO_STORE, { 'Vary': 'CF-Connecting-IP' }),
      });
    } catch (e) {
      console.error('[Middleware] 主页组装失败，已返回"服务器正在更新"占位：', e);
      return maintenanceResponse();
    }
  }

  // 3. 子页面 panel.xaml（"更多功能"：实用工具 / 服务器推荐 / MC 知识）
  //    静态面板经"打开帮助"加载，再按访问者 IP 动态替换每日一题、服务器地址、彩蛋；不做节日/访问统计；天气仅用于横幅选图（命中1小时缓存，主页已取过不重复外呼）
  if (url.pathname === '/panel.xaml') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // 封禁列表 + 服务器配置 + 静态面板模板，并行读取
    const [blockRaw, serverCfg, assetResp, weather] = await Promise.all([
      kvGet(env, 'block:list', '{}'),
      kvGetJson(env, 'server_cfg', null),
      env.ASSETS.fetch(new URL('/panel.xaml', url.origin)).catch((e) => {
        console.error('[Middleware] 获取面板静态资源失败：', e);
        return null;
      }),
      fetchWeather(env, ip, url.origin),
    ]);
    const weatherKind = (weather && weather.kind) || null;

    // 封禁检查（与主页一致）
    if (ip && ip !== 'unknown') {
      let blockList = {};
      try { blockList = JSON.parse(blockRaw || '{}'); } catch (e) { console.error('[Middleware] 面板封禁列表解析失败：', e); }
      if (blockList[ip]) {
        return xamlResponse(buildFallbackXaml('访问被拒绝', '你的 IP 已被管理员禁止访问本主页。'));
      }
    }

    if (!assetResp || !assetResp.ok) {
      console.error('[Middleware] 面板静态资源返回错误：', assetResp && assetResp.status);
      return maintenanceResponse();
    }
    let panel;
    try {
      panel = await assetResp.text();
    } catch (e) {
      console.error('[Middleware] 读取面板文本失败：', e);
      return maintenanceResponse();
    }
    if (!panel || panel.trim().length < 50) {
      return maintenanceResponse();
    }

    try {
      const date = getBeijingDate();
      const today = date.dateStr;
      const heroUrl = quizImageFor(weatherKind, date, url.origin);

      // 每日一题（与主页完全一致：IP + 北京时间日期确定性抽取）
      const quizIdx = deterministicIndex(ip, today, 'quiz', QUIZ.length);
      const quiz = QUIZ[quizIdx];
      const quizNo = '第 ' + (quizIdx + 1) + ' 题 / 共 ' + QUIZ.length + ' 题';

      // 服务器推荐配置（后台可改）
      let serverAddr = 'mc.hypixel.net';
      let serverEmail = 'jklahhranget@163.com';
      if (serverCfg) {
        if (serverCfg.addr) serverAddr = String(serverCfg.addr);
        if (serverCfg.email) serverEmail = String(serverCfg.email);
      }

      // 彩蛋（IP + 北京时间日期确定性：每天每个 IP 一条，次日自动换新）
      const egg = EGGS[deterministicIndex(ip, today, "egg", EGGS.length)];
      const eggData = egg.title + '|' + egg.content;

      panel = panel
        .replace(/__QUIZ_IMAGE__/g, heroUrl)
        .replace(/__SERVER_ADDR__/g, escapeXaml(serverAddr))
        .replace(/__SERVER_EMAIL__/g, escapeXaml(serverEmail))
        .replace(/__EGG_DATA__/g, eggData)
        .replace(/__QUIZ_Q__/g, quiz.q)
        .replace(/__QUIZ_A__/g, quiz.a)
        .replace(/<!--\s*__QUIZ_TAG__\s*-->|__QUIZ_TAG__/g, buildQuizTag(quiz.cat))
        .replace(/__QUIZ_ACCENT__/g, quizAccent(quiz.cat))
        .replace(/__QUIZ_NO__/g, quizNo);

      return new Response(panel, {
        headers: Object.assign({}, XAML_HEADERS_NO_STORE, { 'Vary': 'CF-Connecting-IP' }),
      });
    } catch (e) {
      console.error('[Middleware] 面板组装失败，返回更新占位：', e);
      return maintenanceResponse();
    }
  }

  return context.next();
}
