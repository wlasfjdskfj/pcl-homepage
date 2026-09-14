# -*- coding: utf-8 -*-
"""
PCL 主页生成脚本
由 GitHub Actions 定时运行，生成带动态数据的 Custom.xaml。
"""

import random
import requests
from datetime import datetime
from pathlib import Path

# ============ 配置 ============

NEWS_API = "https://news.bugjump.net/News.json"
WIKI_API = "https://zh.minecraft.wiki/api.php"
REQUEST_TIMEOUT = 10

# 你的 Cloudflare Pages 地址（不要带末尾斜杠）
BASE_URL = "https://pcl-homepage.pages.dev"

# 图片保存目录
IMAGES_DIR_NAME = "images"

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
    {"name": "草方块",   "wiki": "草方块",   "file": "grass.png",          "fallback": "Grass.png",          "desc": "Minecraft 的标志性方块，随处可见。"},
    {"name": "圆石",     "wiki": "圆石",     "file": "cobblestone.png",    "fallback": "Cobblestone.png",    "desc": "挖石头就能得到，建筑党的好帮手。"},
    {"name": "金块",     "wiki": "金块",     "file": "gold_block.png",     "fallback": "GoldBlock.png",      "desc": "9 个金锭合成，还能做信标底座。"},
    {"name": "命令方块", "wiki": "命令方块", "file": "command_block.png",  "fallback": "CommandBlock.png",   "desc": "创造模式的玩具，Minecraft 的魔法方块。"},
    {"name": "铁砧",     "wiki": "铁砧",     "file": "anvil.png",          "fallback": "Anvil.png",          "desc": "修复装备、附魔、重命名，掉落会砸脚。"},
    {"name": "红石块",   "wiki": "红石块",   "file": "redstone_block.png", "fallback": "RedstoneBlock.png",  "desc": "持续输出红石信号，可以永久激活装置。"},
    {"name": "鸡蛋",     "wiki": "鸡蛋",     "file": "egg.png",            "fallback": "Egg.png",            "desc": "扔出去有几率生成小鸡。"},
    {"name": "土径",     "wiki": "土径",     "file": "grass_path.png",     "fallback": "GrassPath.png",      "desc": "用锹右键草方块得到，走路不会踩坏草。"},
]

EGGS = [
    {"title": "神秘代码",   "content": "检测到一段古老的代码……&#xA;&#xA;恭喜你获得成就：手贱达人！"},
    {"title": "开发者留言", "content": "PCL 的作者说过：&#xA;「如果你倒腾这个文件把 PCL 玩炸了，把这个文件直接删除就行了。」"},
    {"title": "钻石雨",     "content": "天空下起了钻石雨！&#xA;&#xA;你捡到了：&#xA;钻石 × 64&#xA;绿宝石 × 64&#xA;&#xA;醒来后发现是做梦。"},
    {"title": "苦力怕的祝福", "content": "一只苦力怕悄悄靠近了你……&#xA;&#xA;sssssss……&#xA;&#xA;BOOM！"},
    {"title": "末影人的秘密", "content": "你盯着末影人看了太久……&#xA;&#xA;它留下了一张纸条：&#xA;「别看了，再看把你传送到虚空。」"},
    {"title": "幸运方块",   "content": "你打开了一个幸运方块……&#xA;&#xA;里面跳出了一只鸡。&#xA;鸡又下了一颗蛋。&#xA;&#xA;恭喜你实现了鸡蛋自由。"},
]

LUCKY_COLORS = [
    {"name": "钻石蓝",   "hex": "#4AEDD9"},
    {"name": "红石红",   "hex": "#FF5555"},
    {"name": "金锭黄",   "hex": "#FFAA00"},
    {"name": "绿宝石绿", "hex": "#17DD62"},
    {"name": "青金石蓝", "hex": "#2A4DD0"},
]


# ============ 新闻获取 ============

def fetch_news_homepage():
    """从 NewsHomepage API 获取最新版本信息，失败时返回兜底数据。"""
    default = {
        "version": "1.21",
        "changelog": "暂无更新信息。",
        "release_date": "",
        "server_url": "https://www.minecraft.net/zh-hans/download/server",
        "wiki_url": "https://zh.minecraft.wiki/",
        "changelog_url": "https://www.minecraft.net/zh-hans/download",
    }

    try:
        resp = requests.get(NEWS_API, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        latest = data.get("latest") or data.get("latest_card") or {}
        if latest:
            default["version"] = latest.get("version", default["version"])
            default["changelog"] = latest.get("changelog", default["changelog"])
            default["release_date"] = latest.get("release_date", default["release_date"])
            default["server_url"] = latest.get("server_url", default["server_url"])
            default["wiki_url"] = latest.get("wiki_url", default["wiki_url"])
            default["changelog_url"] = latest.get("changelog_url", default["changelog_url"])

        print("[News] 获取成功：" + default["version"])
        return default

    except Exception as e:
        print("[News] 请求失败：" + str(e) + "，使用默认数据。")
        return default


# ============ Wiki 图片获取 ============

def fetch_wiki_image(page_title, filename, width=128):
    """
    从 Minecraft Wiki 获取指定页面的首张图片，保存到 images/ 文件夹。
    如果图片已存在，跳过下载。
    返回 True 表示图片可用，False 表示失败。
    """
    images_dir = Path(__file__).resolve().parent.parent / IMAGES_DIR_NAME
    images_dir.mkdir(exist_ok=True)
    local_path = images_dir / filename

    if local_path.exists():
        print("[Wiki] 图片已存在：" + filename)
        return True

    try:
        params = {
            "action": "query",
            "titles": page_title,
            "prop": "images",
            "format": "json",
        }
        resp = requests.get(WIKI_API, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        pages = data.get("query", {}).get("pages", {})
        image_title = None
        for page_id, page_info in pages.items():
            images = page_info.get("images", [])
            if images:
                image_title = images[0]["title"]
                break

        if not image_title:
            print("[Wiki] 未找到 " + page_title + " 的图片")
            return False

        params = {
            "action": "query",
            "titles": image_title,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": str(width),
            "format": "json",
        }
        resp = requests.get(WIKI_API, params=params, timeout=REQUEST_TIMEOUT)
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
            print("[Wiki] 未获取到 " + image_title + " 的 URL")
            return False

        img_resp = requests.get(thumb_url, timeout=REQUEST_TIMEOUT)
        img_resp.raise_for_status()

        with open(local_path, "wb") as f:
            f.write(img_resp.content)

        print("[Wiki] 已下载：" + filename + "（" + str(len(img_resp.content)) + " 字节）")
        return True

    except Exception as e:
        print("[Wiki] 获取 " + page_title + " 图片失败：" + str(e))
        return False


# ============ XAML 生成 ============

def build_xaml():
    """生成完整的 Custom.xaml 内容"""

    # ---------- 动态数据 ----------
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

    # ---------- 尝试从 Wiki 下载方块图片 ----------
    wiki_ok = fetch_wiki_image(block["wiki"], block["file"], width=128)
    if wiki_ok:
        block_source = BASE_URL + "/" + IMAGES_DIR_NAME + "/" + block["file"]
    else:
        block_source = "pack://application:,,,/images/Blocks/" + block["fallback"]

    # ---------- 获取最新版本信息 ----------
    news = fetch_news_homepage()
    version = news["version"]
    news_title = "最新版本 - " + version

    changelog_lines = [line.strip() for line in news["changelog"].split("\n") if line.strip()]
    changelog_first = changelog_lines[0] if changelog_lines else "暂无更新摘要。"

    release_date = news["release_date"] if news["release_date"] else now.strftime("%Y-%m-%d")
    server_url = news["server_url"]
    wiki_url = news["wiki_url"]
    changelog_url = news["changelog_url"]

    # ---------- 拼装 XAML ----------
    lines = []
    lines.append('<StackPanel>')

    # ========== 卡片 1：最新版本 ==========
    lines.append('    <local:MyCard Title="' + news_title + '" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">')
    lines.append('        <StackPanel Margin="25,40,23,20">')
    lines.append('            <Border CornerRadius="8" Height="150" Margin="0,0,0,14" Background="{DynamicResource ColorBrush7}">')
    lines.append('                <Grid>')
    lines.append('                    <local:MyImage Width="90" Height="90" HorizontalAlignment="Center" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/CommandBlock.png" />')
    lines.append('                    <Border HorizontalAlignment="Center" VerticalAlignment="Bottom" Background="#E6FF5555" CornerRadius="4" Padding="16,6,16,6" Margin="0,0,0,12">')
    lines.append('                        <TextBlock Text="' + version + '" FontSize="16" FontWeight="Bold" Foreground="White" />')
    lines.append('                    </Border>')
    lines.append('                </Grid>')
    lines.append('            </Border>')
    lines.append('            <StackPanel Orientation="Horizontal" Margin="0,0,0,6">')
    lines.append('                <TextBlock Text="•" FontSize="16" Foreground="#FF5555" VerticalAlignment="Center" Margin="0,0,8,0" />')
    lines.append('                <TextBlock Text="' + changelog_first + '" FontSize="13" VerticalAlignment="Center" TextWrapping="Wrap" />')
    lines.append('            </StackPanel>')
    lines.append('            <TextBlock Text="最后更新: ' + release_date + '" FontSize="11" Foreground="#FFAA00" HorizontalAlignment="Right" Margin="0,0,0,10" />')
    lines.append('            <Grid>')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <local:MyTextButton Grid.Column="0" Text="下载" EventType="打开网页" EventData="' + changelog_url + '" />')
    lines.append('                <local:MyTextButton Grid.Column="1" Text="服务端" EventType="打开网页" EventData="' + server_url + '" />')
    lines.append('                <local:MyTextButton Grid.Column="2" Text="WIKI" EventType="打开网页" EventData="' + wiki_url + '" />')
    lines.append('                <local:MyTextButton Grid.Column="3" Text="更新日志" EventType="打开网页" EventData="' + changelog_url + '" />')
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
    lines.append('            <TextBlock Text="基础模式" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,6" />')
    lines.append('            <Grid Margin="0,0,0,14">')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36" Text="创造模式" EventType="复制文本" EventData="/gamemode creative" />')
    lines.append('                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36" Text="生存模式" EventType="复制文本" EventData="/gamemode survival" />')
    lines.append('                <local:MyButton Grid.Column="2" Height="36" Text="冒险模式" EventType="复制文本" EventData="/gamemode adventure" />')
    lines.append('            </Grid>')
    lines.append('            <TextBlock Text="环境控制" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,6" />')
    lines.append('            <Grid Margin="0,0,0,14">')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36" Text="设为白天" EventType="复制文本" EventData="/time set day" />')
    lines.append('                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36" Text="晴天" EventType="复制文本" EventData="/weather clear" />')
    lines.append('                <local:MyButton Grid.Column="2" Height="36" Text="清除效果" EventType="复制文本" EventData="/effect clear @s" />')
    lines.append('            </Grid>')
    lines.append('            <TextBlock Text="实用效果" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,6" />')
    lines.append('            <Grid Margin="0,0,0,14">')
    lines.append('                <Grid.ColumnDefinitions>')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                    <ColumnDefinition Width="1*" />')
    lines.append('                </Grid.ColumnDefinitions>')
    lines.append('                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36" Text="夜视" EventType="复制文本" EventData="/effect give @s night_vision 99999 1 true" />')
    lines.append('                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36" Text="抗性提升" EventType="复制文本" EventData="/effect give @s resistance 99999 4 true" />')
    lines.append('                <local:MyButton Grid.Column="2" Height="36" Text="急迫" EventType="复制文本" EventData="/effect give @s haste 99999 2 true" />')
    lines.append('            </Grid>')
    lines.append('            <local:MyHint Theme="Yellow" Margin="0,0,0,10" Text="指令适用于 Java 版 1.13 及以上。&#xA;其他版本请自行调整语法。" />')
    lines.append('            <local:MyHint Theme="Blue" Text="需要开启作弊或创造模式。复制后进游戏按 T，Ctrl+V 粘贴即可。" />')
    lines.append('        </StackPanel>')
    lines.append('    </local:MyCard>')

    # ========== 卡片 6：彩蛋（按钮版） ==========
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
