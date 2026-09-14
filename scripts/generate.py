# -*- coding: utf-8 -*-
"""
PCL 主页生成脚本
由 GitHub Actions 每天定时运行，生成带动态数据的 Custom.xaml。
幸运数字、彩蛋、每日一言由 Cloudflare Functions 每次请求动态替换。
幸运颜色、人品分数由 Python 每天随机一次。
版本封面图从 Minecraft Wiki 抓取。
"""

import random
import time
import requests
from datetime import datetime
from pathlib import Path

# ============ 配置 ============

VERSION_API = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
WIKI_API = "https://zh.minecraft.wiki/api.php"

REQUEST_TIMEOUT = 30
MAX_RETRIES = 3

BASE_URL = "https://www.mkejga.de5.net"
IMAGES_DIR_NAME = "images"

VERSION_IMAGE_CACHE_DAYS = 7
KEEP_FILES = ["version.png"]

HEADERS = {
    "User-Agent": "PCL-Homepage/1.0 (https://github.com/wlasfjdskfj/pcl-homepage)",
}

# ============ 静态数据源 ============

QUOTES = [
    "今天也要好好挖矿。",
    "苦力怕从不敲门，但会给你惊喜。",
    "钻石在 Y=-59，别挖太深。",
    "别在岩浆边挖矿，除非你想重生。",
    "末影人不会主动攻击你，除非你盯着它看。",
    "下界合金比钻石更耐用，但更难找。",
    "睡觉可以跳过夜晚，但会让你失去刷怪的机会。",
    "村民交易可以打折，只要你治好了僵尸村民。",
    "附魔台周围放 15 个书架可以升到 30 级。",
    "信标需要金字塔底座，底座越大效果越强。",
]

# 幸运颜色库（每天从里面随机选一个）
LUCKY_COLORS = [
    {"name": "钻石蓝",     "hex": "#4AEDD9"},
    {"name": "红石红",     "hex": "#FF5555"},
    {"name": "金锭黄",     "hex": "#FFAA00"},
    {"name": "绿宝石绿",   "hex": "#17DD62"},
    {"name": "青金石蓝",   "hex": "#2A4DD0"},
    {"name": "紫水晶紫",   "hex": "#A64DFF"},
    {"name": "下界石英白", "hex": "#E0E0E0"},
    {"name": "岩浆橙",     "hex": "#FF7722"},
    {"name": "凋灵黑",     "hex": "#3C3C3C"},
    {"name": "末影紫",     "hex": "#8E44FF"},
]


# ============ 版本信息获取 ============

def fetch_latest_version():
    default = {
        "release": "1.21",
        "snapshot": "",
        "release_date": "",
        "snapshot_date": "",
        "server_url": "https://www.minecraft.net/zh-hans/download/server",
        "wiki_url": "https://zh.minecraft.wiki/",
        "changelog_url": "https://www.minecraft.net/zh-hans/download",
    }

    try:
        resp = requests.get(VERSION_API, timeout=REQUEST_TIMEOUT, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()

        latest = data.get("latest", {})
        default["release"] = latest.get("release", default["release"])
        default["snapshot"] = latest.get("snapshot", "")

        versions = data.get("versions", [])
        for v in versions:
            vid = v.get("id", "")
            rt = v.get("releaseTime", "")[:10]
            if vid == default["release"]:
                default["release_date"] = rt
            if vid == default["snapshot"]:
                default["snapshot_date"] = rt

        print("[Version] 正式版：" + default["release"] + "，快照版：" + default["snapshot"])
        return default

    except Exception as e:
        print("[Version] 请求失败：" + str(e) + "，使用默认数据。")
        return default


# ============ Wiki 版本封面图获取 ============

def pick_version_image(images, version):
    """优先级：精确文件名 > 含完整版本号 > 含主版本号 > 其他。"""
    base_version = version
    for suffix in ["-rc-1", "-rc-2", "-rc-3", "-rc-4", "-rc-5",
                   "-pre1", "-pre2", "-pre3", "-pre4", "-pre5",
                   "-pre6", "-pre7", "-pre8", "-pre9"]:
        if base_version.endswith(suffix):
            base_version = base_version[:-len(suffix)]
            break

    exact_names = [
        version + ".jpg",
        version + ".png",
        version + ".gif",
        version.replace("-", "_") + ".jpg",
        version.replace("-", "_") + ".png",
    ]

    priority_exact = []
    priority_version = []
    priority_base = []
    priority_other = []

    for img in images:
        t = img.get("title", "")
        if not t.lower().endswith((".png", ".jpg", ".gif")):
            continue
        if "Sprite" in t or "Disambig" in t or "Logo" in t or "Icon" in t:
            continue

        file_name = t.replace("File:", "")

        if file_name in exact_names:
            priority_exact.append(t)
        elif version in t:
            priority_version.append(t)
        elif base_version in t:
            priority_base.append(t)
        else:
            priority_other.append(t)

    if priority_exact:
        return priority_exact[0]
    if priority_version:
        return priority_version[0]
    if priority_base:
        return priority_base[0]
    if priority_other:
        return priority_other[0]
    return None


def fetch_version_image(version, filename="version.png"):
    """从 Minecraft Wiki 抓取版本封面图，带缓存天数检查。"""
    images_dir = Path(__file__).resolve().parent.parent / IMAGES_DIR_NAME
    images_dir.mkdir(exist_ok=True)
    local_path = images_dir / filename
    marker = images_dir / (filename + ".version")

    if local_path.exists() and marker.exists():
        try:
            file_age_days = (time.time() - local_path.stat().st_mtime) / 86400
            cached_version = marker.read_text(encoding="utf-8").strip()
            if cached_version == version and file_age_days < VERSION_IMAGE_CACHE_DAYS:
                print("[Version-Image] 图片已存在，版本一致，年龄 " + str(round(file_age_days, 1)) + " 天，跳过")
                return True
            elif cached_version == version:
                print("[Version-Image] 图片超过 " + str(VERSION_IMAGE_CACHE_DAYS) + " 天未更新，强制重下")
            else:
                print("[Version-Image] 版本号变更：" + cached_version + " → " + version + "，重新下载")
        except Exception:
            pass

    page_titles = []
    page_titles.append("Java版" + version)

    base_version = version
    for suffix in ["-rc-1", "-rc-2", "-rc-3", "-rc-4", "-rc-5",
                   "-pre1", "-pre2", "-pre3", "-pre4", "-pre5",
                   "-pre6", "-pre7", "-pre8", "-pre9"]:
        if base_version.endswith(suffix):
            base_version = base_version[:-len(suffix)]
            break
    if base_version != version:
        page_titles.append("Java版" + base_version)

    image_title = None
    used_title = None

    for page_title in page_titles:
        try:
            params = {
                "action": "query",
                "titles": page_title,
                "prop": "images",
                "format": "json",
            }
            resp = requests.get(WIKI_API, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            data = resp.json()

            pages = data.get("query", {}).get("pages", {})
            for page_id, page_info in pages.items():
                if "missing" in page_info:
                    print("[Version-Image] 页面不存在，尝试下一个：" + page_title)
                    continue
                images = page_info.get("images", [])
                print("[Version-Image] " + page_title + " 包含 " + str(len(images)) + " 张图片")
                for i, img in enumerate(images[:10]):
                    print("  " + str(i + 1) + ". " + img.get("title", ""))
                image_title = pick_version_image(images, version)
                if image_title:
                    used_title = page_title
                    break
            if image_title:
                break

        except Exception as e:
            print("[Version-Image] 请求 " + page_title + " 失败：" + str(e))
            continue

    if not image_title:
        print("[Version-Image] 未找到 " + version + " 的封面图")
        return False

    print("[Version-Image] 选中：" + used_title + " → " + image_title)

    try:
        params = {
            "action": "query",
            "titles": image_title,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": "400",
            "format": "json",
        }
        resp = requests.get(WIKI_API, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        pages = data.get("query", {}).get("pages", {})
        thumb_url = None
        for page_id, page_info in pages.items():
            info_list = page_info.get("imageinfo", [])
            if info_list:
                thumb_url = info_list[0].get("thumburl") or info_list[0].get("url")
                break

        if not thumb_url:
            print("[Version-Image] 未获取到 " + image_title + " 的 URL")
            return False

        img_headers = {
            "User-Agent": HEADERS["User-Agent"],
            "Referer": "https://zh.minecraft.wiki/",
        }

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                img_resp = requests.get(thumb_url, headers=img_headers, timeout=REQUEST_TIMEOUT)
                if img_resp.status_code != 200:
                    print("[Version-Image] 第 " + str(attempt) + " 次下载失败：" + str(img_resp.status_code))
                    if attempt < MAX_RETRIES:
                        time.sleep(3)
                        continue
                    return False

                with open(local_path, "wb") as f:
                    f.write(img_resp.content)

                marker.write_text(version, encoding="utf-8")

                print("[Version-Image] 已下载：" + filename + "（" + str(len(img_resp.content)) + " 字节）")
                return True

            except requests.exceptions.Timeout:
                print("[Version-Image] 第 " + str(attempt) + " 次超时")
                if attempt < MAX_RETRIES:
                    time.sleep(3)
                else:
                    return False

        return False

    except Exception as e:
        print("[Version-Image] 获取封面图失败：" + str(e))
        return False


def clean_old_images():
    """清理 images/ 目录里不在白名单内的图片。保留 version.png 及其 .version 标记。"""
    images_dir = Path(__file__).resolve().parent.parent / IMAGES_DIR_NAME
    if not images_dir.exists():
        return

    print("[Clean] 开始清理 images/ 目录")

    removed_count = 0
    for f in images_dir.iterdir():
        if not f.is_file():
            continue

        if f.name.endswith(".version"):
            print("[Clean] 保留标记文件：" + f.name)
            continue

        if f.suffix.lower() in (".png", ".jpg", ".gif") and f.name not in KEEP_FILES:
            try:
                f.unlink()
                print("[Clean] 删除无用图片：" + f.name)
                removed_count += 1
            except Exception as e:
                print("[Clean] 删除失败：" + f.name + "（" + str(e) + "）")

    if removed_count == 0:
        print("[Clean] 无需清理")
    else:
        print("[Clean] 共清理 " + str(removed_count) + " 个文件")


# ============ 指令分组数据 ============

CMD_GROUPS = [
    ("基础模式", [
        ("创造模式", "/gamemode creative", "/gamemode creative"),
        ("生存模式", "/gamemode survival", "/gamemode survival"),
        ("冒险模式", "/gamemode adventure", "/gamemode adventure"),
    ]),
    ("环境控制", [
        ("设为白天", "/time set day", "/time set day"),
        ("晴天", "/weather clear", "/weather clear"),
        ("清除效果", "/effect clear @s", "/effect clear @s"),
    ]),
    ("实用效果", [
        ("夜视", "/effect give @s night_vision 99999 1 true", "夜视 99999 秒"),
        ("抗性提升", "/effect give @s resistance 99999 4 true", "抗性提升 V 级 99999 秒"),
        ("急迫", "/effect give @s haste 99999 2 true", "急迫 III 级 99999 秒"),
    ]),
    ("物品获取", [
        ("鞘翅", "/give @s elytra", "/give @s elytra"),
        ("附魔金苹果", "/give @s enchanted_golden_apple 64", "一次给 64 个"),
        ("经验瓶", "/give @s experience_bottle 64", "一次给 64 个"),
    ]),
    ("玩家头颅 · 1.20.5+", [
        ("Notch 头颅", "/give @s player_head[profile={name:\"Notch\"}]", "1.20.5 及以后。把 Notch 换成目标玩家 ID"),
        ("自己的头颅", "/give @s player_head[profile={name:\"@s\"}]", "1.20.5 及以后。获取自己的头颅"),
        ("自定义头颅", "/give @s player_head[profile={name:\"Steve\"}]", "1.20.5 及以后。把 Steve 换成任意玩家 ID"),
    ]),
    ("玩家头颅 · 1.13-1.20.4", [
        ("Notch 头颅", "/give @s player_head{SkullOwner:\"Notch\"}", "1.13-1.20.4。把 Notch 换成目标玩家 ID"),
        ("自己的头颅", "/give @s player_head{SkullOwner:\"@s\"}", "1.13-1.20.4。获取自己的头颅"),
        ("自定义头颅", "/give @s player_head{SkullOwner:\"Steve\"}", "1.13-1.20.4。把 Steve 换成任意玩家 ID"),
    ]),
    ("传送定位", [
        ("传送到坐标", "/tp @s 0 64 0", "把 0 64 0 换成目标坐标"),
        ("设置重生点", "/spawnpoint @s ~ ~ ~", "把当前位置设为重生点"),
        ("回到出生点", "/tp @s 0 64 0", "回到世界出生点附近"),
    ]),
    ("世界规则", [
        ("关闭生物破坏", "/gamerule mobGriefing false", "禁止苦力怕、末影人破坏方块"),
        ("死亡不掉落", "/gamerule keepInventory true", "死亡后保留物品"),
        ("锁定白天", "/gamerule doDaylightCycle false", "时间不再流动"),
    ]),
]


# ============ XAML 生成 ============

def build_xaml():
    now = datetime.now()
    month = now.strftime("%m").lstrip("0") or "0"
    day = now.strftime("%d").lstrip("0") or "0"
    year = now.strftime("%Y")
    weekday = ["一", "二", "三", "四", "五", "六", "日"][now.weekday()]

    # 动态替换（Cloudflare Functions 每次请求随机）
    quote = "__QUOTE__"
    lucky_number = "__LUCKY_NUMBER__"
    egg_data = "__EGG_DATA__"

    # 每天随机一次（Python 端）
    lucky_color = random.choice(LUCKY_COLORS)

    score = random.randint(1, 100)
    if score >= 95:
        comment, grade = "欧皇降世！建议立刻去抽卡。", "SSR"
    elif score >= 80:
        comment, grade = "运气极佳，适合下矿挖钻石。", "SR"
    elif score >= 60:
        comment, grade = "运气不错，平平淡淡才是真。", "R"
    elif score >= 40:
        comment, grade = "一般般，建议扶老奶奶过马路。", "N"
    else:
        comment, grade = "非酋认证，建议在家种地。", "N--"

    score_blocks = score // 10

    clean_old_images()

    ver = fetch_latest_version()
    release = ver["release"]
    snapshot = ver["snapshot"]
    release_date = ver["release_date"] if ver["release_date"] else now.strftime("%Y-%m-%d")
    snapshot_date = ver["snapshot_date"] if ver["snapshot_date"] else now.strftime("%Y-%m-%d")

    if snapshot:
        main_version = snapshot
        main_date = snapshot_date
        main_label = "最新快照"
        second_version = release
        second_label = "最新正式版"
    else:
        main_version = release
        main_date = release_date
        main_label = "最新正式版"
        second_version = ""
        second_label = ""

    version_img_ok = fetch_version_image(main_version, filename="version.png")
    if version_img_ok:
        version_image_source = BASE_URL + "/" + IMAGES_DIR_NAME + "/version.png"
    else:
        version_image_source = "pack://application:,,,/images/Blocks/CommandBlock.png"

    news_title = "最新版本 - " + main_version

    server_url = ver["server_url"]
    wiki_url = ver["wiki_url"]
    changelog_url = ver["changelog_url"]

    lines = []
    lines.append('<StackPanel>')

    # ========== 卡片 1：最新版本 ==========
    lines.append('    <local:MyCard Title="' + news_title + '" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <Border CornerRadius="8" Height="150" Margin="0,0,0,14" Background="{DynamicResource ColorBrush7}" ClipToBounds="True">')
    lines.append('                <Grid>')
    lines.append('                    <local:MyImage Source="' + version_image_source + '" HorizontalAlignment="Stretch" VerticalAlignment="Stretch" Stretch="UniformToFill" />')
    lines.append('                    <Border HorizontalAlignment="Center" VerticalAlignment="Bottom" Background="#E6FF5555" CornerRadius="4" Padding="16,6,16,6" Margin="0,0,0,12">')
    lines.append('                        <TextBlock Text="' + main_version + '" FontSize="16" FontWeight="Bold" Foreground="White" />')
    lines.append('                    </Border>')
    lines.append('                </Grid>')
    lines.append('            </Border>')

    lines.append('            <Border CornerRadius="6" Padding="10,7" Margin="0,0,0,6" Background="{DynamicResource ColorBrush7}">')
    lines.append('                <StackPanel Orientation="Horizontal">')
    lines.append('                    <local:MyImage Width="18" Height="18" Margin="0,0,10,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/RedstoneBlock.png" />')
    lines.append('                    <TextBlock Text="' + main_label + '：' + main_version + '" FontSize="13" VerticalAlignment="Center" />')
    lines.append('                </StackPanel>')
    lines.append('            </Border>')

    if second_version:
        lines.append('            <Border CornerRadius="6" Padding="10,7" Margin="0,0,0,6" Background="{DynamicResource ColorBrush7}">')
        lines.append('                <StackPanel Orientation="Horizontal">')
        lines.append('                    <local:MyImage Width="18" Height="18" Margin="0,0,10,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/GoldBlock.png" />')
        lines.append('                    <TextBlock Text="' + second_label + '：' + second_version + '" FontSize="13" VerticalAlignment="Center" />')
        lines.append('                </StackPanel>')
        lines.append('            </Border>')

    lines.append('            <TextBlock Text="最后更新: ' + main_date + '" FontSize="11" Foreground="#FFAA00" HorizontalAlignment="Right" Margin="0,4,0,10" />')

    lines.append('            <Grid>')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <local:MyIconTextButton Grid.Column="0" Text="下载" LogoScale="0.9" Logo="M448 128h128v384h128l-192 192-192-192h128V128z M256 832h512v64H256z" EventType="打开网页" EventData="' + changelog_url + '" />')
    lines.append('                <local:MyIconTextButton Grid.Column="1" Text="服务端" LogoScale="0.9" Logo="M128 192h768v256H128V192z M128 576h768v256H128V576z M192 256h128v128H192V256z M192 640h128v128H192V640z" EventType="打开网页" EventData="' + server_url + '" />')
    lines.append('                <local:MyIconTextButton Grid.Column="2" Text="WIKI" LogoScale="0.9" Logo="M224 96h448c35 0 64 29 64 64v704c0 35-29 64-64 64H224c-35 0-64-29-64-64V160c0-35 29-64 64-64z M224 160v704h448V160H224z M288 224h320v64H288z M288 352h320v64H288z M288 480h320v64H288z M288 608h192v64H288z" EventType="打开网页" EventData="' + wiki_url + '" />')
    lines.append('                <local:MyIconTextButton Grid.Column="3" Text="更新日志" LogoScale="0.9" Logo="M192 64h384l256 256v576c0 35-29 64-64 64H192c-35 0-64-29-64-64V128c0-35 29-64 64-64z M576 64v256h256z" EventType="打开网页" EventData="' + changelog_url + '" />')
    lines.append('            </Grid>')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 2：今日概览 ==========
    lines.append('    <local:MyCard Title="今日概览" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')

    # 日期区块
    lines.append('            <Border CornerRadius="10" Padding="24,16" Margin="0,0,0,16" Background="{DynamicResource ColorBrush7}">')
    lines.append('                <StackPanel>')
    lines.append('                    <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">')
    lines.append('                        <TextBlock Text="' + month + '" FontSize="44" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                        <TextBlock Text=" 月 " FontSize="13" VerticalAlignment="Bottom" Margin="0,0,2,12" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                        <TextBlock Text="' + day + '" FontSize="44" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                        <TextBlock Text=" 日" FontSize="13" VerticalAlignment="Bottom" Margin="0,0,0,12" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                    </StackPanel>')
    lines.append('                    <TextBlock Text="' + year + ' 年 · 星期' + weekday + '" HorizontalAlignment="Center" FontSize="12" Foreground="{DynamicResource ColorBrush3}" Margin="0,4,0,0" />')
    lines.append('                </StackPanel>')
    lines.append('            </Border>')

    # 每日一言 + 换一句按钮（靠右，带主题色描边）
    lines.append('            <Border CornerRadius="6" Padding="12,10" Margin="0,0,0,16" Background="{DynamicResource ColorBrush7}">')
    lines.append('                <StackPanel>')
    lines.append('                    <TextBlock Text="每日一言" FontSize="11" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,6" />')
    lines.append('                    <TextBlock TextWrapping="Wrap" FontSize="13" Margin="0,0,0,10" Text="' + quote + '" />')
    lines.append('                    <local:MyIconTextButton Height="32" HorizontalAlignment="Right" Padding="16,0,16,0" Text="换一句" LogoScale="0.8" ColorType="Highlight" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />')
    lines.append('                </StackPanel>')
    lines.append('            </Border>')

    # 幸运数字（每次请求随机） + 幸运颜色（每天随机）
    lines.append('            <Grid>')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')

    lines.append('                <Border Grid.Column="0" CornerRadius="8" Padding="14,12" Margin="0,0,6,0" Background="{DynamicResource ColorBrush7}">')
    lines.append('                    <StackPanel>')
    lines.append('                        <TextBlock Text="幸运数字" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" />')
    lines.append('                        <TextBlock Text="' + str(lucky_number) + '" FontSize="30" FontWeight="Bold" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                    </StackPanel>')
    lines.append('                </Border>')

    lines.append('                <Border Grid.Column="1" CornerRadius="8" Padding="14,12" Margin="6,0,0,0" Background="{DynamicResource ColorBrush7}">')
    lines.append('                    <StackPanel>')
    lines.append('                        <TextBlock Text="幸运颜色" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,6" />')
    lines.append('                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">')
    lines.append('                            <Border Width="16" Height="16" CornerRadius="4" Background="' + lucky_color["hex"] + '" Margin="0,0,8,0" VerticalAlignment="Center" />')
    lines.append('                            <TextBlock Text="' + lucky_color["name"] + '" FontSize="15" FontWeight="Bold" VerticalAlignment="Center" Foreground="' + lucky_color["hex"] + '" />')
    lines.append('                        </StackPanel>')
    lines.append('                    </StackPanel>')
    lines.append('                </Border>')
    lines.append('            </Grid>')

    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 3：常用链接 ==========
    lines.append('    <local:MyCard Title="常用链接" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Grass.png" Title="Minecraft Wiki" Info="查阅方块、生物与游戏机制" EventType="打开网页" EventData="https://zh.minecraft.wiki/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/RedstoneBlock.png" Title="苦力怕论坛" Info="Minecraft 中文资源与交流社区" EventType="打开网页" EventData="https://klpbbs.com/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/GoldBlock.png" Title="Hypixel" Info="全球最大的 Minecraft 小游戏服务器" EventType="打开网页" EventData="https://hypixel.net/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Anvil.png" Title="Modrinth" Info="下载模组、整合包与资源包" EventType="打开网页" EventData="https://modrinth.com/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="https://www.mcmod.cn/images/favicon.ico" Title="MC百科" Info="最大的 Minecraft 中文 MOD 百科" EventType="打开网页" EventData="https://www.mcmod.cn/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,0" Type="Clickable" Logo="https://s.namemc.com/img/favicon-128.png" Title="NameMC" Info="查询 Minecraft 皮肤与用户名" EventType="打开网页" EventData="https://namemc.com/" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 4：游戏指令速查 ==========
    lines.append('    <local:MyCard Title="游戏指令速查" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')

    for group_idx, (group_title, cmds) in enumerate(CMD_GROUPS):
        margin_bottom = "0" if group_idx == len(CMD_GROUPS) - 1 else "14"
        title_color = "{DynamicResource ColorBrush1}" if "1.20.5" in group_title or "1.13" in group_title else "{DynamicResource ColorBrush3}"
        lines.append('            <TextBlock Text="' + group_title + '" FontSize="11" FontWeight="Bold" Foreground="' + title_color + '" Margin="0,0,0,6" />')
        lines.append('            <Grid Margin="0,0,0,' + margin_bottom + '">')
        lines.append('                <Grid.ColumnDefinitions>')
        lines.append('                    <ColumnDefinition Width="1*" />')
        lines.append('                    <ColumnDefinition Width="1*" />')
        lines.append('                    <ColumnDefinition Width="1*" />')
        lines.append('                </Grid.ColumnDefinitions>')
        for i, (btn_text, cmd, tip) in enumerate(cmds):
            margin = ' Margin="0,0,10,0"' if i < 2 else ''
            lines.append('                <local:MyButton Grid.Column="' + str(i) + '"' + margin + ' Height="36" Text="' + btn_text + '" ToolTip="' + tip + '" EventType="复制文本" EventData="' + cmd.replace('"', '&quot;') + '" />')
        lines.append('            </Grid>')

    lines.append('            <local:MyHint Theme="Yellow" Margin="0,14,0,10" Text="指令适用于 Java 版 1.13 及以上。&#xA;玩家头颅指令按版本分为两组，请根据自己的游戏版本选择。" />')
    lines.append('            <local:MyHint Theme="Blue" Text="需要开启作弊或创造模式。复制后进游戏按 T，Ctrl+V 粘贴即可。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 5：彩蛋 ==========
    lines.append('    <local:MyCard Title="彩蛋" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <TextBlock TextWrapping="Wrap" Margin="0,0,0,16" Text="每次点开都不一样，看看你能抽到什么。" />')
    lines.append('            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">')
    lines.append('                <local:MyIconTextButton Margin="0,0,24,0" Text="打开彩蛋" LogoScale="0.9" Logo="M320 128h384c35 0 64 29 64 64v640c0 35-29 64-64 64H320c-35 0-64-29-64-64V192c0-35 29-64 64-64z M320 192v640h384V192H320z M384 256h256v64H384z M384 384h256v64H384z M384 512h256v64H384z">')
    lines.append('                    <local:CustomEventService.Events>')
    lines.append('                        <local:CustomEventCollection>')
    lines.append('                            <local:CustomEvent Type="弹出窗口" Data="' + egg_data + '" />')
    lines.append('                            <local:CustomEvent Type="刷新页面" Data="-" />')
    lines.append('                        </local:CustomEventCollection>')
    lines.append('                    </local:CustomEventService.Events>')
    lines.append('                </local:MyIconTextButton>')
    lines.append('                <local:MyIconTextButton Text="刷新主页" LogoScale="0.9" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />')
    lines.append('            </StackPanel>')
    lines.append('            <local:MyHint Theme="Yellow" Margin="0,16,0,0" Text="彩蛋由 Cloudflare Functions 动态生成，每次刷新都会换一个。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 6：人品测试 ==========
    lines.append('    <local:MyCard Title="人品测试" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <TextBlock Text="今日得分" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" />')
    lines.append('            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,14">')
    lines.append('                <TextBlock Text="' + str(score) + '" FontSize="52" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                <TextBlock Text="分" FontSize="14" VerticalAlignment="Bottom" Foreground="{DynamicResource ColorBrush3}" Margin="4,0,0,12" />')
    lines.append('            </StackPanel>')

    lines.append('            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,14">')
    for i in range(10):
        if i < score_blocks:
            color_res = "{DynamicResource ColorBrush1}"
        else:
            color_res = "{DynamicResource ColorBrush7}"
        lines.append('                <Border Width="22" Height="8" CornerRadius="2" Margin="1,0" Background="' + color_res + '" />')
    lines.append('            </StackPanel>')

    lines.append('            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">')
    lines.append('                <TextBlock Text="评级 " FontSize="13" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                <TextBlock Text="' + grade + '" FontSize="16" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('            </StackPanel>')
    lines.append('            <local:MyHint Theme="Blue" Text="' + comment + '" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    lines.append('</StackPanel>')

    return "\n".join(lines) + "\n"


def main():
    base_dir = Path(__file__).resolve().parent.parent
    output = base_dir / "Custom.xaml"

    xaml = build_xaml()
    output.write_text(xaml, encoding="utf-8")
    print("已生成：" + str(output))

    version_file = base_dir / "Custom.xaml.version"
    version_str = datetime.now().strftime("%Y%m%d%H")
    version_file.write_text(version_str, encoding="utf-8")
    print("已写入版本号：" + version_str)


if __name__ == "__main__":
    main()
