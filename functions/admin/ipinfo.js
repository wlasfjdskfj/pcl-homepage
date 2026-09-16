/**
 * IP 详情代理接口
 * 路径：/admin/ipinfo?ip=1.2.3.4
 * 作用：代理调用 ipapi.is，避免跨域并给结果加 CDN 缓存
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const ip = url.searchParams.get("ip");

  if (!ip || !/^[0-9a-fA-F:.]{3,45}$/.test(ip)) {
    return json({ error: "invalid ip" }, 400);
  }

  // 可选：允许携带 token 提升速率限制
  const token = env.IPAPI_TOKEN ? `&key=${env.IPAPI_TOKEN}` : "";

  try {
    const res = await fetch(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}${token}`, {
      headers: { "User-Agent": "admin-panel" },
    });

    if (!res.ok) return json({ error: "upstream_" + res.status }, 502);

    const data = await res.json();
    return json(data, 200, {
      // 同一 IP 一天查一次就够
      "Cache-Control": "public, max-age=86400",
    });
  } catch {
    return json({ error: "network" }, 502);
  }
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}
