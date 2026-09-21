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
import json
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

def fetch_version_manifest():
    """拉取 Mojang 版本清单（latest + 全部版本元数据），失败返回 None。"""
    try:
        resp = requests.get(VERSION_API, timeout=REQUEST_TIMEOUT, headers=HEADERS)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print("[Version] 版本清单请求失败：" + str(e))
        return None


def fetch_latest_version(manifest=None):
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
        data = manifest if manifest is not None else fetch_version_manifest()
        if not data:
            raise ValueError("版本清单为空")

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

def fetch_recent_releases(count=5, manifest=None):
    """获取最近 N 个正式版（release），返回 [{version, date, days_ago}, ...]"""
    try:
        data = manifest if manifest is not None else fetch_version_manifest()
        if not data:
            raise ValueError("版本清单为空")
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


def _changelog_popup_data(version, changelog):
    """把某版本的更新日志拼成弹窗 Data（标题|正文，正文换行，XAML 安全转义）。"""
    if not changelog or not changelog.get("ok") or not changelog.get("sections"):
        body = "该版本暂未抓取到中文更新日志，可到 Minecraft Wiki 查看原文。"
    else:
        parts = []
        for sec in changelog["sections"]:
            parts.append("【" + sec["heading"] + "】")
            for item in sec["items"]:
                parts.append("· " + item)
        body = "\n".join(parts)
        if len(body) > 1800:
            body = body[:1800] + "\n…"
    raw = version + " 更新总结|" + body
    return escape_xaml_attr(raw).replace("\n", "&#xA;")


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
            .replace(">", "&gt;")
            .replace("{", "&#123;")
            .replace("}", "&#125;"))


# ============ XAML 生成 ============

# ============ 模板渲染 ============
#
# 页面结构放在 templates/*.tpl（唯一来源），本脚本只负责把生成期动态值填进去。
# 中间件在请求时替换的占位符（双下划线包裹的大写标识）原样保留，不在此处理。
#
# 占位符写法：
#   {{TOKEN}}            填入文本（多行块在模板里顶格书写，缩进由 build_* 显式给出）
#   {{TOKEN|escape}}     填入前做 XAML 属性转义（& " < > { }）
#   {{TOKEN|url}}        填入前转义 & " 与尖括号（用于 URL）

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

_TOKEN_RE = re.compile(r"\{\{([A-Z][A-Z0-9_]*)(?:\|(escape|url))?\}\}")


def load_template(name):
    """读取 templates/<name>（UTF-8）。"""
    return (TEMPLATES_DIR / name).read_text(encoding="utf-8")


def _apply_filter(value, mode):
    if not mode:
        return value
    if mode == "url":
        return (value.replace("&", "&amp;").replace('"', "&quot;")
                     .replace("<", "&lt;").replace(">", "&gt;"))
    if mode == "escape":
        return escape_xaml_attr(value)
    raise ValueError("未知的模板过滤器：" + str(mode))


def render_template(text, values):
    """替换所有 {{TOKEN}} / {{TOKEN|filter}}，不做任何缩进推断。"""
    def repl(m):
        key, mode = m.group(1), m.group(2)
        if key not in values:
            raise KeyError("模板缺少取值：" + key)
        return _apply_filter(str(values[key]), mode)

    return _TOKEN_RE.sub(repl, text)


def indent_block(block, spaces):
    """给整段文本的每一行加统一缩进（空行不加）。"""
    pad = " " * spaces
    return "\n".join((pad + ln) if ln.strip() else ln for ln in block.split("\n"))


# ============ XAML 生成 ============

SERVER_ITEM_INDENT = 12


def _copy_button_logo():
    """“复制”按钮的矢量图标（panel.xaml.tpl 与服务器条目共用，避免两处重复）。"""
    return ("M320 128h384c35 0 64 29 64 64v384c0 35-29 64-64 64H320c-35 0-64-29-64-64V192c0-35 29-64 "
            "64-64z M320 192v384h384V192H320z M256 320H192c-35 0-64 29-64 64v384c0 35 29 64 64 64h384c35 0 "
            "64-29 64-64v-64h-64v64H192V384h64V320z")


def build_panel_xaml(server_list):
    """用 templates/panel.xaml.tpl 生成“更多功能”面板。

    服务器条目来自 SERVER_LIST，每条由 templates/server_item.tpl 渲染后整体缩进。
    """
    item_tpl = load_template("server_item.tpl")
    copy_logo = _copy_button_logo()

    items = []
    for srv in server_list:
        items.append(
            item_tpl
            .replace("{{NAME}}", escape_xaml_attr(srv["name"]))
            .replace("{{ADDRESS}}", escape_xaml_attr(srv["address"]))
            .replace("{{COPY_LOGO}}", copy_logo)
            .rstrip("\n")
        )

    server_items = indent_block("\n".join(items), SERVER_ITEM_INDENT)

    return render_template(load_template("panel.xaml.tpl"), {
        # 模板里占位符所在行自带换行，故此处不带尾换行，避免多出空行
        "SERVER_ITEMS": server_items,
        "COPY_LOGO": copy_logo,
    })


RELEASE_ITEM_INDENT = 12


def build_release_items(recent_releases, version_changelogs):
    """渲染“最近正式版”列表项（含更新总结弹窗）。"""
    if not recent_releases:
        return '            <local:MyHint Theme="Yellow" Text="暂时无法获取版本列表。" />'

    tpl = load_template("release_item.tpl")
    out = []
    for idx, rel in enumerate(recent_releases):
        if rel["days_ago"] == 0:
            days_text = "今天"
        elif rel["days_ago"] == 1:
            days_text = "昨天"
        else:
            days_text = str(rel["days_ago"]) + " 天前"
        info_text = rel["date"] + " · " + days_text
        if idx == 0:
            info_text += " · 最新"
        out.append(
            tpl
            .replace("{{VERSION}}", escape_xaml_attr(rel["version"]))
            .replace("{{INFO_TEXT}}", info_text)
            .replace("{{POPUP_DATA}}",
                     _changelog_popup_data(rel["version"], version_changelogs.get(rel["version"])))
            .rstrip("\n")
        )

    return indent_block("\n".join(out), RELEASE_ITEM_INDENT)


def resolve_version_image(main_version):
    """版本封面三级兜底：Wiki 封面 → 官方启动器新闻图 → 内置方块图标。"""
    if fetch_version_image(main_version, filename="version.png"):
        print("[Version-Image] 使用 Wiki 封面")
        return BASE_URL + "/" + IMAGES_DIR_NAME + "/version.png?v=" + main_version.replace(" ", "_")

    print("[Version-Image] Wiki 不可用，回退官方新闻图")
    official = fetch_official_version_image(main_version)
    if official:
        return official
    return "pack://application:,,,/images/Blocks/CommandBlock.png"


def build_xaml():
    now = datetime.now()

    clean_old_images()

    wallpaper_url = fetch_bing_wallpaper()

    manifest = fetch_version_manifest()
    ver = fetch_latest_version(manifest)
    release = ver["release"]
    snapshot = ver["snapshot"]
    release_date = ver["release_date"] if ver["release_date"] else now.strftime("%Y-%m-%d")
    snapshot_date = ver["snapshot_date"] if ver["snapshot_date"] else now.strftime("%Y-%m-%d")

    if snapshot:
        main_version = snapshot
        main_date = snapshot_date
    else:
        main_version = release
        main_date = release_date

    version_image_source = resolve_version_image(main_version)

    recent_releases = fetch_recent_releases(5, manifest)

    changelog_versions = []
    for _rel in (recent_releases or []):
        _ver = _rel["version"]
        if _ver not in changelog_versions:
            changelog_versions.append(_ver)
    if main_version not in changelog_versions:
        changelog_versions.append(main_version)
    version_changelogs = {}
    if changelog_versions:
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=min(6, len(changelog_versions))) as _ex:
            _results = list(_ex.map(fetch_wiki_changelog, changelog_versions))
        version_changelogs = dict(zip(changelog_versions, _results))

    server_list = fetch_server_list()
    panel_xaml = build_panel_xaml(server_list)

    xaml = render_template(load_template("Custom.xaml.tpl"), {
        "BASE_URL": BASE_URL,
        "WALLPAPER_URL": wallpaper_url,
        "VERSION_IMAGE_SOURCE": version_image_source,
        "MAIN_VERSION": main_version,
        "SNAP_VERSION": snapshot if snapshot else release,
        "MAIN_DATE": main_date,
        "WIKI_VERSION_URL": WIKI_PAGE_BASE + "Java版" + main_version,
        "RELEASE_ITEMS": build_release_items(recent_releases, version_changelogs),
    })

    return xaml, panel_xaml




def main():
    base_dir = Path(__file__).resolve().parent.parent
    output = base_dir / "Custom.xaml"

    xaml, panel_xaml = build_xaml()
    output.write_text(xaml, encoding="utf-8")
    print("已生成：" + str(output))

    panel_output = base_dir / "panel.xaml"
    panel_output.write_text(panel_xaml, encoding="utf-8")
    print("已生成：" + str(panel_output))

    panel_meta = json.dumps(
        {"Title": "更多功能", "Description": "实用工具 · 服务器推荐 · MC 知识"},
        ensure_ascii=False,
    )
    panel_json = base_dir / "panel.json"
    panel_json.write_text(panel_meta, encoding="utf-8")
    print("已生成：" + str(panel_json))

    version_file = base_dir / "Custom.xaml.version"
    version_str = "0"
    version_file.write_text(version_str, encoding="utf-8")
    print("已写入版本号占位：" + version_str)


if __name__ == "__main__":
    main()
