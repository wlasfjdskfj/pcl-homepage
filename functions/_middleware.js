/**
 * Cloudflare Pages Functions 中间件
 * - /Custom.xaml：动态替换日期、幸运数字、幸运颜色、彩蛋、每日一言、人品分数、用户 IP
 * - /Custom.xaml.version：每次返回时间戳，强制 PCL 重新下载主页
 * - 访问统计：每次访问都 +1，写入 KV，数据在 /admin 页面查看
 */

// ============ 每日一言（80 条） ============

const QUOTES = [
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
  "你以为你在钓鱼，其实鱼在钓你。",
];

// ============ 彩蛋（50 个） ============

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

// ============ 今日运势 · 宜（100 条） ============

const FORTUNE_GOOD = [
  "挖矿", "砍树", "种田", "钓鱼", "建造",
  "探险", "合成", "附魔", "交易", "刷怪",
  "打怪", "打僵尸", "打骷髅", "打蜘蛛", "打苦力怕",
  "打末影人", "打女巫", "打劫掠者", "打幻翼", "打溺尸",
  "找村庄", "找要塞", "找丛林神庙", "找沙漠神殿", "找废弃矿井",
  "找海底神殿", "找林地府邸", "找远古城市", "找废弃传送门", "找冰屋",
  "下界探险", "挖远古残骸", "末地挑战", "打末影龙", "打凋灵",
  "通关末地城", "找堡垒遗迹", "找下界要塞", "找猪灵堡垒", "找下界荒地",
  "驯狼", "驯猫", "驯马", "驯鹦鹉", "驯狐狸",
  "养动物", "养鸡", "养牛", "养羊", "养美西螈",
  "种小麦", "种胡萝卜", "种土豆", "种甘蔗", "种南瓜",
  "种西瓜", "种竹子", "种仙人掌", "养蜜蜂", "种蘑菇",
  "修路", "造桥", "造房子", "造城堡", "造农场",
  "造刷怪塔", "造红石", "造自动门", "造刷石机", "造全物品分类",
  "整理箱子", "采花", "放烟花", "睡午觉", "晒日光",
  "煮药水", "炼金", "造地图", "烤面包", "做蛋糕",
  "和村民交易", "和猪灵交易", "和流浪商人交易", "和好友联机", "和宠物玩耍",
  "教新手玩", "看实况", "看教学", "看攻略", "看 Wiki",
  "备份存档", "截图留念", "录视频", "写日记", "听音乐",
  "吃点东西", "喝杯水", "伸个懒腰", "休息一会儿", "闭眼养神",
];

// ============ 今日运势 · 忌（100 条） ============

const FORTUNE_BAD = [
  "垂直挖矿", "潜行挖矿", "深夜挖矿", "水下挖矿", "洞穴深处挖矿",
  "不带火把挖矿", "不带水桶挖矿", "不带食物挖矿", "不记坐标挖矿", "在沙子上挖矿",
  "靠近岩浆", "在岩浆边建家", "TNT 玩火", "玩打火石", "在树林里放火",
  "带木头进下界", "空手摸岩浆", "在熔岩湖游泳", "在火里跳", "抱着 TNT 睡觉",
  "夜晚出门", "深夜赶路", "不带床出门", "不点火把过夜", "在野外睡觉",
  "深夜下矿", "在黑暗中摸索", "不带剑出门", "空手打僵尸", "在夜里建房子",
  "单人挑凋灵", "空手打劫掠", "空手打末影龙", "惹苦力怕", "惹蜜蜂",
  "惹监守者", "惹猪灵", "打末影人", "打高压苦力怕", "在末地乱跑",
  "在村庄里打掠夺者", "在下界惹猪灵", "在深海惹守卫者", "在林地惹唤魔者", "在远古城市惹监守者",
  "进下界", "打末影龙", "把床放下界", "用地狱门回家", "在下界搭桥",
  "在末地摔下去", "在末地建高塔", "在下界乱走", "在末地乱挖", "在虚空边建家",
  "从高处跳下", "在悬崖边建家", "在沙子上建家", "在水边建家", "在雷区建家",
  "在山顶建家", "在海底建家", "在岩浆湖上建家", "在虚空边建家", "在爆炸区建家",
  "看末影人", "带金锭见猪灵", "在灵魂沙上走", "在蜂蜜块上跳", "在冰上跑",
  "在末影螨附近走", "在潜影贝旁边走", "在蜜蜂旁边跑", "在羊驼旁边吐口水", "在熊猫旁边吵闹",
  "不备份存档", "不开死亡不掉落", "不开和平模式", "不带金苹果", "不带末影箱",
  "不带地图探索", "不带指南针", "不带钟", "不带食物", "不带工具",
  "看 Herobrine 传说", "念末影人名字", "在午夜玩游戏", "在 3 点起床", "在满月出门",
  "在雷雨天挖矿", "在日食时探险", "在星期五 13 号下矿", "在半夜打末影龙", "在凌晨看恐怖片",
];

// ============ 今日运势 · 小贴士（70 条） ============

const FORTUNE_TIPS = [
  "带上足够的火把再出发。",
  "别忘了带水桶，能救命。",
  "多准备点食物，饥饿很致命。",
  "出门前先睡一觉，避免幻翼。",
  "背包里常备木头，随时能做工具。",
  "多带点箭，骷髅很烦。",
  "带上金苹果以防万一。",
  "出门前检查一遍背包。",
  "带一把备用剑，工具会坏。",
  "带上工作台，随时能合成。",
  "下矿前先记好坐标。",
  "在岩浆边放个水桶。",
  "挖矿别垂直往下挖。",
  "带够火把，黑暗会刷怪。",
  "挖到钻石先别急着挖，看看周围有没有岩浆。",
  "用石镐挖石头，铁镐留给矿石。",
  "带一把铁镐去挖钻石。",
  "挖到 Y=-59 最容易找到钻石。",
  "下矿带一桶水，能灭火也能防摔。",
  "挖矿时注意脚下，别掉进洞穴。",
  "遇到苦力怕别慌，往后退。",
  "打末影龙前准备好床。",
  "附魔装备别乱扔。",
  "打骷髅走 Z 字，能躲箭。",
  "打僵尸保持距离，别被围。",
  "打蜘蛛注意天花板，它们会爬墙。",
  "打末影人别看它眼睛。",
  "打凋灵前先建好掩体。",
  "打劫掠前先建好防线。",
  "打监守者要潜行，别发出声音。",
  "把家附近点亮，防止刷怪。",
  "留一个末影箱放贵重物品。",
  "把重要物品放末影箱。",
  "多养点动物，食物稳定。",
  "村民交易可以省钱。",
  "养一群鸡，鸡蛋能做蛋糕。",
  "养一群牛，皮革能做书架。",
  "养一群羊，羊毛能做床。",
  "建一个自动农场，省时省力。",
  "建一个刷石机，石头永远够用。",
  "定期备份存档。",
  "探索前先标记基地位置。",
  "重要建筑先截图，防止丢失。",
  "开死亡不掉落，减少损失。",
  "开和平模式，专心建造。",
  "别在存档里放 TNT，容易炸。",
  "别把存档放在 C 盘，容易丢。",
  "存档定期压缩，防止损坏。",
  "不要把存档放在桌面，会被清理。",
  "换电脑前先备份存档。",
  "探索前带好地图和指南针。",
  "带一匹马来赶路。",
  "带一只狼来做保镖。",
  "带一只猫来吓苦力怕。",
  "带一只鹦鹉来听歌。",
  "找村庄前先找地图。",
  "找要塞用末影之眼。",
  "找远古城市带羊毛，能隔音。",
  "找海底神殿带水肺药水。",
  "找林地府邸带好装备。",
  "进下界前带一桶水（虽然会蒸发）。",
  "下界搭桥用圆石，不会被恶魂炸掉。",
  "末地建桥用黑曜石，不会被末影龙炸掉。",
  "打末影龙带床，能炸伤它。",
  "打末影龙带弓箭，能远程打水晶。",
  "末地城带潜影盒，装战利品方便。",
  "末地城注意潜影贝，会瞬移。",
  "下界要塞带防火药水。",
  "猪灵交易用金锭，别用金块。",
  "下界挖远古残骸用床，能快速挖。",
  "多看 Wiki，很多机制需要查。",
  "多和朋友联机，更有趣。",
  "多录视频，记录游戏时光。",
  "多听音乐，游戏更带感。",
  "多休息，别熬夜玩游戏。",
  "多喝水，别沉迷。",
  "多吃饭，身体重要。",
  "多陪家人，游戏不是全部。",
  "多笑一笑，心态最重要。",
  "多想想，别冲动下决定。",
];

// ============ MC 知识小测（80 题 · 困难） ============

const QUIZ = [
  { q: "附魔「锋利 V」+「横扫之刃 III」的剑，横扫伤害是多少？", a: "普通攻击的 50%（横扫之刃 III 提升到 75%）" },
  { q: "信标的最大作用范围（六级）是多少格？", a: "50 格" },
  { q: "全套下界合金盔甲的护甲值和韧性分别是多少？", a: "护甲 20 点，韧性 12 点" },
  { q: "附魔「保护 IV」能减少多少伤害？", a: "16%（每级 4%，上限 20%）" },
  { q: "满级「水下呼吸 III」的水下憋气时间是多少？", a: "约 225 秒（基础 15 秒 × 15）" },
  { q: "附魔「效率 V」+ 信标「急迫 II」的钻石镐挖石头需要几 tick？", a: "1 tick（瞬间破坏）" },
  { q: "从 Y=320 掉到 Y=-64 的摔落伤害是多少？", a: "死亡（约 384 格，远超致命高度）" },
  { q: "末影珍珠传送后固定扣多少血？", a: "5 点（2.5 颗心）" },
  { q: "凋灵在困难模式下的血量是多少？", a: "600" },
  { q: "附魔「无限」的弓射出的箭，落地后能捡回吗？", a: "不能" },
  { q: "「节肢杀手 V」对蜘蛛额外造成多少伤害？", a: "+12.5 点（2.5 颗心 × 5 级）" },
  { q: "金苹果和附魔金苹果的回血量分别是多少？", a: "金苹果 4 点，附魔金苹果 8 点（还有吸收和抗性）" },
  { q: "满级「灵魂疾行 III」在灵魂沙上的速度加成是多少？", a: "约 1.5 倍" },
  { q: "信标一次能给几个玩家加成？", a: "范围内所有玩家（不限数量）" },
  { q: "附魔「深海探索者 III」在水下的移动速度是多少？", a: "与陆地相同（100%）" },
  { q: "满级「冰霜行者 II」的冰面范围是多少格？", a: "半径 2 格（3×3 区域）" },
  { q: "附魔「击退 II」能把怪物击退多少格？", a: "约 3.5 格" },
  { q: "「多重射击」弩一次能射几支箭？", a: "3 支（消耗 1 支箭）" },
  { q: "满附魔钻石剑的最大攻击伤害是多少？", a: "约 13 点（6.5 颗心，锋利 V + 力量药水等）" },
  { q: "全套保护 IV 下界合金甲能减少多少伤害？", a: "约 80%（护甲 20 + 保护 20%）" },
  { q: "什么方块能让活塞推动但不能被粘性活塞拉回？", a: "黑曜石、哭泣的黑曜石、重生锚、远古残骸" },
  { q: "雪傀儡走过什么方块会受伤？", a: "任何暖色生物群系（沙漠、下界、恶地等）" },
  { q: "什么条件下末影人会主动攻击玩家？", a: "玩家看向它的头部（距离 64 格内）" },
  { q: "什么方块能让信标的光柱穿透？", a: "所有透明方块（玻璃、树叶、铁栏杆等）" },
  { q: "什么条件下苦力怕会变成闪电苦力怕？", a: "被闪电劈中（或附近有引雷三叉戟）" },
  { q: "什么生物被玩家杀死后会掉落「不死图腾」？", a: "唤魔者" },
  { q: "什么方块能让水流方向改变？", a: "不能（水只能向下、向四周扩散）" },
  { q: "什么条件下雪傀儡会主动攻击？", a: "看到敌对生物（僵尸、骷髅等）" },
  { q: "什么方块在生存模式下无法被破坏？", a: "基岩、末地传送门框架、屏障、命令方块（非创造）" },
  { q: "什么条件下凋灵会进入第二阶段？", a: "血量降到 50% 以下（护甲阶段结束）" },
  { q: "什么条件下末影龙会停止回血？", a: "末地水晶全部被摧毁后" },
  { q: "什么条件下僵尸村民会变成普通僵尸？", a: "被闪电劈中" },
  { q: "什么条件下末影人会瞬移？", a: "被攻击、被投掷物击中、看向它的头部、周围有水" },
  { q: "什么条件下猪灵会攻击玩家？", a: "玩家没穿金装备、打开箱子、挖掘金块" },
  { q: "什么条件下潜影贝会瞬移？", a: "被攻击、周围方块变化、贝壳被打开" },
  { q: "什么条件下村民会降价交易？", a: "玩家治愈僵尸村民后（被治愈的村民永久打折）" },
  { q: "什么方块能让玩家在下界快速移动？", a: "冰 + 船（或蓝冰 + 船）" },
  { q: "什么条件下末影人会主动攻击末影螨？", a: "任何时候（末影螨是末影人的天敌）" },
  { q: "什么条件下铁傀儡会主动攻击玩家？", a: "玩家攻击村民、攻击铁傀儡（村庄声望降低）" },
  { q: "什么条件下羊驼会向玩家吐口水？", a: "玩家靠近、攻击羊驼或被拴绳牵引的羊驼" },
  { q: "什么条件下狐狸会信任玩家？", a: "玩家繁殖两只狐狸，幼年狐狸会信任玩家" },
  { q: "什么条件下熊猫会攻击玩家？", a: "熊猫被攻击、或玩家靠近幼年熊猫时熊猫生气" },
  { q: "什么条件下山羊会撞击玩家？", a: "玩家靠近山羊，山羊有几率发起撞击" },
  { q: "什么条件下蜜蜂会主动攻击玩家？", a: "玩家破坏蜂巢、攻击蜜蜂、踩到蜂巢" },
  { q: "什么条件下美西螈会装死？", a: "血量低于 50% 时，装死 10 秒" },
  { q: "Minecraft Java 版 1.0 正式版是哪一年发布的？", a: "2011 年 11 月 18 日" },
  { q: "「下界合金」是在哪个版本加入的？", a: "1.16（下界更新）" },
  { q: "「美西螈」是在哪个版本加入的？", a: "1.17（洞穴与山崖第一部分）" },
  { q: "「监守者」是在哪个版本加入的？", a: "1.19（荒野更新）" },
  { q: "「樱花树林」是在哪个版本加入的？", a: "1.20（足迹与故事）" },
  { q: "「试炼密室」是在哪个版本加入的？", a: "1.21（棘巧试炼）" },
  { q: "「末地」是在哪个版本加入的？", a: "1.0（2011 年）" },
  { q: "「下界」是在哪个版本加入的？", a: "Alpha 1.2.0（2010 年 10 月 30 日）" },
  { q: "「红石」是在哪个版本加入的？", a: "Alpha 1.0.1（2010 年 7 月）" },
  { q: "「村民」是在哪个版本加入的？", a: "Beta 1.9-pre1（2011 年）" },
  { q: "「鞘翅」是在哪个版本加入的？", a: "1.9（2016 年）" },
  { q: "「潜影盒」是在哪个版本加入的？", a: "1.11（2016 年）" },
  { q: "「Minecraft」最早叫什么名字？", a: "Cave Game（洞穴游戏）" },
  { q: "「Minecraft」的开发者是谁？", a: "Markus Persson（Notch）" },
  { q: "「Mojang」是哪一年被微软收购的？", a: "2014 年" },
  { q: "「爬行者」的官方中文名是什么？", a: "苦力怕" },
  { q: "「末影人」的英文原名是什么？", a: "Enderman" },
  { q: "「Herobrine」是官方加入的生物吗？", a: "不是，是社区传说" },
  { q: "「Notch 苹果」是官方物品吗？", a: "不是，是 Mod 内容" },
  { q: "「HIM」是谁的缩写？", a: "Herobrine in Minecraft（社区传说人物）" },
  { q: "在 1 tick 内最多能破坏多少个方块？", a: "理论上 1 个（每个方块至少 1 tick）" },
  { q: "从 Y=320 自由落体到 Y=-64，需要多少秒？", a: "约 12 秒（约 384 格）" },
  { q: "满速鞘翅滑翔的极限速度是多少格/秒？", a: "约 67.5 格/秒（约 243 km/h）" },
  { q: "一个区块最多能生成多少个敌对生物？", a: "无固定上限，取决于刷怪上限（默认 70）" },
  { q: "从 Y=256 掉进水中需要多少格缓冲？", a: "至少 1 格水（可免摔落伤害）" },
  { q: "满附魔三叉戟的最大投掷伤害是多少？", a: "约 17 点（8.5 颗心，穿刺 V）" },
  { q: "信标全套效果（力量 II + 速度 II + 抗性 II + 跳跃 II + 急迫 II）需要多少层金字塔？", a: "4 层（最大）" },
  { q: "末影龙每次攻击间隔是多少秒？", a: "约 10-15 秒" },
  { q: "凋灵在第二阶段每秒回复多少血？", a: "1 点（0.5 颗心）" },
  { q: "从 Y=64 掉进虚空需要多少秒？", a: "约 4-5 秒（取决于 Y 值）" },
  { q: "满级「经验修补」的工具每次修复多少耐久？", a: "2 耐久 / 1 经验" },
  { q: "一个满附魔的钻石镐（效率 V + 耐久 III + 经验修补）能挖多少个方块？", a: "理论上无限（经验修补自动修）" },
  { q: "Minecraft 世界最大能生成多少个区块？", a: "约 9.2 亿亿（边界 ±3000 万格）" },
  { q: "满级「忠诚 III」的三叉戟回到手中需要多少秒？", a: "约 1-3 秒（取决于距离）" },
  { q: "满级「激流 III」的三叉戟在水中能飞多快？", a: "约 30 格/秒（相当于鞘翅滑翔的一半）" },
  { q: "「保护 IV」+「摔落保护 IV」能减少多少摔落伤害？", a: "约 84%（保护 16% + 摔落保护 48% + 护甲）" },
  { q: "满附魔鞘翅 + 烟花 III 能飞多高？", a: "无上限（受烟花持续时间和数量限制）" },
  { q: "凋灵骷髅头的掉落率是多少？", a: "2.5%（抢夺 III 提升到 5.5%）" },
  { q: "凋灵的召唤需要几个凋灵骷髅头？", a: "3 个（+ 4 个灵魂沙）" },
  { q: "末影龙的血量是多少？", a: "200 点（100 颗心）" },
];

// ============ 随机挑战（100 个） ============

const CHALLENGES = [
  { text: "驯服一只猫",           diff: "简单" },
  { text: "养 20 只鸡",           diff: "简单" },
  { text: "种一片小麦田",         diff: "简单" },
  { text: "挖到 Y=-59",           diff: "简单" },
  { text: "建一个 10×10 的房子",  diff: "简单" },
  { text: "驯服一只狼",           diff: "简单" },
  { text: "养一只美西螈",         diff: "简单" },
  { text: "做一把钻石镐",         diff: "简单" },
  { text: "挖一组铁矿石",         diff: "简单" },
  { text: "烤一组成品牛排",       diff: "简单" },
  { text: "做一张地图",           diff: "简单" },
  { text: "做一张床",             diff: "简单" },
  { text: "给工具附魔一次",       diff: "简单" },
  { text: "找到一座村庄",         diff: "简单" },
  { text: "驯服一匹马",           diff: "简单" },
  { text: "做一把弓箭",           diff: "简单" },
  { text: "养一群羊",             diff: "简单" },
  { text: "采一束花",             diff: "简单" },
  { text: "做一个蛋糕",           diff: "简单" },
  { text: "钓 10 条鱼",           diff: "简单" },
  { text: "砍一组木头",           diff: "简单" },
  { text: "做一个铁傀儡",         diff: "简单" },
  { text: "在村庄睡一觉",         diff: "简单" },
  { text: "做一把石剑",           diff: "简单" },
  { text: "挖一组煤炭",           diff: "简单" },
  { text: "在生存模式下建一座城堡", diff: "普通" },
  { text: "驯服 10 只狼",         diff: "普通" },
  { text: "建一个自动农场",       diff: "普通" },
  { text: "收集所有颜色的羊毛",   diff: "普通" },
  { text: "在 1 小时内找到钻石",  diff: "普通" },
  { text: "在下界挖到远古残骸",   diff: "普通" },
  { text: "找到一座海底神殿",     diff: "普通" },
  { text: "驯服一只美西螈",       diff: "普通" },
  { text: "用烟花滑翔 1000 米",   diff: "普通" },
  { text: "击败一只劫掠兽",       diff: "普通" },
  { text: "建一个自动刷石机",     diff: "普通" },
  { text: "给全套装备附魔",       diff: "普通" },
  { text: "建一个下界传送门",     diff: "普通" },
  { text: "驯服一只狐狸",         diff: "普通" },
  { text: "繁殖一群村民",         diff: "普通" },
  { text: "养一片甘蔗田",         diff: "普通" },
  { text: "建一个刷怪塔",         diff: "普通" },
  { text: "用红石做一个自动门",   diff: "普通" },
  { text: "用船环游一次世界",     diff: "普通" },
  { text: "在下界走 1000 格",     diff: "普通" },
  { text: "驯服一只鹦鹉",         diff: "普通" },
  { text: "建一个牧场",           diff: "普通" },
  { text: "挖一组钻石",           diff: "普通" },
  { text: "做一套铁装备",         diff: "普通" },
  { text: "做一套钻石装备",       diff: "普通" },
  { text: "建一个末影箱",         diff: "普通" },
  { text: "用附魔台附魔 5 次",    diff: "普通" },
  { text: "做一瓶夜视药水",       diff: "普通" },
  { text: "找到一座废弃矿井",     diff: "普通" },
  { text: "驯服一只骆驼",         diff: "普通" },
  { text: "不用床通关末地",       diff: "困难" },
  { text: "不挖钻石通关末地",     diff: "困难" },
  { text: "不用附魔打通末地",     diff: "困难" },
  { text: "不用药水打凋灵",       diff: "困难" },
  { text: "不用床打末影龙",       diff: "困难" },
  { text: "建一个下界交通枢纽",   diff: "困难" },
  { text: "找到一座林地府邸",     diff: "困难" },
  { text: "找到一座远古城市",     diff: "困难" },
  { text: "建一个信标",           diff: "困难" },
  { text: "在生存模式下复活一个僵尸村民", diff: "困难" },
  { text: "在末地建一个基地",     diff: "困难" },
  { text: "击败凋灵",             diff: "困难" },
  { text: "击败末影龙",           diff: "困难" },
  { text: "通关末地城",           diff: "困难" },
  { text: "在深海建一个基地",     diff: "困难" },
  { text: "造一个全物品分类系统", diff: "困难" },
  { text: "用床炸末影龙",         diff: "困难" },
  { text: "通关一次劫掠",         diff: "困难" },
  { text: "在超平坦世界通关末地", diff: "困难" },
  { text: "在深海打守卫者",       diff: "困难" },
  { text: "驯服一只北极熊",       diff: "困难" },
  { text: "打一场末地城 raid",    diff: "困难" },
  { text: "在 1 小时内通关末地",  diff: "困难" },
  { text: "不用弓打末影龙",       diff: "困难" },
  { text: "不用金苹果打凋灵",     diff: "困难" },
  { text: "只用木制工具打末影龙", diff: "噩梦" },
  { text: "一条命通关末地",       diff: "噩梦" },
  { text: "不用床炸末影龙",       diff: "噩梦" },
  { text: "空手击败末影龙",       diff: "噩梦" },
  { text: "不用装备通关末地",     diff: "噩梦" },
  { text: "在虚空世界活过 10 分钟", diff: "噩梦" },
  { text: "不用水桶通关末地",     diff: "噩梦" },
  { text: "不用剑打末影龙",       diff: "噩梦" },
  { text: "只用石制工具通关末地", diff: "噩梦" },
  { text: "在末地不睡觉通关",     diff: "噩梦" },
  { text: "用剪刀打末影龙",       diff: "噩梦" },
  { text: "在创造模式下变成生存", diff: "噩梦" },
  { text: "在超平坦虚空世界生存 1 小时", diff: "噩梦" },
  { text: "通关末地不掉一滴血",   diff: "噩梦" },
  { text: "只用床打末影龙",       diff: "噩梦" },
  { text: "在和平难度速通末地",   diff: "噩梦" },
  { text: "100 天内速通末地",     diff: "噩梦" },
  { text: "用弓打死凋灵",         diff: "噩梦" },
  { text: "在深海不呼吸通关",     diff: "噩梦" },
  { text: "只用木剑打凋灵",       diff: "噩梦" },
];

// ============ MC 种子推荐（100 个） ============

const SEEDS = [
  { seed: "1",            desc: "经典种子，出生点旁边有村庄" },
  { seed: "1400",         desc: "出生点附近有两个村庄，适合开局" },
  { seed: "777",          desc: "出生点附近有两个村庄和一个要塞" },
  { seed: "555555",       desc: "出生点附近有 4 个村庄" },
  { seed: "10086",        desc: "中文社区经典种子，出生点旁边有村庄" },
  { seed: "12345",        desc: "出生点旁边就是雪原村庄" },
  { seed: "2025",         desc: "出生点旁边有村庄和掠夺者前哨站" },
  { seed: "-343522682",   desc: "出生点旁边就是村庄，还有废弃传送门" },
  { seed: "-1943522019",  desc: "出生点旁边是热带草原和村庄" },
  { seed: "-887553494",   desc: "附近有 6 个村庄和 2 个要塞" },
  { seed: "888888",       desc: "出生点旁边有两个村庄和一座要塞" },
  { seed: "5201314",      desc: "出生点旁边是村庄和樱花树林" },
  { seed: "0",            desc: "出生点旁边就是冰刺之地" },
  { seed: "42",           desc: "出生点旁边就是繁花森林" },
  { seed: "2024",         desc: "出生点旁边就是樱花树林" },
  { seed: "-578303778",   desc: "出生点旁边就是蘑菇岛" },
  { seed: "-772528963",   desc: "出生点附近有蘑菇岛和海底神殿" },
  { seed: "123123",       desc: "出生点附近有繁茂洞穴" },
  { seed: "233333",       desc: "出生点附近有竹林和熊猫" },
  { seed: "555",          desc: "出生点旁边是冰原和雪屋" },
  { seed: "1024",         desc: "出生点旁边是白桦森林" },
  { seed: "31415",        desc: "出生点旁边是黑森林" },
  { seed: "-1024",        desc: "出生点旁边是恶地" },
  { seed: "-2048",        desc: "出生点旁边是蘑菇岛和丛林" },
  { seed: "999",          desc: "出生点旁边就是掠夺者前哨站" },
  { seed: "-1158469226",  desc: "出生点旁边就是远古城市" },
  { seed: "-888",         desc: "出生点旁边就是废弃矿井" },
  { seed: "66666",        desc: "出生点附近有丛林神庙" },
  { seed: "-505050",      desc: "出生点旁边是沙漠村庄和沙漠神殿" },
  { seed: "-789",         desc: "出生点旁边就是海底神殿" },
  { seed: "31415926",     desc: "出生点附近有远古城市和要塞" },
  { seed: "1234567890",   desc: "出生点附近有樱花树林和村庄" },
  { seed: "666",          desc: "出生点旁边是丛林神庙和废弃矿井" },
  { seed: "-666",         desc: "出生点旁边是沙漠神殿和掠夺者前哨站" },
  { seed: "888",          desc: "出生点旁边是雪屋和要塞" },
  { seed: "-999",         desc: "出生点旁边是远古城市和繁茂洞穴" },
  { seed: "111111",       desc: "出生点附近有 3 座废弃传送门" },
  { seed: "222222",       desc: "出生点附近有 5 座海底神殿" },
  { seed: "333333",       desc: "出生点附近有 2 座远古城市" },
  { seed: "444444",       desc: "出生点附近有 4 座丛林神庙" },
  { seed: "-3141592",     desc: "出生点旁边是繁花森林和蘑菇岛相邻" },
  { seed: "3141592",      desc: "出生点附近有 10 个村庄" },
  { seed: "1618033",      desc: "出生点旁边是樱花树林和竹林" },
  { seed: "-1618033",     desc: "出生点旁边是冰刺之地和蘑菇岛" },
  { seed: "2718281",      desc: "出生点附近有 3 座末地传送门" },
  { seed: "-2718281",     desc: "出生点旁边是恶地和繁茂洞穴" },
  { seed: "1451414",      desc: "出生点附近有 4 座要塞" },
  { seed: "-1451414",     desc: "出生点旁边是蘑菇岛和村庄" },
  { seed: "1732050",      desc: "出生点旁边是雪原村庄和雪屋" },
  { seed: "-1732050",     desc: "出生点旁边是热带草原和村庄" },
  { seed: "2236067",      desc: "出生点附近有 2 座林地府邸" },
  { seed: "-2236067",     desc: "出生点旁边是繁花森林和樱花树林" },
  { seed: "666666",       desc: "中文玩家最爱的种子之一，村庄+要塞" },
  { seed: "88888888",     desc: "出生点旁边是村庄和远古城市" },
  { seed: "123456789",    desc: "数字顺序种子，出生点有村庄" },
  { seed: "987654321",    desc: "数字倒序种子，出生点有要塞" },
  { seed: "woaini",       desc: "拼音种子，出生点旁边是樱花树林" },
  { seed: "minecraft",    desc: "官方经典种子，出生点旁边有村庄" },
  { seed: "mojang",       desc: "开发商彩蛋种子" },
  { seed: "notch",        desc: "Notch 彩蛋种子" },
  { seed: "herobrine",    desc: "Herobrine 传说种子，出生点有诡异地形" },
  { seed: "pcl",          desc: "PCL 启动器彩蛋种子" },
  { seed: "mcbbs",        desc: "MCBBS 彩蛋种子" },
  { seed: "klpbbs",       desc: "苦力怕论坛彩蛋种子" },
  { seed: "-999999999",   desc: "出生点旁边是超大蘑菇岛" },
  { seed: "999999999",    desc: "出生点旁边是超大冰刺之地" },
  { seed: "-1000000000",  desc: "出生点旁边是超大面积繁花森林" },
  { seed: "1000000000",   desc: "出生点旁边是超大恶地" },
  { seed: "-2147483648",  desc: "最小整数种子，出生点地形极端" },
  { seed: "2147483647",   desc: "最大整数种子，出生点地形极端" },
  { seed: "-42",          desc: "负数 42，出生点旁边是冰原村庄" },
  { seed: "233",          desc: "出生点旁边是村庄和废弃传送门" },
  { seed: "-233",         desc: "出生点旁边是蘑菇岛和远古城市" },
  { seed: "520",          desc: "出生点旁边是樱花树林和村庄" },
  { seed: "-520",         desc: "出生点旁边是竹林和熊猫" },
  { seed: "1314",         desc: "出生点旁边有两个村庄和一个要塞" },
  { seed: "-1314",        desc: "出生点旁边是恶地和繁茂洞穴" },
  { seed: "7788",         desc: "出生点旁边是雪原和雪屋" },
  { seed: "-7788",        desc: "出生点旁边是丛林和丛林神庙" },
  { seed: "9090",         desc: "出生点旁边是沙漠村庄和沙漠神殿" },
  { seed: "-9090",        desc: "出生点旁边是热带草原和村庄" },
  { seed: "1212",         desc: "出生点旁边是白桦森林和村庄" },
  { seed: "-1212",        desc: "出生点旁边是黑森林和林地府邸" },
  { seed: "3456",         desc: "出生点旁边是海底神殿和海洋" },
  { seed: "-3456",        desc: "出生点旁边是蘑菇岛和海底神殿" },
  { seed: "7890",         desc: "出生点旁边是掠夺者前哨站和村庄" },
  { seed: "-7890",        desc: "出生点旁边是远古城市和废弃矿井" },
  { seed: "2468",         desc: "出生点旁边是樱花树林和竹林" },
  { seed: "-2468",        desc: "出生点旁边是冰刺之地和雪屋" },
  { seed: "1357",         desc: "出生点旁边是繁花森林和蘑菇岛" },
  { seed: "-1357",        desc: "出生点旁边是远古城市和要塞" },
  { seed: "112233",       desc: "出生点旁边是村庄和要塞" },
  { seed: "-112233",      desc: "出生点旁边是丛林神庙和竹林" },
  { seed: "445566",       desc: "出生点旁边是雪原村庄和雪屋" },
  { seed: "-445566",      desc: "出生点旁边是沙漠村庄和沙漠神殿" },
  { seed: "778899",       desc: "出生点旁边是樱花树林和村庄" },
  { seed: "-778899",      desc: "出生点旁边是远古城市和繁茂洞穴" },
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

// ============ 兜底页面 ============

function buildFallbackXaml(title, message, eta) {
  const showLoading = title === '服务器正在更新';
  // 简单场景（如访问被拒绝）：仅提示 + 刷新按钮
  if (!showLoading) {
    return '<StackPanel>' +
      '<local:MyCard Title="' + title + '" Margin="0,0,0,15">' +
      '<StackPanel Margin="25,40,23,20">' +
      '<local:MyHint Theme="Yellow" Text="' + message + '" />' +
      '<local:MyIconTextButton Margin="0,16,0,0" Height="40" Text="刷新页面" LogoScale="0.9" ColorType="Highlight" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />' +
      '</StackPanel>' +
      '</local:MyCard>' +
      '</StackPanel>';
  }

  // ===== 服务器正在更新：精致加载页 =====
  // 状态提示文案（居中、可换行）
  const statusText = '短暂的等待，是为了之后更长久的顺畅，感谢您的耐心。';
  const statusLine =
    '<TextBlock Text="' + statusText + '" FontSize="15" Foreground="{DynamicResource ColorBrush3}" TextAlignment="Center" TextWrapping="Wrap" MaxWidth="440" HorizontalAlignment="Center" LineHeight="26" Margin="0,18,0,0"/>';

  // 旋转加载圈（参考 PCL 动画语法）
  const spinner =
    '<Grid Width="64" Height="64" HorizontalAlignment="Center">' +
    '<Ellipse Width="64" Height="64" Stroke="#22000000" StrokeThickness="5"/>' +
    '<Ellipse Width="64" Height="64" Stroke="#FF4C8DFF" StrokeThickness="5" StrokeDashArray="1.4,100" StrokeDashCap="Round" RenderTransformOrigin="0.5,0.5">' +
    '<Ellipse.RenderTransform><RotateTransform x:Name="spin" Angle="0"/></Ellipse.RenderTransform>' +
    '<Ellipse.Triggers><EventTrigger RoutedEvent="Ellipse.Loaded"><BeginStoryboard><Storyboard RepeatBehavior="Forever">' +
    '<DoubleAnimation Storyboard.TargetName="spin" Storyboard.TargetProperty="Angle" From="0" To="360" Duration="0:0:1.1"/>' +
    '</Storyboard></BeginStoryboard></EventTrigger></Ellipse.Triggers>' +
    '</Ellipse>' +
    '</Grid>';

  let etaLine = '';
  if (eta && eta !== '0') {
    etaLine = '<TextBlock Text="预计 ' + eta + ' 更新完成" FontSize="14" Foreground="{DynamicResource ColorBrush3}" TextAlignment="Center" HorizontalAlignment="Center" Margin="0,16,0,0"/>';
  }

  return '<StackPanel>' +
    '    <local:MyCard Title="" Margin="0,0,0,15">' +
    '        <StackPanel Margin="30,42,30,34">' +
    spinner +
    '            <TextBlock Text="服务器正在更新" FontSize="20" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" TextAlignment="Center" HorizontalAlignment="Center" Margin="0,20,0,0"/>' +
    statusLine +
    etaLine +
    '            <local:MyIconTextButton Margin="0,24,0,0" Height="40" HorizontalAlignment="Center" Text="刷新页面" LogoScale="0.9" ColorType="Highlight" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />' +
    '            <local:MyHint Theme="Yellow" Margin="0,18,0,0" Text="' + message + '" />' +
    '            <local:MyHint Theme="Blue" Margin="0,10,0,0" Text="如果一直看到这个页面，请去 GitHub 提 Issue。" />' +
    '        </StackPanel>' +
    '    </local:MyCard>' +
    '</StackPanel>';
}

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

function escapeXaml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
// ============ 节日与纪念日 ============
const FESTIVALS = [
  { month: 1,  day: 1,  name: "元旦",                    msg: "新的一年，新的冒险开始啦！" },
  { month: 2,  day: 14, name: "情人节",                  msg: "带上你最好的冒险伙伴，一起去探索吧！" },
  { month: 3,  day: 8,  name: "妇女节",                  msg: "致敬每一位了不起的她！" },
  { month: 4,  day: 1,  name: "愚人节",                  msg: "愚人节快乐！小心脚下的坑~" },
  { month: 5,  day: 1,  name: "劳动节",                  msg: "劳动最光荣，今天也辛苦啦！" },
  { month: 5,  day: 17, name: "Minecraft 生日",          msg: "Minecraft 生日快乐！一起来庆祝吧！" },
  { month: 6,  day: 1,  name: "儿童节",                  msg: "永远保持一颗童心，六一快乐！" },
  { month: 10, day: 31, name: "万圣节",                  msg: "不给糖就捣蛋！小心苦力怕的惊喜~" },
  { month: 11, day: 18, name: "Minecraft 1.0 发布纪念日", msg: "2011 年的今天，Minecraft 1.0 正式发布！" },
  { month: 12, day: 24, name: "平安夜",                  msg: "平安夜快乐，愿你的夜晚没有苦力怕！" },
  { month: 12, day: 25, name: "圣诞节",                  msg: "圣诞快乐！别忘了给村民准备礼物~" },
  { month: 12, day: 31, name: "跨年夜",                  msg: "今年最后一晚，明年继续挖矿！" },
];
function getFestival(date) {
  const solar = FESTIVALS.find((f) => f.month === date.month && f.day === date.day);
  if (solar) return solar;
  const lun = solar2lunar(date.year, date.month, date.day);
  return LUNAR_FESTIVALS.find((f) => f.lm === lun.m && f.ld === lun.d) || null;
}
function buildFestivalBanner(festival) {
  if (!festival) return "";
  const text = escapeXaml("今天是 " + festival.name + "！" + festival.msg);
  return '<local:MyHint Theme="Red" Margin="0,0,0,14" Text="' + text + '" />';
}

// ============ 实时天气（IP 定位 + 天气） ============
const WCODE = {
  0: "晴", 1: "基本晴朗", 2: "少云", 3: "多云", 45: "雾", 48: "雾凇",
  51: "毛毛雨", 53: "毛毛雨", 55: "毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨",
  71: "小雪", 73: "中雪", 75: "大雪", 80: "阵雨", 81: "强阵雨", 82: "暴雨",
  95: "雷雨", 96: "雷雨伴冰雹", 99: "雷暴冰雹",
};
function buildWeatherUnavailable() {
  return '<local:MyHint Theme="Yellow" Margin="0,0,0,0" Text="天气获取失败，请稍后刷新重试。" />';
}
function buildWeatherXaml(city, temp, desc, wind, isDay, source) {
  const icon = isDay
    ? "pack://application:,,,/images/Blocks/Grass.png"
    : "pack://application:,,,/images/Blocks/RedstoneBlock.png";
  const tip = temp >= 30 ? "注意防暑" : temp <= 0 ? "注意保暖" : (wind >= 40 ? "风有点大" : "适合出门挖矿");
  return '<Border CornerRadius="10" Padding="16,14" Margin="0,0,0,10" Background="{DynamicResource ColorBrush7}">'
    + '<StackPanel>'
    + '<StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,8">'
    + '<local:MyImage Width="18" Height="18" Margin="0,0,8,0" VerticalAlignment="Center" Source="' + icon + '" />'
    + '<TextBlock Text="' + escapeXaml(city) + ' · 当前天气" FontSize="11" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />'
    + '</StackPanel>'
    + '<StackPanel Orientation="Horizontal" HorizontalAlignment="Center">'
    + '<TextBlock Text="' + temp + '°" FontSize="40" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />'
    + '<TextBlock Text="' + escapeXaml(desc) + '" FontSize="16" VerticalAlignment="Bottom" Foreground="{DynamicResource ColorBrush3}" Margin="8,0,0,8" />'
    + '</StackPanel>'
    + '<TextBlock Text="风力 ' + wind + ' km/h · ' + escapeXaml(tip) + '" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,8,0,0" />'
    + '</StackPanel>'
    + '</Border>'
    + '<local:MyHint Theme="Blue" Margin="0,0,0,0" Text="' + (source || "天气数据来自中国气象局") + '" />';
}
// 接口盒子 IP 天气 API：按访问者 IP 一步完成定位+天气（数据源中国气象局），免费无日调用上限
// 凭据从 Cloudflare Pages 环境变量 APIHZ_ID / APIHZ_KEY 读取，避免在公开仓库暴露
async function fetchApihzWeather(env, ip) {
  try {
    const clean = String(ip || "").replace(/:\d+$/, "");
    if (!clean || clean === "unknown") return null;
    const id = (env && env.APIHZ_ID) || "";
    const key = (env && env.APIHZ_KEY) || "";
    if (!id || !key) return null; // 未配置环境变量 → 走 Open-Meteo 兜底
    // 按 IP + 天气版本号缓存 1 小时（KV 到点自动过期清除，防止占用；版本号用于在线"重置天气缓存"）
    let weatherVer = "0";
    try { weatherVer = (await env.HOMEPAGE_KV.get('weather_version')) || "0"; } catch (e) {}
    const cacheKey = "weather:" + weatherVer + ":" + clean;
    if (env && env.HOMEPAGE_KV) {
      const cached = await env.HOMEPAGE_KV.get(cacheKey);
      if (cached) return cached;
    }
    const url = "https://cn.apihz.cn/api/tianqi/tqybip.php?id=" + encodeURIComponent(id)
      + "&key=" + encodeURIComponent(key) + "&ip=" + encodeURIComponent(clean);
    const r = await fetch(url, { headers: { "User-Agent": "PCL-Homepage" } });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.code !== 200 || !j.nowinfo) return null;
    const temp = Math.round(j.nowinfo.temperature);
    const wind = Math.round((j.nowinfo.windSpeed || 0) * 3.6); // 接口盒子风速为 m/s，转 km/h 与卡片文案一致
    const desc = (j.weather1 && j.weather2 && j.weather1 !== j.weather2)
      ? (j.weather1 + "转" + j.weather2) : (j.weather1 || "未知");
    const xaml = buildWeatherXaml(j.name || j.shi || "未知地区", temp, desc, wind, true, "天气数据来自中国气象局。");
    if (env && env.HOMEPAGE_KV) {
      try { await env.HOMEPAGE_KV.put(cacheKey, xaml, { expirationTtl: 3600 }); } catch (e) { /* 缓存失败忽略 */ }
    }
    return xaml;
  } catch (e) {
    console.error("[Weather] 接口盒子失败：", e);
    return null;
  }
}
// 定位：优先 ipwho.is（对国内 IP 更细、返回威海等城市，https 免费），失败重试后降级 ip-api.com
async function fetchGeo(ip) {
  const clean = String(ip || "").replace(/:\d+$/, "");
  const q = (clean && clean !== "unknown") ? "/" + encodeURIComponent(clean) : "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("https://ipwho.is/" + q);
      if (r.ok) {
        const j = await r.json();
        if (j && j.success !== false && j.latitude != null) {
          return { city: j.city || j.region || "未知地区", lat: j.latitude, lon: j.longitude };
        }
      }
    } catch (e) { /* 重试 */ }
  }
  try {
    const r = await fetch("http://ip-api.com/json/" + encodeURIComponent(clean) + "?lang=zh-CN");
    if (r.ok) {
      const j = await r.json();
      if (j && j.status === "success") {
        return { city: j.city || j.regionName || "未知地区", lat: j.lat, lon: j.lon };
      }
    }
  } catch (e) { /* 忽略 */ }
  return null;
}
async function fetchWeather(env, ip) {
  // 优先：接口盒子 IP 天气（按访问者 IP 通用定位，数据源中国气象局）
  const apihz = await fetchApihzWeather(env, ip);
  if (apihz) return apihz;
  // 降级：Open-Meteo（按 IP 定位经纬度取天气）
  try {
    const geo = await fetchGeo(ip);
    if (!geo) return buildWeatherUnavailable();
    const wUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + geo.lat + "&longitude=" + geo.lon
      + "&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto";
    const wRes = await fetch(wUrl, { headers: { "User-Agent": "PCL-Homepage" } });
    if (!wRes.ok) return buildWeatherUnavailable();
    const w = await wRes.json();
    const cw = (w && w.current) || {};
    const temp = Math.round(cw.temperature_2m);
    const wind = Math.round(cw.wind_speed_10m);
    const desc = WCODE[cw.weather_code] || "未知";
    const isDay = cw.is_day;
    return buildWeatherXaml(geo.city, temp, desc, wind, isDay, "天气数据来自 Open-Meteo。");
  } catch (e) {
    console.error("[Weather] 获取天气失败：", e);
    return buildWeatherUnavailable();
  }
}

// ============ 节日/纪念日倒计时 ============
// 农历算法（1900-2100 内嵌数据表，用于计算春节/中秋/端午等农历节日公历日期）
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520];
function lunarLeapMonth(y){ return LUNAR_INFO[y - 1900] & 0xf; }
function lunarLeapDays(y){ return lunarLeapMonth(y) ? ((LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; }
function lunarMonthDays(y, m){ return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
function lunarYearDays(y){
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
  return sum + lunarLeapDays(y);
}
// 农历 y年m月d日（非闰）→ 公历 {y, m, d}
function lunarToSolar(y, m, d){
  let offset = 0;
  for (let i = 1900; i < y; i++) offset += lunarYearDays(i);
  const leap = lunarLeapMonth(y);
  let isAdd = false;
  for (let i = 1; i < m; i++){
    if (!isAdd && leap > 0 && leap <= i){ offset += lunarLeapDays(y); isAdd = true; }
    offset += lunarMonthDays(y, i);
  }
  const cal = new Date((offset + d - 31) * 86400000 + Date.UTC(1900, 1, 30));
  return { y: cal.getUTCFullYear(), m: cal.getUTCMonth() + 1, d: cal.getUTCDate() };
}
// 公历 → 农历 {y, m, d}
function solar2lunar(y, m, d){
  let objDate = new Date(y, m - 1, d);
  y = objDate.getFullYear(); m = objDate.getMonth() + 1; d = objDate.getDate();
  let offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
  let i, temp;
  for (i = 1900; i < 2101 && offset > 0; i++){ temp = lunarYearDays(i); offset -= temp; }
  if (offset < 0){ offset += temp; i--; }
  const year = i;
  const leap = lunarLeapMonth(year);
  let isLeap = false;
  for (i = 1; i < 13 && offset > 0; i++){
    if (leap > 0 && i === (leap + 1) && !isLeap){ --i; isLeap = true; temp = lunarLeapDays(year); }
    else temp = lunarMonthDays(year, i);
    if (isLeap && i === (leap + 1)) isLeap = false;
    offset -= temp;
  }
  if (offset === 0 && leap > 0 && i === leap + 1){ if (isLeap) isLeap = false; else { isLeap = true; --i; } }
  if (offset < 0){ offset += temp; --i; }
  return { y: year, m: i, d: offset + 1 };
}
// 农历节日（农历月/日）
const LUNAR_FESTIVALS = [
  { lm: 1,  ld: 1,  name: "春节",   msg: "新年快乐，万事如意！" },
  { lm: 1,  ld: 15, name: "元宵节", msg: "元宵节快乐，花好月圆！" },
  { lm: 5,  ld: 5,  name: "端午节", msg: "端午安康，吃粽子了吗？" },
  { lm: 7,  ld: 7,  name: "七夕节", msg: "七夕快乐，牛郎织女来相会！" },
  { lm: 8,  ld: 15, name: "中秋节", msg: "中秋快乐，月圆人团圆！" },
  { lm: 9,  ld: 9,  name: "重阳节", msg: "重阳安康，登高望远！" },
  { lm: 12, ld: 8,  name: "腊八节", msg: "腊八节快乐，喝碗热粥吧！" },
];
function buildCountdownXaml(date) {
  const today = Date.UTC(date.year, date.month - 1, date.day);
  const events = FESTIVALS.map((f) => ({ name: f.name, month: f.month, day: f.day }));
  for (const y of [date.year, date.year + 1]) {
    for (const f of LUNAR_FESTIVALS) {
      const s = lunarToSolar(y, f.lm, f.ld);
      if (s.y >= date.year && s.y <= date.year + 1) events.push({ name: f.name, month: s.m, day: s.d });
    }
  }
  let best = null;
  for (const e of events) {
    let y = date.year;
    if (Date.UTC(y, e.month - 1, e.day) < today) y += 1;
    const diff = Math.round((Date.UTC(y, e.month - 1, e.day) - today) / 86400000);
    if (!best || diff < best.diff) best = { name: e.name, diff, month: e.month, day: e.day };
  }
  if (!best) return "";
  const line = best.diff === 0
    ? "今天就是 " + escapeXaml(best.name) + "！"
    : escapeXaml(best.name) + " · 还有 " + best.diff + " 天";
  return '<Border HorizontalAlignment="Right" VerticalAlignment="Top" Margin="0,16,18,0" Background="#59000000" CornerRadius="12" Padding="12,8,12,8">'
    + '<TextBlock Text="' + line + '" FontSize="12" FontWeight="Bold" Foreground="White" />'
    + '</Border>';
}

// ============ 随机挑战渐变背景（按难度配色） ============
function buildChallengeBg(diff) {
  const d = diff || "";
  let c;
  if (/困难|地狱/.test(d)) c = ["#B71C1C", "#F57C00"];
  else if (/专家/.test(d)) c = ["#5E35B1", "#D81B60"];
  else if (/简单/.test(d)) c = ["#1B6B3A", "#66BB6A"];
  else c = ["#1565C0", "#42A5F5"];
  return '<LinearGradientBrush StartPoint="0,0" EndPoint="1,1">'
    + '<GradientStop Color="' + c[0] + '" Offset="0" />'
    + '<GradientStop Color="' + c[1] + '" Offset="1" />'
    + '</LinearGradientBrush>';
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
    // 封禁 IP 检查：命中管理员封禁列表则拒绝访问
    const reqIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (reqIp && reqIp !== 'unknown') {
      try {
        const blockList = JSON.parse((await env.HOMEPAGE_KV.get('block:list')) || '{}');
        if (blockList[reqIp]) {
          return new Response(buildFallbackXaml('访问被拒绝', '你的 IP 已被管理员禁止访问本主页。'), {
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            },
          });
        }
      } catch (e) { /* 封禁列表读取失败则放行 */ }
    }
    // 服务器更新/维护模式模拟：后台开启后主页返回"服务器正在更新"兜底页（用于测试故障效果）
    try {
      const maint = await env.HOMEPAGE_KV.get('maint_mode');
      if (maint && maint !== '0') {
        const maintEta = (await env.HOMEPAGE_KV.get('maint_eta')) || '';
        return new Response(buildFallbackXaml('服务器正在更新', '服务器正在更新中，请稍后刷新重试。', maintEta), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
        });
      }
    } catch (e) { /* 维护模式读取失败则忽略 */ }
    const assetUrl = new URL('/Custom.xaml', url.origin);

    let response;
    try {
      response = await env.ASSETS.fetch(assetUrl);
    } catch (e) {
      console.error('[Middleware] 获取静态资源失败：', e);
      return new Response(buildFallbackXaml('服务器正在更新', '服务器正在更新中，请稍后刷新重试。'), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      });
    }

    if (!response.ok) {
      console.error('[Middleware] 静态资源返回错误：', response.status);
      return new Response(buildFallbackXaml('服务器正在更新', '服务器正在更新中，请稍后刷新重试。'), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      });
    }

    let xaml;
    try {
      xaml = await response.text();
    } catch (e) {
      console.error('[Middleware] 读取响应文本失败：', e);
      return new Response(buildFallbackXaml('服务器正在更新', '服务器正在更新中，请稍后刷新重试。'), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      });
    }

    if (!xaml || xaml.trim().length < 50) {
      console.error('[Middleware] 主页内容为空或过短');
      return new Response(buildFallbackXaml('服务器正在更新', '服务器正在更新中，请稍后刷新重试。'), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      });
    }

    // ===== 以下整段组装与替换：任何未预期异常都兜底为"服务器正在更新"，避免 PCL 白屏 =====
    try {
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

    const fortuneGoodIdx = deterministicIndex(ip, today, "fortune_good", FORTUNE_GOOD.length);
    const fortuneBadIdx = deterministicIndex(ip, today, "fortune_bad", FORTUNE_BAD.length);
    const fortuneTipIdx = deterministicIndex(ip, today, "fortune_tip", FORTUNE_TIPS.length);
    const fortuneGood = FORTUNE_GOOD[fortuneGoodIdx];
    const fortuneBad = FORTUNE_BAD[fortuneBadIdx];
    const fortuneTip = FORTUNE_TIPS[fortuneTipIdx];

    const challenge = pickRandom(CHALLENGES);

    const seedIdx = deterministicIndex(ip, today, "seed", SEEDS.length);
    const seed = SEEDS[seedIdx];

    const quizIdx = deterministicIndex(ip, today, "quiz", QUIZ.length);
    const quiz = QUIZ[quizIdx];

    // ========== 访问统计：写入 KV，不生成 XAML ==========
    try {
      // 总计
      const totalKey = "visit:total";
      let total = parseInt(await env.HOMEPAGE_KV.get(totalKey) || "0", 10);
      total += 1;
      await env.HOMEPAGE_KV.put(totalKey, String(total));

      // 每 IP 次数 + 国家码
      const ipMapKey = "visit:ipmap";
      let ipMap = {};
      try {
        ipMap = JSON.parse(await env.HOMEPAGE_KV.get(ipMapKey) || "{}");
      } catch { ipMap = {}; }

      // 取国家码（Cloudflare 代理下才有值，本地 dev 为 XX）
      const country = (request.cf && request.cf.country) || "XX";

      // 兼容旧格式：数字 或 对象
      const oldVal = ipMap[ip];
      const oldCount = typeof oldVal === "number"
        ? oldVal
        : Number(oldVal && (oldVal.c ?? oldVal.count)) || 0;
      const oldCc = (typeof oldVal === "object" && oldVal)
        ? (oldVal.cc || oldVal.country || (oldVal.cf && oldVal.cf.country))
        : null;

      // 写入新格式 { c, cc, t }（t 为最后访问时间戳）
      ipMap[ip] = {
        c: oldCount + 1,
        cc: oldCc || country,
        t: Date.now(),
      };

      // 排序要按 c 排，不能再按数字排
      const entries = Object.entries(ipMap).sort((a, b) => {
        const ac = typeof a[1] === "number" ? a[1] : Number(a[1].c) || 0;
        const bc = typeof b[1] === "number" ? b[1] : Number(b[1].c) || 0;
        return bc - ac;
      });
      if (entries.length > 500) ipMap = Object.fromEntries(entries.slice(0, 500));
      await env.HOMEPAGE_KV.put(ipMapKey, JSON.stringify(ipMap));

      // 今日（去重）
      const todayKey = "visit:today:" + today;
      let todaySet = [];
      try {
        todaySet = JSON.parse(await env.HOMEPAGE_KV.get(todayKey) || "[]");
      } catch { todaySet = []; }
      if (!todaySet.includes(ip)) {
        todaySet.push(ip);
        if (todaySet.length > 2000) todaySet = todaySet.slice(-2000);
        await env.HOMEPAGE_KV.put(todayKey, JSON.stringify(todaySet), { expirationTtl: 2592000 });
      }
    } catch (e) {
      console.error("[Visit] 统计失败：", e);
    }

    // ========== 节日与纪念日 ==========
    const festival = getFestival(date);
    const festivalBanner = buildFestivalBanner(festival);
    const countdownBody = buildCountdownXaml(date);
    const challengeBg = buildChallengeBg(challenge.diff);
    const weatherBody = await fetchWeather(env, ip);

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
      // 兼容注释包裹形式（<!-- __SCORE_BAR__ -->）与历史裸占位符
      .replace(/<!--\s*__SCORE_BAR__\s*-->|__SCORE_BAR__/g, scoreBar)
      .replace(/__FORTUNE_GOOD__/g, fortuneGood)
      .replace(/__FORTUNE_BAD__/g, fortuneBad)
      .replace(/__FORTUNE_TIP__/g, fortuneTip)
      .replace(/__CHALLENGE__/g, challenge.text)
      .replace(/__CHALLENGE_DIFF__/g, challenge.diff)
      .replace(/__SEED__/g, seed.seed)
      .replace(/__SEED_DESC__/g, seed.desc)
      .replace(/__QUIZ_Q__/g, quiz.q)
      .replace(/__QUIZ_A__/g, quiz.a)
      .replace(/<!--\s*__FESTIVAL_BANNER__\s*-->|__FESTIVAL_BANNER__/g, festivalBanner)
      .replace(/<!--\s*__WEATHER_BODY__\s*-->|__WEATHER_BODY__/g, weatherBody)
      .replace(/<!--\s*__COUNTDOWN_BODY__\s*-->|__COUNTDOWN_BODY__/g, countdownBody)
      .replace(/<!--\s*__CHALLENGE_BG__\s*-->|__CHALLENGE_BG__/g, challengeBg);

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
    } catch (e) {
      console.error('[Middleware] 主页组装失败，已返回"服务器正在更新"占位：', e);
      return new Response(buildFallbackXaml('服务器正在更新', '服务器正在更新中，请稍后刷新重试。'), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      });
    }
  }

  return context.next();
}
