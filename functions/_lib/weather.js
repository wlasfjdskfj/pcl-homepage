// 实时天气：按访问者 IP 动态定位（apihz tqybip.php，中国气象局）
// 主源 apihz 按 CF-Connecting-IP 直接定位城市；失败时用 ipwho.is 拿经纬度 → Open-Meteo 兜底。
// 缓存按 IP 分桶（同一人当天命中自己的缓存）。
import { escapeXaml } from './xaml.js';

function fetchWithTimeout(url, opts, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms || 5000);
  return fetch(url, Object.assign({ signal: controller.signal }, opts || {}))
    .then((r) => { clearTimeout(timer); return r; })
    .catch((e) => { clearTimeout(timer); throw e; });
}

const WCODE = {
  0: "晴", 1: "基本晴朗", 2: "少云", 3: "多云", 45: "雾", 48: "雾凇",
  51: "毛毛雨", 53: "毛毛雨", 55: "毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨",
  71: "小雪", 73: "中雪", 75: "大雪", 80: "阵雨", 81: "强阵雨", 82: "暴雨",
  95: "雷雨", 96: "雷雨伴冰雹", 99: "雷暴冰雹",
};

function classifyWeather(code, desc) {
  if (code !== null && code !== undefined && code !== "") {
    const c = Number(code);
    if (!Number.isNaN(c)) {
      if (c >= 95) return "thunder";
      if (c === 71 || c === 73 || c === 75 || c === 77 || c === 85 || c === 86) return "snow";
      if (c === 51 || c === 53 || c === 55 || c === 56 || c === 57 || c === 61 || c === 63 || c === 65 || c === 66 || c === 67 || c === 80 || c === 81 || c === 82) return "rain";
      if (c === 45 || c === 48) return "fog";
      if (c === 2 || c === 3) return "cloudy";
      if (c === 0 || c === 1) return "clear";
    }
  }
  const d = String(desc || "");
  if (/雷|雹|电/.test(d)) return "thunder";
  if (/雪|凇|霜|冰粒/.test(d)) return "snow";
  if (/雨/.test(d)) return "rain";
  if (/雾|霾|沙尘/.test(d)) return "fog";
  if (/阴|云/.test(d)) return "cloudy";
  if (/晴|朗/.test(d)) return "clear";
  return null;
}

function buildWeatherUnavailable() {
  return '<local:MyHint Theme="Yellow" Margin="0,0,0,0" Text="天气获取失败，请稍后刷新重试。" />';
}

// 居中无图标版式：温度为主，天气/城市次之，分隔线，风力，建议。
function buildWeatherXaml(city, temp, desc, wind, isDay, source, kind) {
  const _pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let tip;
  if (temp >= 30) tip = _pick(["注意防暑，别中暑了", "天太热，记得多补水", "高温下挖矿，记得带水桶", "大热天适合在家吹风扇"]);
  else if (temp <= 0) tip = _pick(["注意保暖，别冻坏了", "天冷，多穿点再出门", "低温下带好食物和火把", "天寒地冻，适合在家烤火"]);
  else if (wind >= 40) tip = _pick(["风有点大，注意脚下", "风大，挖矿小心方块掉落", "大风天，走路别被吹飞", "风大浪急，别去海边"]);
  else {
    const d = String(desc || "");
    if (/雷|雹/.test(d)) tip = _pick(["雷雨天别站高处，小心被雷劈", "雷雨天气，适合在家研究红石", "打雷了，快进屋躲躲", "雷雨交加，别带金属装备"]);
    else if (/大|暴|强/.test(d)) tip = _pick(["雨太大了，在家整理仓库吧", "暴雨天别出门，小心被冲走", "下大雨，适合在家做附魔", "大雨倾盆，在家烤火喝茶"]);
    else if (/雪|凇/.test(d)) tip = _pick(["下雪了，适合堆雪人", "雪天适合在家烤面包", "雪天出门记得带火把", "银装素裹，适合出门看雪景", "雪地走路小心滑倒", "下雪了，适合在家泡个热水澡"]);
    else if (/雨/.test(d)) tip = _pick(["雨天适合在家建房子", "雨天适合整理箱子", "雨天适合研究红石", "雨天在家研究附魔书", "毛毛雨，适合去钓鱼", "雨天撑伞去跑图也不错", "细雨绵绵，适合在家种田", "雨声淅沥，适合听首歌发呆"]);
    else if (/雾/.test(d)) tip = _pick(["雾大，别跑太远", "雾天适合在家研究药水", "大雾弥漫看不清路，注意安全", "雾天出门记得带指南针"]);
    else tip = _pick(["适合出门挖矿", "适合探索新洞穴", "适合下矿寻宝", "适合扩建你的基地", "适合去钓鱼种田", "适合出门跑图探险", "适合挑战末影龙", "适合开荒新区域", "适合修一座红石机关", "适合去林地府邸探险", "适合驯一匹新马", "适合造一艘船去远航", "适合给基地装个自动农场", "适合带上藏宝图去寻宝", "适合去打一次凋灵试试"]);
  }
  return '<Border CornerRadius="10" Padding="16,16" Margin="0,0,0,8" Background="{DynamicResource ColorBrush7}">'
    + '<StackPanel>'
    + '<StackPanel Orientation="Horizontal" HorizontalAlignment="Center">'
    + '<TextBlock Text="' + temp + '°" FontSize="36" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />'
    + '<TextBlock Text="' + escapeXaml(desc) + '" FontSize="15" VerticalAlignment="Bottom" Foreground="{DynamicResource ColorBrush3}" Margin="8,0,0,8" />'
    + '</StackPanel>'
    + '<TextBlock Text="' + escapeXaml(city) + '" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,2,0,0" />'
    + '<Border Height="1" Margin="0,12,0,12">'
    + '<Border.Background><LinearGradientBrush StartPoint="0,0" EndPoint="1,0">'
    + '<GradientStop Color="#00000000" Offset="0" />'
    + '<GradientStop Color="#33808080" Offset="0.5" />'
    + '<GradientStop Color="#00000000" Offset="1" />'
    + '</LinearGradientBrush></Border.Background></Border>'
    + '<TextBlock Text="风力 ' + wind + ' km/h" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" />'
    + '<TextBlock Text="' + escapeXaml(tip) + '" FontSize="12" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" Margin="0,4,0,0" TextWrapping="Wrap" TextAlignment="Center" />'
    + '</StackPanel>'
    + '</Border>'
    + '<local:MyHint Theme="Blue" Margin="0,0,0,0" Text="' + (source || "天气数据来自中国气象局") + '" />';
}

// apihz 按 IP 实时天气：tqybip.php
async function fetchApihzByIp(env, ip) {
  try {
    const id = (env && env.APIHZ_ID) || "";
    const key = (env && env.APIHZ_KEY) || "";
    if (!id || !key || !env.HOMEPAGE_KV || !ip || ip === "unknown") return null;

    let weatherVer = "0";
    try { weatherVer = (await env.HOMEPAGE_KV.get('weather_version')) || "0"; } catch (e) {}
    const cacheKey = "weather:v4:" + weatherVer + ":" + ip; // 按访问者 IP 分桶
    const cached = await env.HOMEPAGE_KV.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const d = JSON.parse(cached);
        const k = d.kind || classifyWeather(null, d.desc);
        return { body: buildWeatherXaml(d.city, d.temp, d.desc, d.wind, true, d.source || "天气数据来自中国气象局。", k), kind: k };
      } catch (e) {}
    }
    const url = "https://cn.apihz.cn/api/tianqi/tqybip.php?id=" + encodeURIComponent(id)
      + "&key=" + encodeURIComponent(key)
      + "&ip=" + encodeURIComponent(ip);
    let r;
    try {
      r = await fetchWithTimeout(url, { headers: { "User-Agent": "PCL-Homepage" } }, 5000);
    } catch (e) { return null; }
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.code !== 200 || !j.nowinfo) return null;
    const temp = Math.round(j.nowinfo.temperature);
    const wind = Math.round((j.nowinfo.windSpeed || 0) * 3.6); // m/s → km/h
    const desc = (j.weather1 && j.weather2 && j.weather1 !== j.weather2)
      ? (j.weather1 + "转" + j.weather2) : (j.weather1 || "未知");
    const city = j.name || j.shi || "未知";
    const source = "天气数据来自中国气象局。";
    const k = classifyWeather(null, desc);
    try {
      await env.HOMEPAGE_KV.put(cacheKey, JSON.stringify({ city, temp, desc, wind, source, kind: k }), { expirationTtl: 3600 });
    } catch (e) {}
    return { body: buildWeatherXaml(city, temp, desc, wind, true, source, k), kind: k };
  } catch (e) {
    console.error("[Weather] apihz 按 IP 失败：", e);
    return null;
  }
}

// 兜底：按 IP 查经纬度（ipwho.is）
async function fetchGeo(ip) {
  try {
    const r = await fetchWithTimeout("https://ipwho.is/" + encodeURIComponent(ip), { headers: { "User-Agent": "PCL-Homepage" } }, 4000);
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.success === false) return null;
    return { lat: j.latitude, lon: j.longitude, city: j.city || "未知" };
  } catch (e) { return null; }
}

// Open-Meteo 兜底（用上面拿到的经纬度）
async function fetchGeoOpenMeteo(lat, lon, city) {
  try {
    const wUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon
      + "&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto";
    const wRes = await fetchWithTimeout(wUrl, { headers: { "User-Agent": "PCL-Homepage" } }, 5000);
    if (!wRes.ok) return null;
    const w = await wRes.json();
    const cw = (w && w.current) || {};
    const temp = Math.round(cw.temperature_2m);
    const wind = Math.round(cw.wind_speed_10m);
    const desc = WCODE[cw.weather_code] || "未知";
    const kind = classifyWeather(cw.weather_code, desc);
    return { body: buildWeatherXaml(city, temp, desc, wind, cw.is_day, "天气数据来自 Open-Meteo。", kind), kind: kind };
  } catch (e) {
    console.error("[Weather] Open-Meteo 兜底失败：", e);
    return null;
  }
}

async function fetchWeather(env, ip) {
  const apihz = await fetchApihzByIp(env, ip);
  if (apihz) return apihz;
  const geo = await fetchGeo(ip);
  if (geo) {
    const om = await fetchGeoOpenMeteo(geo.lat, geo.lon, geo.city);
    if (om) return om;
  }
  return { body: buildWeatherUnavailable(), kind: null };
}

export { fetchWeather, buildWeatherXaml, buildWeatherUnavailable, classifyWeather };
