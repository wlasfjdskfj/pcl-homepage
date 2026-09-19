// KV 安全读取工具：失败/不存在时返回兜底值，避免单点 KV 异常拖垮主页

async function kvGet(env, key, fallback) {
  try {
    if (!env || !env.HOMEPAGE_KV) return fallback;
    const v = await env.HOMEPAGE_KV.get(key);
    return v === null || v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

async function kvGetJson(env, key, fallback) {
  const raw = await kvGet(env, key, null);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export { kvGet, kvGetJson };
