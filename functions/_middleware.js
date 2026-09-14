/**
 * Cloudflare Pages Functions 中间件
 * - /Custom.xaml：动态替换幸运数字、幸运颜色、彩蛋、每日一言
 * - /Custom.xaml.version：每次返回时间戳，强制 PCL 重新下载主页
 */

// ============ 每日一言 ============

const QUOTES = [
  // ===== 生存技巧 =====
  "钻石在 Y=-59，别挖太深。",
  "下界合金比钻石更耐用，但更难找。",
  "床在下界会爆炸，别试。",
  "水桶可以救你于岩浆之中。",
  "鞘翅需要烟花才能飞得远。",
  "末影珍珠可以让你瞬移，但会扣血。",
  "金苹果可以在紧急时刻救你一命。",
  "铁傀儡用 4 个铁块 + 1 个南瓜合成。",
  "信标需要金字塔底座，底座越大效果越强。",
  "附魔台周围放 15 个书架可以升到 30 级。",
  "钻石镐可以挖黑曜石，但需要很长时间。",
  "熔炉可以用煤炭、木炭或岩浆桶做燃料。",
  "火把可以阻止怪物在附近生成。",
  "骨粉可以让作物快速生长。",
  "鸡蛋扔出去有 1/8 的几率生成小鸡。",
  "命名牌可以让生物永久保留名字。",
  "钓鱼可以钓到附魔书，甚至是宝藏。",
  "雪傀儡会在温暖生物群系融化。",
  "铁砧掉下来会砸伤你，小心。",
  "金锭可以做 Powered Rail 的加速轨道。",

  // ===== 冷知识 =====
  "村民交易可以打折，只要你治好了僵尸村民。",
  "末影人不会主动攻击你，除非你盯着它看。",
  "睡觉可以跳过夜晚，但会让你失去刷怪的机会。",
  "苦力怕被闪电劈中会变成高压苦力怕。",
  "凋灵骷髅头可以做凋灵 Boss 的召唤材料。",
  "猫可以吓跑苦力怕和幻翼。",
  "狼可以用骨头驯服。",
  "羊被剪毛后需要吃草才能重新长毛。",
  "猪可以用胡萝卜钓竿骑。",
  "末影龙蛋只能用活塞或火把收集。",
  "潜影贝的壳可以做潜影盒，比箱子方便。",
  "潮涌核心需要海晶石和鹦鹉螺壳激活。",
  "蜜蜂可以用花朵繁殖，小心被蜇。",
  "狐狸会用嘴叼着物品，包括你的剑。",
  "熊猫会打喷嚏，还会吓到附近的熊猫。",

  // ===== 幽默吐槽 =====
  "今天也要好好挖矿。",
  "苦力怕从不敲门，但会给你惊喜。",
  "别在岩浆边挖矿，除非你想重生。",
  "你以为你在玩游戏，其实游戏在玩你。",
  "Minecraft 教会我们的第一课：不要垂直挖矿。",
  "把床放在下界，你会看到一个烟火表演。",
  "没有什么比在末地摔下去更让人心痛的了。",
  "掉进虚空的那一刻，你才明白什么叫绝望。",
  "最贵的方块不是钻石，是你的存档。",
  "当你认为已经无敌的时候，一只苦力怕会提醒你。",
];

// ============ 彩蛋 ============

const EGGS = [
  { title: "神秘代码",         content: "检测到一段古老的代码……&#xA;&#xA;恭喜你获得成就：手贱达人！" },
  { title: "开发者留言",       content: "PCL 的作者说过：&#xA;「如果你倒腾这个文件把 PCL 玩炸了，把这个文件直接删除就行了。」" },
  { title: "钻石雨",           content: "天空下起了钻石雨！&#xA;&#xA;你捡到了：&#xA;钻石 × 64&#xA;绿宝石 × 64&#xA;&#xA;醒来后发现是做梦。" },
  { title: "苦力怕的祝福",     content: "一只苦力怕悄悄靠近了你……&#xA;&#xA;sssssss……&#xA;&#xA;BOOM！" },
  { title: "末影人的秘密",     content: "你盯着末影人看了太久……&#xA;&#xA;它留下了一张纸条：&#xA;「别看了，再看把你传送到虚空。」" },
  { title: "幸运方块",         content: "你打开了一个幸运方块……&#xA;&#xA;里面跳出了一只鸡。&#xA;鸡又下了一颗蛋。&#xA;&#xA;恭喜你实现了鸡蛋自由。" },
  { title: "虚空回响",         content: "你在虚空中听到了一个声音：&#xA;&#xA;「为什么把我丢进末地？」&#xA;&#xA;你环顾四周，什么也没有。" },
  { title: "末地传送门",       content: "你找到了一座末地传送门……&#xA;&#xA;但里面没有末影之眼。&#xA;你白高兴了一场。" },
  { title: "村民的祝福",       content: "一个村民朝你走了过来……&#xA;&#xA;「哼——」&#xA;&#xA;然后他要了你 3 个绿宝石。" },
  { title: "Herobrine 的注视", content: "你突然感觉有人在看着你……&#xA;&#xA;回头一看，什么也没有。&#xA;&#xA;但他一直都在。" },
  { title: "凋灵的低语",       content: "你听到了一阵低沉的嗡鸣……&#xA;&#xA;抬头一看，天上什么都没有。&#xA;&#xA;但地面在震动。" },
  { title: "末影箱的秘密",     content: "你打开了一个末影箱……&#xA;&#xA;里面有你上次丢掉的钻石剑。&#xA;它一直都在这里。" },
  { title: "流浪商人的邀请",   content: "一个流浪商人向你走来……&#xA;&#xA;「要看看我的货吗？」&#xA;&#xA;你点开了交易界面，只有 1 个绿宝石和 2 个羊驼。" },
  { title: "钓鱼佬的祝福",     content: "你甩出了鱼竿……&#xA;&#xA;钓上来一只靴子。&#xA;&#xA;然后是第二只。&#xA;&#xA;然后是第三只。" },
  { title: "TNT 的浪漫",       content: "你在红石装置前站了很久……&#xA;&#xA;突然想起，TNT 是不能用打火石点燃的。&#xA;&#xA;……对吧？" },
  { title: "红石工程师的日常", content: "你花了 3 小时搭建了一个复杂的红石装置……&#xA;&#xA;然后发现方向装反了。" },
  { title: "食物链顶端",       content: "你认为自己是食物链顶端……&#xA;&#xA;直到你掉进了一个岩浆湖。" },
  { title: "村民的脑子",       content: "你试图和村民讨价还价……&#xA;&#xA;他给了你一个绿宝石换 64 个小麦的「好」交易。" },
  { title: "潜行的意义",       content: "你潜行了很久，以为自己很隐蔽……&#xA;&#xA;然后你踩到了压力板。" },
  { title: "苦力怕的哲学",     content: "苦力怕思考了很久……&#xA;&#xA;为什么大家都躲着我？&#xA;&#xA;然后它炸了。" },
  { title: "末地龙的困惑",     content: "末地龙在天空中盘旋……&#xA;&#xA;它想：为什么又来了一个玩家？&#xA;&#xA;它叹了一口气，准备再战一次。" },
  { title: "海洋神殿的威严",   content: "你潜入了海洋神殿……&#xA;&#xA;守卫者开始发光……&#xA;&#xA;你后悔没带水肺药水。" },
  { title: "下界要塞之旅",     content: "你进入了下界要塞……&#xA;&#xA;你看到了凋灵骷髅……&#xA;&#xA;你决定回家。" },
  { title: "牧场的烦恼",       content: "你养了 100 只鸡……&#xA;&#xA;现在你的电脑在哭泣。" },
  { title: "终极装备",         content: "你终于集齐了全套下界合金装备……&#xA;&#xA;然后掉进了虚空。" },
];

// ============ 幸运颜色 ============

const COLORS = [
  { name: "钻石蓝",     hex: "#4AEDD9" },
  { name: "红石红",     hex: "#FF5555" },
  { name: "金锭黄",     hex: "#FFAA00" },
  { name: "绿宝石绿",   hex: "#17DD62" },
  { name: "青金石蓝",   hex: "#2A4DD0" },
  { name: "紫水晶紫",   hex: "#A64DFF" },
  { name: "下界石英白", hex: "#E0E0E0" },
  { name: "岩浆橙",     hex: "#FF7722" },
  { name: "凋灵黑",     hex: "#3C3C3C" },
  { name: "末影紫",     hex: "#8E44FF" },
];

// ============ 工具函数 ============

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function noCacheResponse(body, contentType) {
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}

// ============ 中间件 ============

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // 1. 版本号文件：每次返回当前时间戳，强制 PCL 重新下载主页
  if (url.pathname === '/Custom.xaml.version') {
    const timestamp = Date.now().toString();
    return noCacheResponse(timestamp, 'text/plain; charset=utf-8');
  }

  // 2. 主页文件：动态替换占位符
  if (url.pathname === '/Custom.xaml' || url.pathname === '/') {
    const assetUrl = new URL('/Custom.xaml', url.origin);

    let response;
    try {
      response = await context.env.ASSETS.fetch(assetUrl);
    } catch (e) {
      console.error('[Middleware] 获取静态资源失败：', e);
      return new Response('Internal Error', { status: 500 });
    }

    if (!response.ok) {
      return response;
    }

    let xaml = await response.text();

    const num = Math.floor(Math.random() * 99) + 1;
    const color = pickRandom(COLORS);
    const egg = pickRandom(EGGS);
    const quote = pickRandom(QUOTES);
    const eggData = egg.title + "|" + egg.content;

    xaml = xaml
      .replace(/__LUCKY_NUMBER__/g, String(num))
      .replace(/__LUCKY_COLOR_NAME__/g, color.name)
      .replace(/__LUCKY_COLOR_HEX__/g, color.hex)
      .replace(/__EGG_DATA__/g, eggData)
      .replace(/__QUOTE__/g, quote);

    return noCacheResponse(xaml, 'application/xml; charset=utf-8');
  }

  // 3. 其他路径走默认
  return context.next();
}
