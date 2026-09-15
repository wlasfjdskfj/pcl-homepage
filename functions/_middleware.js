/**
 * Cloudflare Pages Functions 中间件
 * - /Custom.xaml：动态替换日期、幸运数字、幸运颜色、彩蛋、每日一言、人品分数、用户 IP
 * - /Custom.xaml.version：每次返回时间戳，强制 PCL 重新下载主页
 *
 * 日期 / 幸运数字 / 每日一言 / 彩蛋 / 随机挑战：每次请求随机
 * 人品分数 / 幸运颜色 / 今日运势 / 种子推荐：用 IP / 日期 hash，同一天固定
 */

// ============ 每日一言（80 条） ============

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
  "灵魂沙会减速你，但可以做气泡柱。",
  "蜘蛛网可以减缓下落速度，救命神器。",
  "末影箱里放东西，全世界都能取。",
  "牛奶可以解除所有负面效果。",
  "红石火把可以做成反相器。",

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
  "海龟蛋只有在沙子或红沙上才能孵化。",
  "熊猫吃竹子时会坐着吃。",
  "美西螈可以在水下呼吸，但会攻击鱼。",
  "青蛙吃小史莱姆会掉落黏液球。",
  "山羊会把你撞下悬崖。",
  "铜块会随时间氧化变绿。",
  "避雷针可以吸引闪电，保护建筑。",
  "望远镜可以放大远处视野。",
  "发光鱿鱼会在黑暗中发光。",
  "深板岩比普通石头更硬，需要更久挖。",

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
  "你花了几小时建的家，苦力怕 3 秒就能拆。",
  "钻石就在脚下，前提是你别再挖下去。",
  "说好的和平模式，苦力怕依然会炸你。",
  "刚睡醒就被骷髅射中，这就是 Minecraft 的早晨。",
  "想挖矿又怕怪物，那就白天挖吧。",
  "夜晚的 Minecraft 有两种声音：僵尸和小白。",
  "你以为你在跑图，其实你在迷路。",
  "你以为你在钓鱼，其实你在被水鬼拖下水。",
  "你以为你在建房子，其实你在给苦力怕造新家。",
  "你以为你无敌了，其实你只是还没遇到劫掠。",
  "你以为你在冒险，其实你只是在找回家的路。",
  "你以为你在挖矿，其实你在给自己挖坟。",
  "你以为你能打败末影龙，其实你连床都没做。",
  "你以为你有附魔装备，其实你只有一把石剑。",
  "你以为你在深夜玩，其实天已经亮了。",
];

// ============ 彩蛋（50 个） ============

const EGGS = [
  // ===== 经典彩蛋 =====
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

  // ===== 生物梗 =====
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

  // ===== 新增彩蛋 =====
  { title: "美西螈的心事",     content: "一只美西螈在水里游来游去……&#xA;&#xA;「为什么他们只叫我粉红小可爱？」&#xA;&#xA;它叹了口气，装死。" },
  { title: "熊猫的烦恼",       content: "你遇到了一只熊猫……&#xA;&#xA;它正在吃竹子。&#xA;&#xA;你看了它一分钟。&#xA;&#xA;它还在吃。" },
  { title: "羊驼的鄙视",       content: "一只羊驼走到你面前……&#xA;&#xA;它吐了你一脸口水。&#xA;&#xA;这就是它对你时尚品味的评价。" },
  { title: "凋灵的愤怒",       content: "你召唤了凋灵……&#xA;&#xA;它开始爆炸……&#xA;&#xA;你家没了。" },
  { title: "幻翼的提醒",       content: "你在夜里赶路……&#xA;&#xA;三只幻翼从天而降。&#xA;&#xA;它们在提醒你：该睡觉了。" },
  { title: "骷髅的诅咒",       content: "你被骷髅射中……&#xA;&#xA;你试图反击……&#xA;&#xA;你的弓箭手部技能+1。" },
  { title: "僵尸的邀请",       content: "一只僵尸举起了手……&#xA;&#xA;它想和你握手。&#xA;&#xA;你犹豫了一下，然后它开始追你。" },
  { title: "蜘蛛的跳舞",       content: "蜘蛛在墙上爬来爬去……&#xA;&#xA;它们其实在跳踢踏舞。&#xA;&#xA;只是你听不懂节奏。" },
  { title: "恶魂的哭泣",       content: "你在下界听到哭声……&#xA;&#xA;是恶魂。&#xA;&#xA;它每天哭 8 小时。" },
  { title: "炽足兽的抱怨",     content: "你骑着炽足兽在岩浆上行走……&#xA;&#xA;它低声抱怨：&#xA;「为什么你们人类都这么重？」" },
  { title: "猪灵的讨价还价",   content: "你拿出一块金锭……&#xA;&#xA;猪灵看了一眼……&#xA;&#xA;又看了你一眼……&#xA;&#xA;然后抢了你的金锭跑了。" },
  { title: "末影螨的怨念",     content: "你扔出了末影珍珠……&#xA;&#xA;末影螨出现了……&#xA;&#xA;它瞪着你：&#xA;「又是你！」" },
  { title: "潜影贝的防护",     content: "你靠近了潜影贝……&#xA;&#xA;它闭上了壳……&#xA;&#xA;它以为这样你就打不到它了。" },
  { title: "海龟的旅行",       content: "你目送小海龟走向海洋……&#xA;&#xA;5 分钟后它又回来了。&#xA;&#xA;原来它只是去上了个厕所。" },
  { title: "北极熊的冷漠",     content: "你看到一只北极熊……&#xA;&#xA;你想摸它。&#xA;&#xA;它给了你一巴掌。" },
  { title: "蜜蜂的哲学",       content: "你偷了蜜蜂的蜂蜜……&#xA;&#xA;蜜蜂追了你 20 分钟……&#xA;&#xA;然后它们决定原谅你。" },
  { title: "监守者的沉默",     content: "你在远古城市里潜行……&#xA;&#xA;监守者站在你身后……&#xA;&#xA;它什么也没做。&#xA;&#xA;它只是看着你。" },
  { title: "蛙明的歌声",       content: "一只青蛙在池塘边呱呱叫……&#xA;&#xA;它唱的其实是《生日快乐》……&#xA;&#xA;只是你五音不全。" },
  { title: "蝾螈的派对",       content: "你养了 5 只美西螈……&#xA;&#xA;它们开了一个派对……&#xA;&#xA;你没被邀请。" },
  { title: "末地的星空",       content: "你站在末地的高塔上……&#xA;&#xA;看着天空的星星……&#xA;&#xA;你忘了你是怎么上来的。" },
  { title: "地狱门的秘密",     content: "你建了一个下界传送门……&#xA;&#xA;进去之后发现对面是另一个传送门。&#xA;&#xA;你迷路了。" },
  { title: "村子的希望",       content: "你在村庄里放了一张床……&#xA;&#xA;村民们围了过来……&#xA;&#xA;他们以为你是村长。" },
  { title: "劫掠的预兆",       content: "你杀死了一个掠夺者队长……&#xA;&#xA;你获得了不祥之兆……&#xA;&#xA;你忘了自己住在村庄里。" },
  { title: "深海的心跳",       content: "你潜入了深海……&#xA;&#xA;你听到了心跳声……&#xA;&#xA;那是你自己的心跳。" },
  { title: "告示牌的告白",     content: "你在告示牌上写下了心事……&#xA;&#xA;第二天有人回复：&#xA;「我也一样。」" },
];

// ============ 幸运颜色（24 种） ============

const COLORS = [
  { name: "钻石蓝",     hex: "#4AEDD9" },
  { name: "红石红",     hex: "#FF5555" },
  { name: "金锭黄",     hex: "#FFAA00" },
  { name: "绿宝石绿",   hex: "#17DD62" },
  { name: "青金石蓝",   hex: "#2A4DD0" },
  { name: "紫水晶紫",   hex: "#A64DFF" },
  { name: "下界石英白", hex: "#E0E0E0" },
  { name: "煤炭黑",     hex: "#1A1A1A" },
  { name: "铁锭银",     hex: "#D8D8D8" },
  { name: "铜锭橙",     hex: "#E77C56" },
  { name: "下界合金灰", hex: "#4A4A4A" },
  { name: "苔藓绿",     hex: "#6BA941" },
  { name: "樱花粉",     hex: "#F7B5CB" },
  { name: "竹子绿",     hex: "#7FB069" },
  { name: "仙人掌绿",   hex: "#4A7A3A" },
  { name: "蘑菇红",     hex: "#C14444" },
  { name: "岩浆橙",     hex: "#FF7722" },
  { name: "凋灵黑",     hex: "#3C3C3C" },
  { name: "末影紫",     hex: "#8E44FF" },
  { name: "荧石黄",     hex: "#FFDD55" },
  { name: "海晶青",     hex: "#5FE3C9" },
  { name: "龙息紫",     hex: "#C08BF5" },
  { name: "美西螈粉",   hex: "#F5A0B8" },
  { name: "蜜蜂黄",     hex: "#F4C542" },
];

// ============ 今日运势 · 宜 ============

const FORTUNE_GOOD = [
  "挖矿", "探险", "钓鱼", "建造", "战斗", "交易",
  "种田", "养动物", "附魔", "下界探险", "末地挑战",
  "刷怪", "合成", "整理箱子", "修路", "造红石",
  "找村庄", "驯狼", "采花", "砍树", "挖沙子",
  "煮药水", "炼金", "造地图", "放烟花", "睡午觉",
];

// ============ 今日运势 · 忌 ============

const FORTUNE_BAD = [
  "垂直挖矿", "靠近岩浆", "夜晚出门", "进下界", "打末影龙",
  "惹苦力怕", "惹蜜蜂", "空手打劫掠", "从高处跳下",
  "看末影人", "潜行挖矿", "深夜挖矿", "单人挑凋灵",
  "在悬崖边建家", "把床放下界", "TNT 玩火", "看监守者",
  "水下挖矿", "在沙子上建家", "把家建在雷区",
  "用地狱门回家", "在村庄里打掠夺者", "在末地乱跑",
  "在灵魂沙上走", "带金锭见猪灵",
];

// ============ 今日运势 · 小贴士 ============

const FORTUNE_TIPS = [
  "带上足够的火把再出发。",
  "别忘了带水桶，能救命。",
  "多准备点食物，饥饿很致命。",
  "留一个末影箱放贵重物品。",
  "出门前先睡一觉，避免幻翼。",
  "把家附近点亮，防止刷怪。",
  "背包里常备木头，随时能做工具。",
  "遇到苦力怕别慌，往后退。",
  "下矿前先记好坐标。",
  "在岩浆边放个水桶。",
  "把重要物品放末影箱。",
  "定期备份存档。",
  "探索前先标记基地位置。",
  "多带点箭，骷髅很烦。",
  "别小看岩浆，它能烧掉一切。",
  "打末影龙前准备好床。",
  "带上金苹果以防万一。",
  "附魔装备别乱扔。",
  "多养点动物，食物稳定。",
  "村民交易可以省钱。",
];

// ============ 随机挑战（30 个） ============

const CHALLENGES = [
  { text: "不用床通关末地",       diff: "困难" },
  { text: "不挖钻石通关末地",     diff: "困难" },
  { text: "只用木制工具打末影龙", diff: "噩梦" },
  { text: "不用附魔打通末地",     diff: "困难" },
  { text: "一条命通关末地",       diff: "噩梦" },
  { text: "不用药水打凋灵",       diff: "困难" },
  { text: "不用床打末影龙",       diff: "困难" },
  { text: "在生存模式下建一座城堡", diff: "普通" },
  { text: "驯服 10 只狼",         diff: "普通" },
  { text: "建一个自动农场",       diff: "普通" },
  { text: "收集所有颜色的羊毛",   diff: "普通" },
  { text: "在 1 小时内找到钻石",  diff: "普通" },
  { text: "建一个下界交通枢纽",   diff: "困难" },
  { text: "驯服一只猫",           diff: "简单" },
  { text: "养 20 只鸡",           diff: "简单" },
  { text: "种一片小麦田",         diff: "简单" },
  { text: "挖到 Y=-59",           diff: "简单" },
  { text: "建一个 10×10 的房子",  diff: "简单" },
  { text: "在下界挖到远古残骸",   diff: "普通" },
  { text: "找到一座海底神殿",     diff: "普通" },
  { text: "找到一座林地府邸",     diff: "困难" },
  { text: "找到一座远古城市",     diff: "困难" },
  { text: "驯服一只美西螈",       diff: "普通" },
  { text: "用烟花滑翔 1000 米",   diff: "普通" },
  { text: "建一个信标",           diff: "困难" },
  { text: "击败一只劫掠兽",       diff: "普通" },
  { text: "在生存模式下复活一个僵尸村民", diff: "困难" },
  { text: "建一个自动刷石机",     diff: "普通" },
  { text: "给全套装备附魔",       diff: "普通" },
  { text: "在末地建一个基地",     diff: "困难" },
];

// ============ MC 种子推荐（25 个） ============

const SEEDS = [
  { seed: "-343522682",   desc: "出生点旁边就是村庄，还有废弃传送门" },
  { seed: "1400",         desc: "出生点附近有两个村庄，适合开局" },
  { seed: "999",          desc: "出生点旁边就是掠夺者前哨站" },
  { seed: "-772528963",   desc: "出生点附近有蘑菇岛和海底神殿" },
  { seed: "1",            desc: "经典种子，出生点旁边有村庄" },
  { seed: "-887553494",   desc: "附近有 6 个村庄和 2 个要塞" },
  { seed: "0",            desc: "出生点旁边就是冰刺之地" },
  { seed: "1234567890",   desc: "出生点附近有樱花树林和村庄" },
  { seed: "-1158469226",  desc: "出生点旁边就是远古城市" },
  { seed: "777",          desc: "出生点附近有两个村庄和一个要塞" },
  { seed: "42",           desc: "出生点旁边就是繁花森林" },
  { seed: "-578303778",   desc: "出生点旁边就是蘑菇岛" },
  { seed: "10086",        desc: "中国区经典种子，出生点旁边有村庄" },
  { seed: "233333",       desc: "出生点附近有竹林和熊猫" },
  { seed: "-1943522019",  desc: "出生点旁边是热带草原和村庄" },
  { seed: "66666",        desc: "出生点附近有丛林神庙" },
  { seed: "12345",        desc: "出生点旁边就是雪原村庄" },
  { seed: "-888",         desc: "出生点旁边就是废弃矿井" },
  { seed: "555555",       desc: "出生点附近有 4 个村庄" },
  { seed: "2024",         desc: "出生点旁边就是樱花树林" },
  { seed: "2025",         desc: "出生点旁边有村庄和掠夺者前哨站" },
  { seed: "-505050",      desc: "出生点旁边是沙漠村庄和沙漠神殿" },
  { seed: "123123",       desc: "出生点附近有繁茂洞穴" },
  { seed: "-789",         desc: "出生点旁边就是海底神殿" },
  { seed: "31415926",     desc: "出生点附近有远古城市和要塞" },
];

// ============ 人品评语库 ============

const SCORE_COMMENTS = {
  SSR: [
    "欧皇降世！建议立刻去抽卡。",
    "今天的你，连末影龙都会主动让路。",
    "运气爆棚！快去挖钻石吧。",
    "你就是传说中的欧皇本皇。",
    "建议今天去钓鱼，必有宝藏。",
    "这种运气，你上辈子肯定拯救过村庄。",
  ],
  SR: [
    "运气极佳，适合下矿挖钻石。",
    "今天是个冒险的好日子。",
    "你的运气正在上升期。",
    "适合去探索新地形。",
    "今天的怪物会绕着你走。",
    "建议今天挑战一次末地。",
  ],
  R: [
    "运气不错，平平淡淡才是真。",
    "今天是个好日子，但也别太浪。",
    "中规中矩，稳扎稳打。",
    "适合整理仓库和规划基地。",
    "今天的你，是个合格的生存玩家。",
    "建议今天建房子。",
  ],
  N: [
    "一般般，建议扶老奶奶过马路。",
    "今天的运气不太行，小心为上。",
    "别挖矿了，在家种地吧。",
    "建议今天远离岩浆。",
    "今天的怪物可能会找你麻烦。",
    "建议今天多带点食物出门。",
  ],
  "N--": [
    "非酋认证，建议在家种地。",
    "今天别出门了，真的。",
    "你的运气已经触底，但还能再低。",
    "建议今天什么都别做。",
    "连苦力怕都同情你。",
    "建议今天把游戏难度调成和平。",
  ],
};

// ============ 工具函数 ============

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
  const weekdayIdx = beijing.getUTCDay();
  const weekdayMap = ["日", "一", "二", "三", "四", "五", "六"];
  const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  let greeting;
  if (hour < 6) {
    greeting = "凌晨好";
  } else if (hour < 11) {
    greeting = "早上好";
  } else if (hour < 14) {
    greeting = "中午好";
  } else if (hour < 18) {
    greeting = "下午好";
  } else if (hour < 23) {
    greeting = "晚上好";
  } else {
    greeting = "夜深了";
  }
  return {
    year: String(year),
    month: String(month),
    day: String(day),
    weekday: weekdayMap[weekdayIdx],
    dateStr: dateStr,
    greeting: greeting,
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

function deterministicIndex(ip, date, salt, max) {
  const seed = hashCode(ip + '|' + date + '|' + salt);
  return seed % max;
}

function getScoreInfo(score) {
  let grade, comments;
  if (score >= 95) {
    grade = "SSR";
    comments = SCORE_COMMENTS.SSR;
  } else if (score >= 80) {
    grade = "SR";
    comments = SCORE_COMMENTS.SR;
  } else if (score >= 60) {
    grade = "R";
    comments = SCORE_COMMENTS.R;
  } else if (score >= 40) {
    grade = "N";
    comments = SCORE_COMMENTS.N;
  } else {
    grade = "N--";
    comments = SCORE_COMMENTS["N--"];
  }
  const comment = comments[score % comments.length];
  return { comment: comment, grade: grade };
}

function buildScoreBar(score) {
  const blocks = 10;
  const filled = Math.floor(score / 10);
  let bar = '<StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,14">';
  for (let i = 0; i < blocks; i++) {
    let bg;
    if (i >= filled) {
      bg = '{DynamicResource ColorBrush7}';
    } else {
      const pos = i / blocks;
      if (pos < 0.4) {
        bg = '#FF6B6B';
      } else if (pos < 0.7) {
        bg = '#FFC93C';
      } else {
        bg = '#4ADE80';
      }
    }
    bar += '<Border Width="24" Height="9" CornerRadius="4.5" Margin="1.5,0" Background="' + bg + '" />';
  }
  bar += '</StackPanel>';
  return bar;
}

// ============ 中间件 ============

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. 版本号文件：每次请求返回新时间戳，强制 PCL 重新下载
  if (url.pathname === '/Custom.xaml.version') {
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

  // 2. 主页文件
  if (url.pathname === '/Custom.xaml' || url.pathname === '/') {
    const assetUrl = new URL('/Custom.xaml', url.origin);

    let response;
    try {
      response = await env.ASSETS.fetch(assetUrl);
    } catch (e) {
      console.error('[Middleware] 获取静态资源失败：', e);
      return new Response('Internal Error', { status: 500 });
    }

    if (!response.ok) {
      return response;
    }

    let xaml = await response.text();

    const num = Math.floor(Math.random() * 99) + 1;
    const egg = pickRandom(EGGS);
    const quote = pickRandom(QUOTES);
    const eggData = egg.title + "|" + egg.content;

    const date = getBeijingDate();
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const today = date.dateStr;

    const score = deterministicIndex(ip, today, "score", 100) + 1;
    const info = getScoreInfo(score);
    const scoreBar = buildScoreBar(score);

    const colorIdx = deterministicIndex(ip, today, "color", COLORS.length);
    const color = COLORS[colorIdx];

    // 今日运势
    const fortuneGoodIdx = deterministicIndex(ip, today, "fortune_good", FORTUNE_GOOD.length);
    const fortuneBadIdx = deterministicIndex(ip, today, "fortune_bad", FORTUNE_BAD.length);
    const fortuneTipIdx = deterministicIndex(ip, today, "fortune_tip", FORTUNE_TIPS.length);
    const fortuneGood = FORTUNE_GOOD[fortuneGoodIdx];
    const fortuneBad = FORTUNE_BAD[fortuneBadIdx];
    const fortuneTip = FORTUNE_TIPS[fortuneTipIdx];

    // 随机挑战
    const challenge = pickRandom(CHALLENGES);

    // 种子推荐（按日期固定，所有人当天相同）
    const seedIdx = deterministicIndex("seed", today, "seed", SEEDS.length);
    const seed = SEEDS[seedIdx];

    xaml = xaml
      .replace(/__DATE_YEAR__/g, date.year)
      .replace(/__DATE_MONTH__/g, date.month)
      .replace(/__DATE_DAY__/g, date.day)
      .replace(/__DATE_WEEKDAY__/g, date.weekday)
      .replace(/__GREETING__/g, date.greeting)
      .replace(/__USER_IP__/g, ip)
      .replace(/__LUCKY_NUMBER__/g, String(num))
      .replace(/__LUCKY_COLOR_NAME__/g, color.name)
      .replace(/__LUCKY_COLOR_HEX__/g, color.hex)
      .replace(/__EGG_DATA__/g, eggData)
      .replace(/__QUOTE__/g, quote)
      .replace(/__SCORE__/g, String(score))
      .replace(/__COMMENT__/g, info.comment)
      .replace(/__GRADE__/g, info.grade)
      .replace(/__SCORE_BAR__/g, scoreBar)
      .replace(/__FORTUNE_GOOD__/g, fortuneGood)
      .replace(/__FORTUNE_BAD__/g, fortuneBad)
      .replace(/__FORTUNE_TIP__/g, fortuneTip)
      .replace(/__CHALLENGE__/g, challenge.text)
      .replace(/__CHALLENGE_DIFF__/g, challenge.diff)
      .replace(/__SEED__/g, seed.seed)
      .replace(/__SEED_DESC__/g, seed.desc);

    return new Response(xaml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'CDN-Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
        'Vary': 'CF-Connecting-IP',
      },
    });
  }

  return context.next();
}
