/**
 * Cloudflare Pages Functions 中间件
 * 拦截 /Custom.xaml 请求，每次动态替换占位符。
 */

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // 只处理 Custom.xaml 和根路径
  if (url.pathname === '/Custom.xaml' || url.pathname === '/') {
    // 从静态资源里取原始 Custom.xaml
    const assetUrl = new URL('/Custom.xaml', url.origin);
    const response = await context.env.ASSETS.fetch(assetUrl);

    if (!response.ok) {
      return response;
    }

    let xaml = await response.text();

    // 随机幸运数字（1-99）
    const num = Math.floor(Math.random() * 99) + 1;

    // 随机幸运颜色
    const colors = [
      { name: "钻石蓝",   hex: "#4AEDD9" },
      { name: "红石红",   hex: "#FF5555" },
      { name: "金锭黄",   hex: "#FFAA00" },
      { name: "绿宝石绿", hex: "#17DD62" },
      { name: "青金石蓝", hex: "#2A4DD0" },
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // 全局替换占位符
    xaml = xaml.replace(/__LUCKY_NUMBER__/g, String(num));
    xaml = xaml.replace(/__LUCKY_COLOR_NAME__/g, color.name);
    xaml = xaml.replace(/__LUCKY_COLOR_HEX__/g, color.hex);

    return new Response(xaml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  }

  // 其他路径（图片、静态资源等）走默认流程
  return context.next();
}
