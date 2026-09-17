# -*- coding: utf-8 -*-
"""
PCL 主页生成脚本
由 GitHub Actions 每 12 小时定时运行，生成带动态数据的 Custom.xaml。
日期、幸运数字、幸运颜色、彩蛋、每日一言、人品分数、用户 IP 均由 Cloudflare Functions 动态替换。
玩家 ID 由 PCL 的 {user} 替换标记自动填充。
版本封面图优先从 Minecraft Wiki 抓取，失败时回退官方启动器新闻图。
日期卡片背景使用必应每日壁纸。
更新内容从 Minecraft Wiki 抓取，抓不到时显示 PCL 原生加载动画。
服务器列表不再查询在线状态。
"""

import time
import re
import requests
from datetime import datetime
from pathlib import Path

# ============ 配置 ============

VERSION_API = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
WIKI_API = "https://zh.minecraft.wiki/api.php"
WIKI_PAGE_BASE = "https://zh.minecraft.wiki/w/"
BING_API = "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN"
LAUNCHER_NEWS_API = "https://launchercontent.mojang.com/v2/javaPatchNotes.json"

REQUEST_TIMEOUT = 30
MAX_RETRIES = 3

BASE_URL = "https://www.mkejga.de5.net"
IMAGES_DIR_NAME = "images"

VERSION_IMAGE_CACHE_DAYS = 7
KEEP_FILES = ["version.png", "kkange.png"]

FEEDBACK_URL = "https://github.com/wlasfjdskfj/pcl-homepage/issues"
SOURCE_URL = "https://github.com/wlasfjdskfj/pcl-homepage"

# 主推服务器
SERVER_ADDRESS = "mc.hypixel.net"

# 服务器列表（第一个是主推）
SERVER_LIST = [
    ("Hypixel", SERVER_ADDRESS),
    ("2B2T", "connect.2b2t.org"),
    ("Mineplex", "mineplex.com"),
]

HEADERS = {
    "User-Agent": "PCL-Homepage/1.0 (https://github.com/wlasfjdskfj/pcl-homepage)",
}


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


# ============ 最近 5 个正式版 ============

def fetch_recent_releases(count=5):
    """获取最近 N 个正式版（release），返回 [{version, date, days_ago}, ...]"""
    try:
        resp = requests.get(VERSION_API, timeout=REQUEST_TIMEOUT, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        versions = data.get("versions", [])

        today = datetime.now().date()
        result = []
        for v in versions:
            if v.get("type") != "release":
                continue
            vid = v.get("id", "")
            rt = v.get("releaseTime", "")[:10]
            if not vid or not rt:
                continue
            try:
                release_date = datetime.strptime(rt, "%Y-%m-%d").date()
                days_ago = (today - release_date).days
            except Exception:
                days_ago = 0
            result.append({
                "version": vid,
                "date": rt,
                "days_ago": days_ago,
            })
            if len(result) >= count:
                break

        print("[Releases] 最近 " + str(len(result)) + " 个正式版")
        return result

    except Exception as e:
        print("[Releases] 获取失败：" + str(e))
        return []


# ============ Wiki 更新内容抓取 ============

def _clean_wiki_text(s):
    if not s:
        return ""
    s = re.sub(r"\[\d+\]", "", s)
    s = re.sub(r"\[编辑\]", "", s)
    s = re.sub(r"\[[^\]]*\]", "", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def _extract_wiki_sections(html):
    sections = []
    h2_pattern = re.compile(r"<h2[^>]*>(.*?)</h2>(.*?)(?=<h2|$)", re.DOTALL | re.IGNORECASE)
    li_pattern = re.compile(r"<li[^>]*>(.*?)</li>", re.DOTALL | re.IGNORECASE)
    p_pattern = re.compile(r"<p[^>]*>(.*?)</p>", re.DOTALL | re.IGNORECASE)
    tag_pattern = re.compile(r"<[^>]+>")

    def strip_tags(x):
        x = tag_pattern.sub("", x)
        return _clean_wiki_text(x)

    for m in h2_pattern.finditer(html):
        heading = strip_tags(m.group(1))
        body_html = m.group(2)
        if not heading:
            continue
        if not any(k in heading for k in ("更改", "新内容", "新增", "修复", "更新", "改动", "特性")):
            continue
        items = []
        seen = set()
        # 匹配完整 <li>...</li> 块；块内若还嵌套 <li> 子项，先剥离子项避免内容拼接进父项
        for m in li_pattern.finditer(body_html):
            block = m.group(0)
            after_open = block[block.find(">") + 1:]
            cleaned = re.sub(r"<li[^>]*>.*?</li>", "", after_open,
                             flags=re.DOTALL | re.IGNORECASE)
            text = strip_tags(cleaned)
            if text and len(text) > 3 and text not in seen:
                seen.add(text)
                items.append(text)
        if not items:
            for p in p_pattern.finditer(body_html):
                text = strip_tags(p.group(1))
                if text and len(text) > 3 and text not in seen:
                    seen.add(text)
                    items.append(text)
        if items:
            sections.append({"heading": heading, "items": items[:20]})
    return sections


def fetch_wiki_changelog(version):
    page_title = "Java版" + version
    url = WIKI_PAGE_BASE + page_title
    try:
        resp = requests.get(url, timeout=REQUEST_TIMEOUT, headers=HEADERS)
        if resp.status_code != 200:
            print("[Wiki-Changelog] " + page_title + " 返回 " + str(resp.status_code))
            return {"ok": False, "sections": [], "url": url}
        sections = _extract_wiki_sections(resp.text)
        if not sections:
            print("[Wiki-Changelog] " + page_title + " 没找到有效章节")
            return {"ok": False, "sections": [], "url": url}
        total = sum(len(s["items"]) for s in sections)
        print("[Wiki-Changelog] " + page_title + " 提取 " + str(len(sections)) + " 章节，" + str(total) + " 条")
        for s in sections[:3]:
            print("  章节：" + s["heading"] + "（" + str(len(s["items"])) + " 条）")
        return {"ok": True, "sections": sections, "url": url}
    except Exception as e:
        print("[Wiki-Changelog] 请求失败：" + str(e))
        return {"ok": False, "sections": [], "url": url}


# ============ 服务器列表（不查询状态） ============

def fetch_server_list():
    """返回服务器列表，不查询状态。"""
    result = []
    for name, address in SERVER_LIST:
        result.append({
            "name": name,
            "address": address,
        })
    print("[ServerList] 共 " + str(len(result)) + " 个服务器（不查询状态）")
    return result


# ============ 官方启动器新闻封面 ============

def fetch_official_version_image(version):
    """从 Mojang 官方启动器新闻接口获取版本封面图。返回图片 URL 或 None。"""
    try:
        resp = requests.get(LAUNCHER_NEWS_API, timeout=REQUEST_TIMEOUT, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        entries = data.get("entries", [])
        if not entries:
            print("[Official-Image] 新闻接口无内容")
            return None

        for entry in entries:
            if entry.get("version") == version:
                img = entry.get("image", {})
                url = img.get("url", "")
                if url:
                    full_url = "https://launchercontent.mojang.com" + url
                    print("[Official-Image] 精确匹配：" + version + " → " + full_url)
                    return full_url

        for entry in entries:
            if entry.get("type") == "release":
                img = entry.get("image", {})
                url = img.get("url", "")
                if url:
                    full_url = "https://launchercontent.mojang.com" + url
                    print("[Official-Image] 无精确匹配，用最新正式版：" + entry.get("version", "?") + " → " + full_url)
                    return full_url

        first = entries[0]
        img = first.get("image", {})
        url = img.get("url", "")
        if url:
            full_url = "https://launchercontent.mojang.com" + url
            print("[Official-Image] 兜底用最新：" + first.get("version", "?") + " → " + full_url)
            return full_url

        print("[Official-Image] 未找到任何图片")
        return None

    except Exception as e:
        print("[Official-Image] 请求失败：" + str(e))
        return None


# ============ Wiki 版本封面图获取 ============

def pick_version_image(images, version):
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
            "iiurlwidth": "1200",
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


# ============ 必应每日壁纸 ============

def fetch_bing_wallpaper():
    """从必应获取今日壁纸 URL，失败时回退到 kkange.png，再回退到内置图片"""
    local_fallback = Path(__file__).resolve().parent.parent / IMAGES_DIR_NAME / "kkange.png"
    if local_fallback.exists():
        fallback = BASE_URL + "/" + IMAGES_DIR_NAME + "/kkange.png"
    else:
        fallback = "pack://application:,,,/images/Blocks/GrassPath.png"

    try:
        resp = requests.get(BING_API, timeout=REQUEST_TIMEOUT, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        images = data.get("images", [])
        if images:
            url = "https://www.bing.com" + images[0]["url"]
            url = url.replace("&", "&amp;")
            print("[Bing] 今日壁纸：" + url[:100] + "...")
            return url
        print("[Bing] API 返回为空，使用兜底图片：" + fallback)
    except Exception as e:
        print("[Bing] 获取壁纸失败：" + str(e) + "，使用兜底图片：" + fallback)
    return fallback


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
        ("Notch 头颅", "/give @s minecraft:player_head[profile={name:\"Notch\"}]", "1.20.5 及以后。直接获取 Notch 的头颅"),
        ("自己的头颅", "/give @s minecraft:player_head[profile={name:\"@s\"}]", "1.20.5 及以后。获取自己的头颅"),
        ("自定义头颅", "/give @s minecraft:player_head[profile={name:\"Steve\"}]", "1.20.5 及以后。把 Steve 换成任意玩家 ID"),
    ]),
    ("玩家头颅 · 1.13-1.20.4", [
        ("Notch 头颅", "/give @s player_head{SkullOwner:\"Notch\"}", "1.13-1.20.4。直接获取 Notch 的头颅"),
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


def escape_xaml_attr(text):
    return (text
            .replace("&", "&amp;")
            .replace('"', "&quot;")
            .replace("<", "&lt;")
            .replace(">", "&gt;"))


# ============ XAML 生成 ============

def build_xaml():
    now = datetime.now()
    month = "__DATE_MONTH__"
    day = "__DATE_DAY__"
    year = "__DATE_YEAR__"
    weekday = "__DATE_WEEKDAY__"
    greeting = "__GREETING__"

    quote = "__QUOTE__"
    lucky_number = "__LUCKY_NUMBER__"
    lucky_color = {"name": "__LUCKY_COLOR_NAME__", "hex": "__LUCKY_COLOR_HEX__"}
    egg_data = "__EGG_DATA__"
    user_ip = "__USER_IP__"

    score = "__SCORE__"
    comment = "__COMMENT__"
    grade = "__GRADE__"

    fortune_good = "__FORTUNE_GOOD__"
    fortune_bad = "__FORTUNE_BAD__"
    fortune_tip = "__FORTUNE_TIP__"
    challenge = "__CHALLENGE__"
    challenge_diff = "__CHALLENGE_DIFF__"
    seed = "__SEED__"
    seed_desc = "__SEED_DESC__"
    quiz_q = "__QUIZ_Q__"
    quiz_a = "__QUIZ_A__"

    server_address = SERVER_ADDRESS

    clean_old_images()

    wallpaper_url = fetch_bing_wallpaper()

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
        version_image_source = BASE_URL + "/" + IMAGES_DIR_NAME + "/version.png?v=" + main_version.replace(" ", "_")
        print("[Version-Image] 使用 Wiki 封面")
    else:
        print("[Version-Image] Wiki 不可用，回退官方新闻图")
        official_image = fetch_official_version_image(main_version)
        if official_image:
            version_image_source = official_image
        else:
            version_image_source = "pack://application:,,,/images/Blocks/CommandBlock.png"

    recent_releases = fetch_recent_releases(5)
    wiki_changelog = fetch_wiki_changelog(main_version)
    server_list = fetch_server_list()

    news_title = "当前最新版本 · " + main_version

    wiki_version_url = "https://zh.minecraft.wiki/w/Java版" + main_version

    server_url = ver["server_url"]
    wiki_url = ver["wiki_url"]
    changelog_url = ver["changelog_url"]

    lines = []
    lines.append('<StackPanel>')

    # ========== 卡片 1：今日概览 ==========
    lines.append('    <local:MyCard Title="今日概览" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')

    lines.append('            <!-- __FESTIVAL_BANNER__ -->')

    lines.append('            <Border CornerRadius="12" Height="280" Margin="0,0,0,16" ClipToBounds="True">')
    lines.append('                <Grid>')
    lines.append('                    <local:MyImage Source="' + wallpaper_url + '" HorizontalAlignment="Stretch" VerticalAlignment="Stretch" Stretch="UniformToFill" />')
    lines.append('                    <Border>')
    lines.append('                        <Border.Background>')
    lines.append('                            <LinearGradientBrush StartPoint="0,0" EndPoint="0,1">')
    lines.append('                                <GradientStop Color="#33000000" Offset="0" />')
    lines.append('                                <GradientStop Color="#88000000" Offset="0.55" />')
    lines.append('                                <GradientStop Color="#CC000000" Offset="1" />')
    lines.append('                            </LinearGradientBrush>')
    lines.append('                        </Border.Background>')
    lines.append('                    </Border>')

    lines.append('                    <Border HorizontalAlignment="Left" VerticalAlignment="Top" Margin="18,16,0,0" Background="#59000000" CornerRadius="14" Padding="12,10,16,10">')
    lines.append('                        <StackPanel>')
    lines.append('                            <StackPanel Orientation="Horizontal">')
    lines.append('                                <Border Width="26" Height="26" CornerRadius="13" Background="{DynamicResource ColorBrush1}" Margin="0,0,9,0" VerticalAlignment="Center">')
    lines.append('                                    <local:MyImage Width="17" Height="17" HorizontalAlignment="Center" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/Grass.png" />')
    lines.append('                                </Border>')
    lines.append('                                <TextBlock Text="' + greeting + '，{user}！" FontSize="14" FontWeight="Bold" Foreground="White" VerticalAlignment="Center" />')
    lines.append('                            </StackPanel>')
    lines.append('                            <TextBlock Text="欢迎回来，今天也一起去冒险吧。" FontSize="11" Foreground="#D9FFFFFF" Margin="0,3,0,0" />')
    lines.append('                        </StackPanel>')
    lines.append('                    </Border>')

    lines.append('                    <TextBlock HorizontalAlignment="Right" VerticalAlignment="Bottom" Margin="0,0,20,16" FontSize="11" FontWeight="Bold" Foreground="#66FFFFFF" Text="' + year + ' · ' + month + ' / ' + day + '" />')

    lines.append('                    <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center">')
    lines.append('                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">')
    lines.append('                            <Border Width="36" Height="1" CornerRadius="0.5" Background="#66FFFFFF" VerticalAlignment="Center" />')
    lines.append('                            <TextBlock Text="  T O D A Y  " FontSize="10" FontWeight="Bold" Foreground="#AAFFFFFF" VerticalAlignment="Center" />')
    lines.append('                            <Border Width="36" Height="1" CornerRadius="0.5" Background="#66FFFFFF" VerticalAlignment="Center" />')
    lines.append('                        </StackPanel>')
    lines.append('                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">')
    lines.append('                            <TextBlock Text="' + month + '" FontSize="60" FontWeight="Bold" Foreground="White" />')
    lines.append('                            <TextBlock Text=" 月 " FontSize="14" VerticalAlignment="Bottom" Margin="0,0,6,18" Foreground="#CCFFFFFF" />')
    lines.append('                            <TextBlock Text="' + day + '" FontSize="60" FontWeight="Bold" Foreground="White" />')
    lines.append('                            <TextBlock Text=" 日" FontSize="14" VerticalAlignment="Bottom" Margin="0,0,6,18" Foreground="#CCFFFFFF" />')
    lines.append('                        </StackPanel>')
    lines.append('                        <TextBlock Text="星期' + weekday + '" HorizontalAlignment="Center" FontSize="13" FontWeight="Bold" Foreground="#EEFFFFFF" Margin="0,10,0,0" />')
    lines.append('                    </StackPanel>')
    lines.append('                </Grid>')
    lines.append('            </Border>')

    lines.append('            <Border CornerRadius="10" Padding="18,16" Margin="0,0,0,16" Background="{DynamicResource ColorBrush7}">')
    lines.append('                <Grid>')
    lines.append('                    <TextBlock Text="&quot;" FontSize="72" FontFamily="Georgia" FontWeight="Bold" Foreground="{DynamicResource ColorBrush6}" HorizontalAlignment="Left" VerticalAlignment="Top" Margin="-4,-24,0,0" Opacity="0.7" />')
    lines.append('                    <StackPanel Margin="26,0,0,0">')
    lines.append('                        <StackPanel Orientation="Horizontal" Margin="0,0,0,10">')
    lines.append('                            <Border Width="3" Height="12" CornerRadius="1.5" Background="{DynamicResource ColorBrush1}" Margin="0,0,8,0" VerticalAlignment="Center" />')
    lines.append('                            <TextBlock Text="每日一言" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />')
    lines.append('                        </StackPanel>')
    lines.append('                        <TextBlock TextWrapping="Wrap" FontSize="13" LineHeight="21" Foreground="{DynamicResource ColorBrush1}" Margin="0,0,0,12" Text="' + quote + '" />')
    lines.append('                        <local:MyIconTextButton Height="32" HorizontalAlignment="Right" Padding="16,0,16,0" Text="换一句" LogoScale="0.8" ColorType="Highlight" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />')
    lines.append('                    </StackPanel>')
    lines.append('                </Grid>')
    lines.append('            </Border>')

    lines.append('            <Grid>')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')

    lines.append('                <Border Grid.Column="0" CornerRadius="10" Padding="16,14" Margin="0,0,6,0" Background="{DynamicResource ColorBrush7}" ClipToBounds="True">')
    lines.append('                    <Grid>')
    lines.append('                        <TextBlock Text="' + str(lucky_number) + '" FontSize="80" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" HorizontalAlignment="Right" VerticalAlignment="Center" Margin="0,0,-12,0" Opacity="0.06" />')
    lines.append('                        <StackPanel>')
    lines.append('                            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,8">')
    lines.append('                                <local:MyImage Width="16" Height="16" Margin="0,0,6,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/GoldBlock.png" />')
    lines.append('                                <TextBlock Text="幸运数字" FontSize="11" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />')
    lines.append('                            </StackPanel>')
    lines.append('                            <TextBlock Text="' + str(lucky_number) + '" FontSize="34" FontWeight="Bold" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                        </StackPanel>')
    lines.append('                    </Grid>')
    lines.append('                </Border>')

    lines.append('                <Border Grid.Column="1" CornerRadius="10" Padding="16,14" Margin="6,0,0,0" Background="{DynamicResource ColorBrush7}">')
    lines.append('                    <StackPanel>')
    lines.append('                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,8">')
    lines.append('                            <local:MyImage Width="16" Height="16" Margin="0,0,6,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/RedstoneLampOn.png" />')
    lines.append('                            <TextBlock Text="幸运颜色" FontSize="11" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />')
    lines.append('                        </StackPanel>')
    lines.append('                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">')
    lines.append('                            <Grid Width="28" Height="28" Margin="0,0,10,0" VerticalAlignment="Center">')
    lines.append('                                <Border CornerRadius="14" Background="' + lucky_color["hex"] + '" />')
    lines.append('                                <Border CornerRadius="14" BorderBrush="#44FFFFFF" BorderThickness="1" />')
    lines.append('                                <Ellipse Width="8" Height="8" Fill="#55FFFFFF" HorizontalAlignment="Left" VerticalAlignment="Top" Margin="5,5,0,0" />')
    lines.append('                            </Grid>')
    lines.append('                            <TextBlock Text="' + lucky_color["name"] + '" FontSize="15" FontWeight="Bold" VerticalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                        </StackPanel>')
    lines.append('                    </StackPanel>')
    lines.append('                </Border>')
    lines.append('            </Grid>')

    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')
    # ========== 卡片：每日签到 + 排行榜 ==========
    lines.append('    <local:MyCard Title="每日签到" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <!-- __CHECKIN_HINT__ -->')
    lines.append('            <Grid>')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <Border Grid.Column="0" CornerRadius="10" Padding="10,12" Margin="0,0,4,0" Background="{DynamicResource ColorBrush7}">')
    lines.append('                    <StackPanel>')
    lines.append('                        <TextBlock Text="连续签到" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                        <TextBlock Text="__CHECKIN_STREAK__" FontSize="26" FontWeight="Bold" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" Margin="0,4,0,0" />')
    lines.append('                        <TextBlock Text="天" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                    </StackPanel>')
    lines.append('                </Border>')
    lines.append('                <Border Grid.Column="1" CornerRadius="10" Padding="10,12" Margin="4,0" Background="{DynamicResource ColorBrush7}">')
    lines.append('                    <StackPanel>')
    lines.append('                        <TextBlock Text="累计签到" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                        <TextBlock Text="__CHECKIN_TOTAL__" FontSize="26" FontWeight="Bold" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" Margin="0,4,0,0" />')
    lines.append('                        <TextBlock Text="天" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                    </StackPanel>')
    lines.append('                </Border>')
    lines.append('                <Border Grid.Column="2" CornerRadius="10" Padding="10,12" Margin="4,0,0,0" Background="{DynamicResource ColorBrush7}">')
    lines.append('                    <StackPanel>')
    lines.append('                        <TextBlock Text="今日已签" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                        <TextBlock Text="__CHECKIN_TODAY__" FontSize="26" FontWeight="Bold" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" Margin="0,4,0,0" />')
    lines.append('                        <TextBlock Text="人" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                    </StackPanel>')
    lines.append('                </Border>')
    lines.append('            </Grid>')
    lines.append('            <local:MyButton Height="40" HorizontalAlignment="Center" Padding="30,0,30,0" Margin="0,14,0,0" ColorType="Highlight" Text="立即签到">')
    lines.append('                <local:CustomEventService.Events>')
    lines.append('                    <local:CustomEventCollection>')
    lines.append('                        <local:CustomEvent Type="弹出窗口" Data="每日签到|__CHECKIN_MSG__" />')
    lines.append('                        <local:CustomEvent Type="刷新页面" Data="-" />')
    lines.append('                    </local:CustomEventCollection>')
    lines.append('                </local:CustomEventService.Events>')
    lines.append('            </local:MyButton>')
    lines.append('            <local:MyHint Theme="Blue" Margin="0,14,0,0" Text="打开主页即自动签到，点击按钮可查看签到结果。" />')
    lines.append('            <Border Height="1" Background="{DynamicResource ColorBrush6}" Margin="0,14,0,12" />')
    lines.append('            <StackPanel Orientation="Horizontal" Margin="0,0,0,10">')
    lines.append('                <Border Width="3" Height="12" CornerRadius="1.5" Background="{DynamicResource ColorBrush1}" Margin="0,0,8,0" VerticalAlignment="Center" />')
    lines.append('                <TextBlock Text="签到排行榜" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />')
    lines.append('                <TextBlock Text="  ·  我的排名：__CHECKIN_RANK_TEXT__" FontSize="11" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />')
    lines.append('            </StackPanel>')
    lines.append('            <!-- __CHECKIN_BOARD__ -->')
    lines.append('            <local:MyHint Theme="Yellow" Margin="0,6,0,0" Text="排行榜按玩家 ID 统计累计签到天数，每天更新。你的 ID 会高亮显示。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')
    # ========== 卡片 2：服务器推荐 ==========
    lines.append('    <local:MyCard Title="服务器推荐" Margin="0,0,0,15" CanSwap="True" IsSwapped="True">')
    lines.append('        <StackPanel Margin="25,40,23,20">')

    lines.append('            <local:MyHint Theme="Blue" Margin="0,0,0,14" Text="推荐服务器：Hypixel。复制下方地址，在游戏内「多人游戏 → 添加服务器」中粘贴即可。" />')

    # 主推服务器大卡
    lines.append('            <Border CornerRadius="10" Padding="18,16" Margin="0,0,0,14" Background="{DynamicResource ColorBrush7}">')
    lines.append('                <StackPanel>')
    lines.append('                    <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,10">')
    lines.append('                        <local:MyImage Width="18" Height="18" Margin="0,0,8,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/Grass.png" />')
    lines.append('                        <TextBlock Text="推荐服务器地址" FontSize="11" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />')
    lines.append('                    </StackPanel>')
    lines.append('                    <TextBlock Text="' + server_address + '" FontSize="22" FontWeight="Bold" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" Margin="0,0,0,14" />')
    lines.append('                    <local:MyButton Height="38" Text="复制服务器地址" EventType="复制文本" EventData="' + server_address + '" />')
    lines.append('                </StackPanel>')
    lines.append('            </Border>')

    # 其他服务器列表
    lines.append('            <StackPanel Orientation="Horizontal" Margin="0,0,0,10">')
    lines.append('                <Border Width="3" Height="12" CornerRadius="1.5" Background="{DynamicResource ColorBrush1}" Margin="0,0,8,0" VerticalAlignment="Center" />')
    lines.append('                <TextBlock Text="其他服务器" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />')
    lines.append('            </StackPanel>')

    for srv in server_list:
        srv_name = srv["name"]
        srv_addr = srv["address"]

        lines.append('            <Border CornerRadius="10" Padding="14,12" Margin="0,0,0,8" Background="{DynamicResource ColorBrush7}">')
        lines.append('                <Grid>')
        lines.append('                    <Grid.ColumnDefinitions>')
        lines.append('                        <ColumnDefinition Width="*" />')
        lines.append('                        <ColumnDefinition Width="Auto" />')
        lines.append('                    </Grid.ColumnDefinitions>')
        lines.append('                    <StackPanel Grid.Column="0" VerticalAlignment="Center">')
        lines.append('                        <TextBlock Text="' + srv_name + '" FontSize="14" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
        lines.append('                        <TextBlock Text="' + srv_addr + '" FontSize="11" Foreground="{DynamicResource ColorBrush3}" Margin="0,2,0,0" />')
        lines.append('                    </StackPanel>')
        lines.append('                    <local:MyIconTextButton Grid.Column="1" Height="32" Padding="12,0,12,0" Text="复制" LogoScale="0.8" ColorType="Highlight" Logo="M320 128h384c35 0 64 29 64 64v384c0 35-29 64-64 64H320c-35 0-64-29-64-64V192c0-35 29-64 64-64z M320 192v384h384V192H320z M256 320H192c-35 0-64 29-64 64v384c0 35 29 64 64 64h384c35 0 64-29 64-64v-64h-64v64H192V384h64V320z" EventType="复制文本" EventData="' + srv_addr + '" />')
        lines.append('                </Grid>')
        lines.append('            </Border>')

    # 推荐按钮
    lines.append('            <local:MyIconTextButton HorizontalAlignment="Center" Margin="0,8,0,0" Height="40" Padding="24,0,24,0" Text="推荐服务器" ColorType="Highlight" LogoScale="0.9" Logo="M128 256l384 256 384-256v512H128V256z M512 576L128 320V192h768v128z M128 128h768v64H128z">')
    lines.append('                <local:CustomEventService.Events>')
    lines.append('                    <local:CustomEventCollection>')
    lines.append('                        <local:CustomEvent Type="弹出窗口" Data="推荐服务器|请发送邮件到：&#xA;&#xA;jklahhranget@163.com&#xA;&#xA;邮件标题请注明「服务器推荐」。" />')
    lines.append('                    </local:CustomEventCollection>')
    lines.append('                </local:CustomEventService.Events>')
    lines.append('            </local:MyIconTextButton>')

    lines.append('            <local:MyHint Theme="Yellow" Margin="0,14,0,0" Text="想推荐自己的服务器？点上方按钮查看投稿邮箱。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')
    # ========== 卡片 3：你的信息 ==========
    lines.append('    <local:MyCard Title="你的信息" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')

    lines.append('            <Border CornerRadius="10" Padding="18,16" Margin="0,0,0,14" Background="{DynamicResource ColorBrush7}">')
    lines.append('                <StackPanel>')
    lines.append('                    <Grid Margin="0,0,0,12">')
    lines.append('                        <Grid.ColumnDefinitions>')
    lines.append('                            <ColumnDefinition Width="Auto" />')
    lines.append('                            <ColumnDefinition Width="*" />')
    lines.append('                        </Grid.ColumnDefinitions>')
    lines.append('                        <local:MyImage Grid.Column="0" Width="22" Height="22" Margin="0,0,14,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/CommandBlock.png" />')
    lines.append('                        <StackPanel Grid.Column="1" VerticalAlignment="Center">')
    lines.append('                            <TextBlock Text="玩家 ID" FontSize="11" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                            <TextBlock Text="{user}" FontSize="14" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" Margin="0,2,0,0" />')
    lines.append('                            <TextBlock Text="{user}" FontSize="1" Foreground="Transparent" />')
    lines.append('                        </StackPanel>')
    lines.append('                    </Grid>')
    lines.append('                    <Border Height="1" Background="{DynamicResource ColorBrush6}" Margin="0,0,0,12" />')
    lines.append('                    <Grid>')
    lines.append('                        <Grid.ColumnDefinitions>')
    lines.append('                            <ColumnDefinition Width="Auto" />')
    lines.append('                            <ColumnDefinition Width="*" />')
    lines.append('                        </Grid.ColumnDefinitions>')
    lines.append('                        <local:MyImage Grid.Column="0" Width="22" Height="22" Margin="0,0,14,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/RedstoneBlock.png" />')
    lines.append('                        <StackPanel Grid.Column="1" VerticalAlignment="Center">')
    lines.append('                            <TextBlock Text="公网 IP" FontSize="11" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                            <TextBlock Text="' + user_ip + '" FontSize="14" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" Margin="0,2,0,0" />')
    lines.append('                        </StackPanel>')
    lines.append('                    </Grid>')
    lines.append('                </StackPanel>')
    lines.append('            </Border>')

    lines.append('            <Grid>')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <local:MyIconTextButton Grid.Column="0" Margin="0,0,6,0" Height="42" Text="内存优化" LogoScale="0.9" ColorType="Highlight" Logo="M128 192h768v192H128z M128 448h768v192H128z M256 224v128 M256 480v128" EventType="内存优化" EventData="-" />')
    lines.append('                <local:MyIconTextButton Grid.Column="1" Margin="6,0,0,0" Height="42" Text="清理垃圾" LogoScale="0.9" ColorType="Highlight" Logo="M384 128h256l32 64h192v64H160v-64h192z M224 320h576l-48 512H272z M384 384v384h64V384z M576 384v384h64V384z" EventType="清理垃圾" EventData="-" />')
    lines.append('            </Grid>')

    lines.append('            <local:MyHint Theme="Blue" Margin="0,14,0,0" Text="内存优化会释放 PCL 占用的内存，清理垃圾会删除 PCL 的临时文件。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 4：随机挑战 ==========
    lines.append('    <local:MyCard Title="随机挑战" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')

    lines.append('            <Border CornerRadius="12" Height="160" Margin="0,0,0,14" ClipToBounds="True">')
    lines.append('                <Grid>')
    lines.append('                    <Border>')
    lines.append('                        <Border.Background>')
    lines.append('                            <LinearGradientBrush StartPoint="0,0" EndPoint="1,1">')
    lines.append('                                <GradientStop Color="#4A1A2E" Offset="0" />')
    lines.append('                                <GradientStop Color="#2D1B4E" Offset="1" />')
    lines.append('                            </LinearGradientBrush>')
    lines.append('                        </Border.Background>')
    lines.append('                    </Border>')
    lines.append('                    <Border HorizontalAlignment="Left" VerticalAlignment="Top" Margin="18,16,0,0" Background="#66FFFFFF" CornerRadius="10" Padding="10,4,10,4">')
    lines.append('                        <StackPanel Orientation="Horizontal">')
    lines.append('                            <local:MyImage Width="14" Height="14" Margin="0,0,6,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/CommandBlock.png" />')
    lines.append('                            <TextBlock Text="本次挑战" FontSize="10" FontWeight="Bold" Foreground="White" VerticalAlignment="Center" />')
    lines.append('                        </StackPanel>')
    lines.append('                    </Border>')
    lines.append('                    <Border HorizontalAlignment="Right" VerticalAlignment="Top" Margin="0,16,18,0" Background="#CCFF5555" CornerRadius="10" Padding="10,4,10,4">')
    lines.append('                        <TextBlock Text="' + challenge_diff + '" FontSize="10" FontWeight="Bold" Foreground="White" />')
    lines.append('                    </Border>')
    lines.append('                    <TextBlock Text="' + challenge + '" FontSize="22" FontWeight="Bold" HorizontalAlignment="Center" VerticalAlignment="Center" TextWrapping="Wrap" Foreground="White" Margin="24,0" TextAlignment="Center" />')
    lines.append('                </Grid>')
    lines.append('            </Border>')

    lines.append('            <local:MyIconTextButton HorizontalAlignment="Center" Height="40" Padding="24,0,24,0" Text="换一个挑战" ColorType="Highlight" LogoScale="0.9" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />')
    lines.append('            <local:MyHint Theme="Yellow" Margin="0,14,0,0" Text="挑战由 Cloudflare Functions 随机生成，每次刷新都不一样。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 5：当前最新版本 ==========
    lines.append('    <local:MyCard Title="' + news_title + '" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')

    lines.append('            <Border CornerRadius="12" Height="200" Margin="0,0,0,14" Background="{DynamicResource ColorBrush7}" ClipToBounds="True">')
    lines.append('                <Grid>')
    lines.append('                    <local:MyImage Source="' + version_image_source + '" HorizontalAlignment="Center" VerticalAlignment="Center" Stretch="UniformToFill" />')
    lines.append('                    <Border HorizontalAlignment="Center" VerticalAlignment="Bottom" Background="#CC1A1A1A" CornerRadius="12" Padding="18,6,18,6" Margin="0,0,0,16" BorderBrush="#33FFFFFF" BorderThickness="1">')
    lines.append('                        <StackPanel Orientation="Horizontal">')
    lines.append('                            <Border Width="6" Height="6" CornerRadius="3" Background="#17DD62" VerticalAlignment="Center" Margin="0,0,8,0" />')
    lines.append('                            <TextBlock Text="' + main_version + '" FontSize="14" FontWeight="Bold" Foreground="White" VerticalAlignment="Center" />')
    lines.append('                        </StackPanel>')
    lines.append('                    </Border>')
    lines.append('                </Grid>')
    lines.append('            </Border>')

    if second_version and second_version != main_version:
        version_info = main_label + "：" + main_version + "  ·  " + second_label + "：" + second_version
    else:
        version_info = main_label + "：" + main_version
    lines.append('            <TextBlock Text="' + version_info + '" HorizontalAlignment="Center" FontSize="11" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,14" />')

    lines.append('            <TextBlock Text="最后更新 ' + main_date + '" FontSize="11" Foreground="#FFAA00" HorizontalAlignment="Right" Margin="0,0,0,14" />')

    lines.append('            <Border Height="1" Background="{DynamicResource ColorBrush6}" Margin="0,0,0,14" />')

    lines.append('            <StackPanel Orientation="Horizontal" Margin="0,0,0,10">')
    lines.append('                <Border Width="3" Height="12" CornerRadius="1.5" Background="{DynamicResource ColorBrush1}" Margin="0,0,8,0" VerticalAlignment="Center" />')
    lines.append('                <TextBlock Text="最近正式版" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />')
    lines.append('            </StackPanel>')

    if recent_releases:
        for idx, rel in enumerate(recent_releases):
            is_latest = (idx == 0)
            if is_latest:
                info_text = rel["date"] + " · " + ("今天" if rel["days_ago"] == 0 else ("昨天" if rel["days_ago"] == 1 else str(rel["days_ago"]) + " 天前")) + " · 最新"
            else:
                if rel["days_ago"] == 0:
                    days_text = "今天"
                elif rel["days_ago"] == 1:
                    days_text = "昨天"
                else:
                    days_text = str(rel["days_ago"]) + " 天前"
                info_text = rel["date"] + " · " + days_text
            lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Grass.png" Title="启动 ' + rel["version"] + '" Info="' + info_text + '" EventType="启动游戏" EventData="' + rel["version"] + '" />')
    else:
        lines.append('            <local:MyHint Theme="Yellow" Text="暂时无法获取版本列表。" />')

    lines.append('            <local:MyHint Theme="Blue" Margin="0,6,0,14" Text="数据来源：Mojang 官方版本清单，只显示正式版。点击任意版本可直接启动。" />')

    # ========== 更新内容 ==========
    lines.append('            <Border Height="1" Background="{DynamicResource ColorBrush6}" Margin="0,0,0,14" />')
    lines.append('            <StackPanel Orientation="Horizontal" Margin="0,0,0,10">')
    lines.append('                <Border Width="3" Height="12" CornerRadius="1.5" Background="{DynamicResource ColorBrush1}" Margin="0,0,8,0" VerticalAlignment="Center" />')
    lines.append('                <TextBlock Text="更新内容" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />')
    lines.append('            </StackPanel>')

    if wiki_changelog["ok"]:
        for sec in wiki_changelog["sections"]:
            escaped_heading = escape_xaml_attr(sec["heading"])
            lines.append('            <Border CornerRadius="10" Padding="18,16" Margin="0,0,0,10" Background="{DynamicResource ColorBrush7}">')
            lines.append('                <StackPanel>')
            lines.append('                    <StackPanel Orientation="Horizontal" Margin="0,0,0,10">')
            lines.append('                        <Border Width="3" Height="14" CornerRadius="1.5" Background="#FF4444" Margin="0,0,8,0" VerticalAlignment="Center" />')
            lines.append('                        <TextBlock Text="' + escaped_heading + '" FontSize="14" FontWeight="Bold" Foreground="#FF4444" VerticalAlignment="Center" />')
            lines.append('                    </StackPanel>')
            for item in sec["items"]:
                escaped_item = escape_xaml_attr(item)
                lines.append('                    <TextBlock Text="· ' + escaped_item + '" FontSize="13" LineHeight="22" TextWrapping="Wrap" Foreground="{DynamicResource ColorBrush1}" Margin="0,0,0,6" />')
            lines.append('                </StackPanel>')
            lines.append('            </Border>')
    else:
        lines.append('            <local:MyLoading Margin="0,8,0,14" Text="翻译施工中" />')

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
    lines.append('                <local:MyIconTextButton Grid.Column="3" Text="更新日志" LogoScale="0.9" ColorType="Highlight" Logo="M192 64h384l256 256v576c0 35-29 64-64 64H192c-35 0-64-29-64-64V128c0-35 29-64 64-64z M576 64v256h256z" EventType="打开网页" EventData="' + wiki_version_url + '" />')
    lines.append('            </Grid>')

    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 6：常用链接 ==========
    lines.append('    <local:MyCard Title="常用链接" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Grass.png" Title="Minecraft Wiki" Info="查阅方块、生物与游戏机制" EventType="打开网页" EventData="https://zh.minecraft.wiki/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/RedstoneBlock.png" Title="苦力怕论坛" Info="Minecraft 中文资源与交流社区" EventType="打开网页" EventData="https://klpbbs.com/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/GoldBlock.png" Title="Hypixel" Info="全球最大的 Minecraft 小游戏服务器" EventType="打开网页" EventData="https://hypixel.net/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Anvil.png" Title="Modrinth" Info="下载模组、整合包与资源包" EventType="打开网页" EventData="https://modrinth.com/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="https://www.mcmod.cn/images/favicon.ico" Title="MC百科" Info="最大的 Minecraft 中文 MOD 百科" EventType="打开网页" EventData="https://www.mcmod.cn/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/CommandBlock.png" Title="MCDoctor" Info="AI 崩溃日志分析，自动诊断崩溃原因" EventType="打开网页" EventData="https://mcdoctor.ai/" />')
    lines.append('            <local:MyListItem Margin="-5,0,-5,0" Type="Clickable" Logo="https://s.namemc.com/img/favicon-128.png" Title="NameMC" Info="查询 Minecraft 皮肤与用户名" EventType="打开网页" EventData="https://namemc.com/" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 7：游戏指令速查 ==========
    lines.append('    <local:MyCard Title="游戏指令速查" Margin="0,0,0,15" CanSwap="True" IsSwapped="True">')
    lines.append('        <StackPanel Margin="25,40,23,20">')

    for group_idx, (group_title, cmds) in enumerate(CMD_GROUPS):
        margin_bottom = "0" if group_idx == len(CMD_GROUPS) - 1 else "12"
        bar_color = "{DynamicResource ColorBrush1}" if "1.20.5" in group_title or "1.13" in group_title else "{DynamicResource ColorBrush3}"

        lines.append('            <Border CornerRadius="10" Padding="14,12" Margin="0,0,0,' + margin_bottom + '" Background="{DynamicResource ColorBrush7}">')
        lines.append('                <StackPanel>')

        lines.append('                    <StackPanel Orientation="Horizontal" Margin="0,0,0,10">')
        lines.append('                        <Border Width="3" Height="14" CornerRadius="1.5" Background="' + bar_color + '" Margin="0,0,8,0" VerticalAlignment="Center" />')
        lines.append('                        <TextBlock Text="' + group_title + '" FontSize="12" FontWeight="Bold" Foreground="' + bar_color + '" VerticalAlignment="Center" />')
        lines.append('                    </StackPanel>')

        lines.append('                    <Grid>')
        lines.append('                        <Grid.ColumnDefinitions>')
        lines.append('                            <ColumnDefinition Width="1*" />')
        lines.append('                            <ColumnDefinition Width="1*" />')
        lines.append('                            <ColumnDefinition Width="1*" />')
        lines.append('                        </Grid.ColumnDefinitions>')
        for i, (btn_text, cmd, tip) in enumerate(cmds):
            margin = ' Margin="0,0,8,0"' if i < 2 else ''
            escaped_cmd = escape_xaml_attr(cmd)
            escaped_tip = escape_xaml_attr(tip)
            lines.append('                        <local:MyIconTextButton Grid.Column="' + str(i) + '"' + margin + ' Height="38" Text="' + btn_text + '" ToolTip="' + escaped_tip + '" LogoScale="0.9" ColorType="Highlight" Logo="M320 128h384c35 0 64 29 64 64v384c0 35-29 64-64 64H320c-35 0-64-29-64-64V192c0-35 29-64 64-64z M320 192v384h384V192H320z M256 320H192c-35 0-64 29-64 64v384c0 35 29 64 64 64h384c35 0 64-29 64-64v-64h-64v64H192V384h64V320z" EventType="复制文本" EventData="' + escaped_cmd + '" />')
        lines.append('                    </Grid>')

        lines.append('                </StackPanel>')
        lines.append('            </Border>')

    lines.append('            <local:MyHint Theme="Yellow" Margin="0,14,0,10" Text="指令适用于 Java 版 1.13 及以上。&#xA;玩家头颅指令按版本分为两组，请根据自己的游戏版本选择。" />')
    lines.append('            <local:MyHint Theme="Blue" Text="需要开启作弊或创造模式。复制后进游戏按 T，Ctrl+V 粘贴即可。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 8：彩蛋 ==========
    lines.append('    <local:MyCard Title="彩蛋" Margin="0,0,0,15" CanSwap="True" IsSwapped="True">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <Border CornerRadius="10" Padding="16,14" Margin="0,0,0,14" Background="{DynamicResource ColorBrush7}">')
    lines.append('                <StackPanel Orientation="Horizontal">')
    lines.append('                    <local:MyImage Width="40" Height="40" Margin="0,0,14,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/Egg.png" />')
    lines.append('                    <StackPanel VerticalAlignment="Center">')
    lines.append('                        <TextBlock Text="每次点开都不一样" FontSize="13" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                        <TextBlock Text="看看你能抽到什么" FontSize="11" Foreground="{DynamicResource ColorBrush3}" Margin="0,4,0,0" />')
    lines.append('                    </StackPanel>')
    lines.append('                </StackPanel>')
    lines.append('            </Border>')
    lines.append('            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">')
    lines.append('                <local:MyIconTextButton Margin="0,0,16,0" Height="40" Padding="22,0,22,0" Text="打开彩蛋" ColorType="Highlight" LogoScale="0.9" Logo="M320 128h384c35 0 64 29 64 64v640c0 35-29 64-64 64H320c-35 0-64-29-64-64V192c0-35 29-64 64-64z M320 192v640h384V192H320z M384 256h256v64H384z M384 384h256v64H384z M384 512h256v64H384z">')
    lines.append('                    <local:CustomEventService.Events>')
    lines.append('                        <local:CustomEventCollection>')
    lines.append('                            <local:CustomEvent Type="弹出窗口" Data="' + egg_data + '" />')
    lines.append('                            <local:CustomEvent Type="刷新页面" Data="-" />')
    lines.append('                        </local:CustomEventCollection>')
    lines.append('                    </local:CustomEventService.Events>')
    lines.append('                </local:MyIconTextButton>')
    lines.append('                <local:MyIconTextButton Height="40" Padding="22,0,22,0" Text="刷新主页" LogoScale="0.9" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />')
    lines.append('            </StackPanel>')
    lines.append('            <local:MyHint Theme="Yellow" Margin="0,16,0,0" Text="彩蛋由 Cloudflare Functions 动态生成，每次刷新都会换一个。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 9：今日运势 ==========
    lines.append('    <local:MyCard Title="今日运势" Margin="0,0,0,15" CanSwap="True" IsSwapped="True">')
    lines.append('        <StackPanel Margin="25,40,23,20">')

    lines.append('            <TextBlock Text="今日得分" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" />')
    lines.append('            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,14">')
    lines.append('                <TextBlock Text="' + str(score) + '" FontSize="56" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                <TextBlock Text="分" FontSize="14" VerticalAlignment="Bottom" Foreground="{DynamicResource ColorBrush3}" Margin="6,0,0,14" />')
    lines.append('            </StackPanel>')
    lines.append('            <!-- __SCORE_BAR__ -->')
    lines.append('            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,14">')
    lines.append('                <TextBlock Text="评级 " FontSize="13" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                <TextBlock Text="' + grade + '" FontSize="18" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('            </StackPanel>')

    lines.append('            <Grid Margin="0,0,0,12">')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <Border Grid.Column="0" CornerRadius="10" Padding="14,12" Margin="0,0,6,0" Background="#1F17DD62">')
    lines.append('                    <StackPanel>')
    lines.append('                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,6">')
    lines.append('                            <TextBlock Text="宜" FontSize="12" FontWeight="Bold" Foreground="#17DD62" />')
    lines.append('                        </StackPanel>')
    lines.append('                        <TextBlock Text="' + fortune_good + '" FontSize="15" FontWeight="Bold" HorizontalAlignment="Center" Foreground="#17DD62" />')
    lines.append('                    </StackPanel>')
    lines.append('                </Border>')
    lines.append('                <Border Grid.Column="1" CornerRadius="10" Padding="14,12" Margin="6,0,0,0" Background="#1FFF5555">')
    lines.append('                    <StackPanel>')
    lines.append('                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,6">')
    lines.append('                            <TextBlock Text="忌" FontSize="12" FontWeight="Bold" Foreground="#FF5555" />')
    lines.append('                        </StackPanel>')
    lines.append('                        <TextBlock Text="' + fortune_bad + '" FontSize="15" FontWeight="Bold" HorizontalAlignment="Center" Foreground="#FF5555" />')
    lines.append('                    </StackPanel>')
    lines.append('                </Border>')
    lines.append('            </Grid>')

    lines.append('            <local:MyHint Theme="Blue" Margin="0,0,0,10" Text="' + comment + '" />')
    lines.append('            <local:MyHint Theme="Yellow" Text="小贴士：' + fortune_tip + '" />')

    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 10：今日种子推荐 ==========
    lines.append('    <local:MyCard Title="今日种子推荐" Margin="0,0,0,15" CanSwap="True" IsSwapped="True">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <Border CornerRadius="10" Padding="16,14" Margin="0,0,0,14" Background="{DynamicResource ColorBrush7}">')
    lines.append('                <StackPanel Orientation="Horizontal">')
    lines.append('                    <local:MyImage Width="36" Height="36" Margin="0,0,14,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/Grass.png" />')
    lines.append('                    <StackPanel VerticalAlignment="Center">')
    lines.append('                        <TextBlock Text="种子" FontSize="11" Foreground="{DynamicResource ColorBrush3}" />')
    lines.append('                        <TextBlock Text="' + seed + '" FontSize="20" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" Margin="0,4,0,0" />')
    lines.append('                    </StackPanel>')
    lines.append('                </StackPanel>')
    lines.append('            </Border>')
    lines.append('            <local:MyHint Theme="Blue" Margin="0,0,0,12" Text="' + seed_desc + '" />')
    lines.append('            <local:MyButton Height="38" Text="复制种子" EventType="复制文本" EventData="' + seed + '" />')
    lines.append('            <local:MyHint Theme="Yellow" Margin="0,14,0,0" Text="创建新世界时，在「种子」栏粘贴即可。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 11：MC 知识小测（默认折叠） ==========
    lines.append('    <local:MyCard Title="MC 知识小测" Margin="0,0,0,15" CanSwap="True" IsSwapped="True">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <Border CornerRadius="10" Padding="20,18" Margin="0,0,0,14" Background="{DynamicResource ColorBrush7}">')
    lines.append('                <StackPanel>')
    lines.append('                    <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">')
    lines.append('                        <local:MyImage Width="20" Height="20" Margin="0,0,8,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/Bookshelf.png" />')
    lines.append('                        <TextBlock Text="每日一题" FontSize="11" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />')
    lines.append('                    </StackPanel>')
    lines.append('                    <TextBlock Text="' + quiz_q + '" FontSize="15" FontWeight="Bold" HorizontalAlignment="Center" TextWrapping="Wrap" LineHeight="24" Foreground="{DynamicResource ColorBrush1}" />')
    lines.append('                </StackPanel>')
    lines.append('            </Border>')
    lines.append('            <local:MyIconTextButton HorizontalAlignment="Center" Height="40" Padding="24,0,24,0" Text="查看答案" ColorType="Highlight" LogoScale="0.9" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M512 320a128 128 0 0 1 128 128c0 64-64 96-96 128v32h-64v-48c0-64 96-80 96-112a64 64 0 1 0-128 0h-64a128 128 0 0 1 128-128z M480 640h64v64h-64z">')
    lines.append('                <local:CustomEventService.Events>')
    lines.append('                    <local:CustomEventCollection>')
    lines.append('                        <local:CustomEvent Type="弹出窗口" Data="每日一题 · 答案|' + quiz_a + '" />')
    lines.append('                    </local:CustomEventCollection>')
    lines.append('                </local:CustomEventService.Events>')
    lines.append('            </local:MyIconTextButton>')
    lines.append('            <local:MyHint Theme="Blue" Margin="0,14,0,0" Text="每天更新一道 MC 知识题，看看你能答对几道。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 12：反馈 ==========
    lines.append('    <local:MyCard Title="反馈" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <TextBlock TextWrapping="Wrap" Margin="0,0,0,14" FontSize="13" LineHeight="20" Foreground="{DynamicResource ColorBrush1}" Text="如果主页有问题、想加新功能，或想提建议，欢迎在 GitHub 留言。也可以直接查看源代码。" />')
    lines.append('            <Grid>')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <local:MyIconTextButton Grid.Column="0" Margin="0,0,6,0" Height="40" Text="问题反馈" LogoScale="0.9" ColorType="Highlight" Logo="M512 0C229 0 0 229 0 512c0 226 147 418 351 486 26 5 35-11 35-25 0-12 0-44-1-86-143 31-173-69-173-69-23-59-57-75-57-75-47-32 4-31 4-31 52 4 79 53 79 53 46 79 121 56 150 43 5-33 18-56 33-69-114-13-234-57-234-254 0-56 20-102 53-138-5-13-23-65 5-136 0 0 43-14 141 53 41-11 85-17 129-17s88 6 129 17c98-67 141-53 141-53 28 71 10 123 5 136 33 36 53 82 53 138 0 198-120 241-235 254 18 16 35 47 35 95 0 69-1 124-1 141 0 14 9 30 35 25 204-68 351-260 351-486C1024 229 795 0 512 0z" EventType="打开网页" EventData="' + FEEDBACK_URL + '" />')
    lines.append('                <local:MyIconTextButton Grid.Column="1" Margin="6,0,0,0" Height="40" Text="查看源码" LogoScale="0.9" Logo="M384 320l-192 192 192 192z M640 320v384l192-192z" EventType="打开网页" EventData="' + SOURCE_URL + '" />')
    lines.append('            </Grid>')
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
    version_str = "0"
    version_file.write_text(version_str, encoding="utf-8")
    print("已写入版本号占位：" + version_str)


if __name__ == "__main__":
    main()
