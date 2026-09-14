/**
 * Cloudflare Pages Functions 中间件
 * 每次请求动态替换幸运数字、幸运颜色、彩蛋。
 */

// 彩蛋库（和原来的 generate.py 里 EGGS 一致）
const EGGS = [
  { title: "神秘代码",     content: "检测到一段古老的代码……&#xA;&#xA;恭喜你获得成就：手贱达人！" },
  { title: "开发者留言",   content: "PCL 的作者说过：&#xA;「如果你倒腾这个文件把 PCL 玩炸了，把这个文件直接删除就行了。」" },
  { title: "钻石雨",       content: "天空下起了钻石雨！&#xA;&#xA;你捡到了：&#xA;钻石 × 64&#xA;绿宝石 × 64&#xA;&#xA;醒来后发现是做梦。" },
  { title: "苦力怕的祝福", content: "一只苦力怕悄悄靠近了你……&#xA;&#xA;sssssss……&#xA;&#xA;BOOM！" },
  { title: "末影人的秘密", content: "你盯着末影人看了太久……&#xA;&#xA;它留下了一张纸条：&#xA;「别看了，再看把你传送到虚空。」" },
  { title: "幸运方块",     content: "你打开了一个幸运方块……&#xA;&#xA;里面跳出了一只鸡。&#xA;鸡又下了一颗蛋。&#xA;&#xA;恭喜你实现了鸡蛋自由。" },
  { title: "虚空回响",     content: "你在虚空中听到了一个声音：&#xA;&#xA;「为什么把我丢进末地？」&#xA;&#xA;你环顾四周，什么也没有。" },
  { title: "末地传送门",   content: "你找到了一座末地传送门……&#xA;&#xA;但里面没有末影之眼。&#xA;你白高兴了一场。" },
  { title: "村民的祝福",   content: "一个村民朝你走了过来……&#xA;&#xA;「哼——」&#xA;&#xA;然后他要了你 3 个绿宝石。" },
  { title: "Herobrine 的注视", content: "你突然感觉有人在看着你……&#xA;&#xA;回头一看，什么也没有。&#xA;&#xA;但他一直都在。" },
];

const COLORS = [
  { name: "钻石蓝",   hex: "#4AEDD9" },
  { name: "红石红",   hex: "#FF5555" },
  { name: "金锭黄",   hex: "#FFAA00" },
  { name: "绿宝石绿", hex: "#17DD62" },
  { name: "青金石蓝", hex: "#2A4DD0" },
];

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname === '/Custom.xaml' || url.pathname === '/') {
    const assetUrl = new URL('/Custom.xaml', url.origin);
    const response = await context.env.ASSETS.fetch(assetUrl);

    if (!response.ok) {
      return response;
    }

    let xaml = await response.text();

    // 随机幸运数字
    const num = Math.floor(Math.random() * 99) + 1;

    // 随机幸运颜色
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // 随机彩蛋
    const egg = EGGS[Math.floor(Math.random() * EGGS.length)];
    const eggData = egg.title + "|" + egg.content;

    // 替换占位符
    xaml = xaml.replace(/__LUCKY_NUMBER__/g, String(num));
    xaml = xaml.replace(/__LUCKY_COLOR_NAME__/g, color.name);
    xaml = xaml.replace(/__LUCKY_COLOR_HEX__/g, color.hex);
    xaml = xaml.replace(/__EGG_DATA__/g, eggData);

    return new Response(xaml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  }

  return context.next();
}
