/**
 * 后台通用工具：Cookie、安全响应头、转义、格式化等。
 * 由 functions/admin.js 引用；放在 _lib/ 下不会被当成路由。
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

export {
  COOKIE_NAME, SESSION_TTL, QUOTA_LIMIT,
  escapeHtml, safeEqual, randomToken, getCookie, securityHeaders,
  fetchWithTimeout, ccToFlag, ccToName, fmtTime,
  COUNTRY_NAMES,
};
