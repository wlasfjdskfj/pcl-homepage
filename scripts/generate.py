# -*- coding: utf-8 -*-
"""
PCL 主页生成脚本
由 GitHub Actions 定时运行，生成带动态数据的 Custom.xaml。
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

BLOCKS = [
    {"name": "草方块",   "wiki": "草方块",   "image_title": "File:Grass Block.png",       "file": "grass.png",          "fallback": "Grass.png",          "desc": "Minecraft 的标志性方块，随处可见。"},
    {"name": "圆石",     "wiki": "圆石",     "image_title": "File:Cobblestone.png",       "file": "cobblestone.png",    "fallback": "Cobblestone.png",    "desc": "挖石头就能得到，建筑党的好帮手。"},
    {"name": "金块",     "wiki": "金块",     "image_title": "File:Block of Gold.png",     "file": "gold_block.png",     "fallback": "GoldBlock.png",      "desc": "9 个金锭合成，还能做信标底座。"},
    {"name": "命令方块", "wiki": "命令方块", "image_title": "File:Command Block.png",     "file": "command_block.png",  "fallback": "CommandBlock.png",   "desc": "创造模式的玩具，Minecraft 的魔法方块。"},
    {"name": "铁砧",     "wiki": "铁砧",     "image_title": "File:Anvil.png",             "file": "anvil.png",          "fallback": "Anvil.png",          "desc": "修复装备、附魔、重命名，掉落会砸脚。"},
    {"name": "红石块",   "wiki": "红石块",   "image_title": "File:Block of Redstone.png", "file": "redstone_block.png", "fallback": "RedstoneBlock.png",  "desc": "持续输出红石信号，可以永久激活装置。"},
    {"name": "鸡蛋",     "wiki": "鸡蛋",     "image_title": "File:Egg.png",               "file": "egg.png",            "fallback": "Egg.png",            "desc": "扔出去有几率生成小鸡。"},
    {"name": "钻石块",   "wiki": "钻石块",   "image_title": "File:Block of Diamond.png",  "file": "diamond_block.png",  "fallback": "GoldBlock.png",      "desc": "9 个钻石合成，是最值钱的装饰方块之一。"},
]

EGGS = [
    {"title": "神秘代码",     "content": "检测到一段古老的代码……&#xA;&#xA;恭喜你获得成就：手贱达人！"},
    {"title": "开发者留言",   "content": "PCL 的作者说过：&#xA;「如果你倒腾这个文件把 PCL 玩炸了，把这个文件直接删除就行了。」"},
    {"title": "钻石雨",       "content": "天空下起了钻石雨！&#xA;&#xA;你捡到了：&#xA;钻石 × 64&#xA;绿宝石 × 64&#xA;&#xA;醒来后发现是做梦。"},
    {"title": "苦力怕的祝福", "content": "一只苦力怕悄悄靠近了你……&#xA;&#xA;sssssss……&#xA;&#xA;BOOM！"},
    {"title": "末影人的秘密", "content": "你盯着末影人看了太久……&#xA;&#xA;它留下了一张纸条：&#xA;「别看了，再看把你传送到虚空。」"},
    {"title": "幸运方块",     "content": "你打开了一个幸运方块……&#xA;&#xA;里面跳出了一只鸡。&#xA;鸡又下了一颗蛋。&#xA;&#xA;恭喜你实现了鸡蛋自由。"},
]

LUCKY_COLORS = [
    {"name": "钻石蓝",   "hex": "#4AEDD9"},
    {"name": "红石红",   "hex": "#FF5555"},
    {"name": "金锭黄",   "hex": "#FFAA00"},
    {"name": "绿宝石绿", "hex": "#17DD62"},
    {"name": "青金石蓝", "hex": "#2A4DD0"},
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


# ============ Wiki 图片获取 ============

def fetch_wiki_image(image_title, filename, width=128):
    images_dir = Path(__file__).resolve().parent.parent / IMAGES_DIR_NAME
    images_dir.mkdir(exist_ok=True)
    local_path = images_dir / filename

    if local_path.exists():
        print("[Wiki] 图片已存在：" + filename)
        return True

    try:
        params = {
            "action": "query",
            "titles": image_title,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": str(width),
            "format": "json",
        }
        resp = requests.get(WIKI_API, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        pages = data.get("query", {}).get("pages", {})
        thumb_url = None
        for page_id, page_info in pages.items():
            if "missing" in page_info:
                print("[Wiki] 文件不存在：" + image_title)
                return False
            info_list = page_info.get("imageinfo", [])
            if info_list:
                thumb_url = info_list[0].get("thumburl") or info_list[0].get("url")
                break

        if not thumb_url:
            print("[Wiki] 未获取到 " + image_title + " 的 URL")
            return False

        print("[Wiki] " + image_title + " → " + thumb_url)

        img_headers = {
            "User-Agent": HEADERS["User-Agent"],
            "Referer": "https://zh.minecraft.wiki/",
        }

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                img_resp = requests.get(thumb_url, headers=img_headers, timeout=REQUEST_TIMEOUT)
                if img_resp.status_code != 200:
                    print("[Wiki] 第 " + str(attempt) + " 次下载失败，状态码：" + str(img_resp.status_code))
                    if attempt < MAX_RETRIES:
                        time.sleep(3)
                        continue
                    return False

                with open(local_path, "wb") as f:
                    f.write(img_resp.content)

                print("[Wiki] 已下载：" + filename + "（" + str(len(img_resp.content)) + " 字节）")
                return True

            except requests.exceptions.Timeout:
                print("[Wiki] 第 " + str(attempt) + " 次超时")
                if attempt < MAX_RETRIES:
                    time.sleep(3)
                else:
                    return False

        return False

    except Exception as e:
        print("[Wiki] 获取 " + image_title + " 失败：" + str(e))
        return False


def pick_version_image(images, version):
    """从版本页面图片列表里筛选出封面图。"""
    base_version = version
    for suffix in ["-rc-1", "-rc-2", "-rc-3", "-rc-4", "-pre1", "-pre2", "-pre3", "-pre4", "-pre5"]:
        if base_version.endswith(suffix):
            base_version = base_version[:-len(suffix)]
            break

    priority1 = []
    priority2 = []
    priority3 = []

    for img in images:
        t = img.get("title", "")
        if not t.lower().endswith((".png", ".jpg", ".gif")):
            continue
        if "Sprite" in t or "Disambig" in t or "Logo" in t or "Icon" in t:
            continue
        if version in t:
            priority1.append(t)
        elif base_version in t:
            priority2.append(t)
        else:
            priority3.append(t)

    if priority1:
        return priority1[0]
    if priority2:
        return priority2[0]
    if priority3:
        return priority3[0]
    return None


def fetch_version_image(version, filename="version.png"):
    """从 Minecraft Wiki 抓取版本封面图。"""
    images_dir = Path(__file__).resolve().parent.parent / IMAGES_DIR_NAME
    images_dir.mkdir(exist_ok=True)
    local_path = images_dir / filename
    # 缓存标记改成 v2，让旧缓存失效
    marker = images_dir / (filename + ".v2.version")

    if local_path.exists() and marker.exists():
        try:
            if marker.read_text(encoding="utf-8").strip() == version:
                print("[Version-Image] 图片已存在且版本一致：" + filename)
                return True
        except Exception:
            pass

    page_titles = []
    page_titles.append("Java版" + version)

    base_version = version
    for suffix in ["-rc-1", "-rc-2", "-rc-3", "-rc-4", "-pre1", "-pre2", "-pre3", "-pre4", "-pre5"]:
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

# ============ 指令分组数据 ============

# 每组是 (分组标题, [(按钮文字, 指令, ToolTip)])
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

    quote = random.choice(QUOTES)
    lucky_number = random.randint(1, 99)
    lucky_color = random.choice(LUCKY_COLORS)
    block = random.choice(BLOCKS)
    egg = random.choice(EGGS)

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

    wiki_ok = fetch_wiki_image(block["image_title"], block["file"], width=128)
    if wiki_ok:
        block_source = BASE_URL + "/" + IMAGES_DIR_NAME + "/" + block["file"]
    else:
        block_source = "pack://application:,,,/images/Blocks/" + block["fallback"]

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
    lines.append('            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,4">')
    lines.append('                <TextBlock Text="' + month + '" FontSize="40" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                <TextBlock Text=" 月 " FontSize="12" VerticalAlignment="Bottom" Margin="0,0,2,10" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                <TextBlock Text="' + day + '" FontSize="40" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                <TextBlock Text=" 日" FontSize="12" VerticalAlignment="Bottom" Margin="0,0,0,10" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('            </StackPanel>')
    lines.append('            <TextBlock Text="' + year + ' 年 · 星期' + weekday + '" HorizontalAlignment="Center" FontSize="12" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,16" />')
    lines.append('            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,16">')
    lines.append('                <Border Width="40" Height="3" CornerRadius="2" Background="{DynamicResource ColorBrush1}" Margin="2,0" />')
    lines.append('                <Border Width="40" Height="3" CornerRadius="2" Background="{DynamicResource ColorBrush3}" Margin="2,0" />')
    lines.append('                <Border Width="40" Height="3" CornerRadius="2" Background="{DynamicResource ColorBrush5}" Margin="2,0" />')
    lines.append('                <Border Width="40" Height="3" CornerRadius="2" Background="{DynamicResource ColorBrush7}" Margin="2,0" />')
    lines.append('            </StackPanel>')
    lines.append('            <local:MyHint Theme="Blue" Margin="0,0,0,16" Text="每日一言：' + quote + '" />')
    lines.append('            <Grid>')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <StackPanel Grid.Column="0" HorizontalAlignment="Center">')
    lines.append('                    <TextBlock Text="幸运数字" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" />')
    lines.append('                    <TextBlock Text="' + str(lucky_number) + '" FontSize="28" FontWeight="Bold" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                </StackPanel>')
    lines.append('                <StackPanel Grid.Column="1" HorizontalAlignment="Center">')
    lines.append('                    <TextBlock Text="幸运颜色" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" />')
    lines.append('                    <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">')
    lines.append('                        <Border Width="14" Height="14" CornerRadius="3" Background="' + lucky_color["hex"] + '" Margin="0,0,6,0" VerticalAlignment="Center" />')
    lines.append('                        <TextBlock Text="' + lucky_color["name"] + '" FontSize="14" FontWeight="Bold" VerticalAlignment="Center" Foreground="' + lucky_color["hex"] + '" />')
    lines.append('                    </StackPanel>')
    lines.append('                </StackPanel>')
    lines.append('            </Grid>')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 3：今日幸运方块 ==========
    lines.append('    <local:MyCard Title="今日幸运方块" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <Grid>')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="Auto" />')
    lines.append('                    <ColumnDefinition Width="*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <local:MyImage Grid.Column="0" Width="72" Height="72" Margin="0,0,18,0" Source="' + block_source + '" />')
    lines.append('                <StackPanel Grid.Column="1" VerticalAlignment="Center">')
    lines.append('                    <TextBlock Text="' + block["name"] + '" FontSize="16" FontWeight="Bold" Margin="0,0,0,6" />')
    lines.append('                    <TextBlock TextWrapping="Wrap" FontSize="11" LineHeight="17" Foreground="{DynamicResource ColorBrush3}" Text="' + block["desc"] + '" />')
    lines.append('                </StackPanel>')
    lines.append('            </Grid>')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 4：常用链接 ==========
    lines.append('    <local:MyCard Title="常用链接" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Grass.png" Title="Minecraft Wiki" Info="查阅方块、生物与游戏机制" EventType="打开网页" EventData="https://zh.minecraft.wiki/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/RedstoneBlock.png" Title="苦力怕论坛" Info="Minecraft 中文资源与交流社区" EventType="打开网页" EventData="https://klpbbs.com/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/GoldBlock.png" Title="Hypixel" Info="全球最大的 Minecraft 小游戏服务器" EventType="打开网页" EventData="https://hypixel.net/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,0" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Anvil.png" Title="Modrinth" Info="下载模组、整合包与资源包" EventType="打开网页" EventData="https://modrinth.com/" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 5：游戏指令速查 ==========
    lines.append('    <local:MyCard Title="游戏指令速查" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')

    for group_idx, (group_title, cmds) in enumerate(CMD_GROUPS):
        margin_bottom = "0" if group_idx == len(CMD_GROUPS) - 1 else "14"
        # 版本区分的分组用高亮颜色
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

    # ========== 卡片 6：彩蛋 ==========
    lines.append('    <local:MyCard Title="彩蛋" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <TextBlock TextWrapping="Wrap" Margin="0,0,0,12" Text="点击下面的按钮，看看今天抽到了什么彩蛋。" />')
    lines.append('            <local:MyButton Height="36" HorizontalAlignment="Left" Padding="20,0,20,0" Text="打开彩蛋" EventType="弹出窗口" EventData="' + egg["title"] + '|' + egg["content"] + '" />')
    lines.append('            <local:MyHint Theme="Yellow" Margin="0,12,0,0" Text="彩蛋由 GitHub Actions 定时随机生成，每 2 小时换一次。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 7：人品测试 ==========
    lines.append('    <local:MyCard Title="人品测试" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <TextBlock Text="今日得分" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" />')
    lines.append('            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">')
    lines.append('                <TextBlock Text="' + str(score) + '" FontSize="52" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                <TextBlock Text="分" FontSize="14" VerticalAlignment="Bottom" Foreground="{DynamicResource ColorBrush3}" Margin="4,0,0,12" />')
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
    output = Path(__file__).resolve().parent.parent / "Custom.xaml"
    output.write_text(build_xaml(), encoding="utf-8")
    print("已生成：" + str(output))


if __name__ == "__main__":
    main()
