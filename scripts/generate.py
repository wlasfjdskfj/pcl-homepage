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
REQUEST_TIMEOUT = 10

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
    {"name": "草方块", "image": "Grass.png", "desc": "Minecraft 的标志性方块，随处可见。"},
    {"name": "圆石", "image": "Cobblestone.png", "desc": "挖石头就能得到，建筑党的好帮手。"},
    {"name": "金块", "image": "GoldBlock.png", "desc": "9 个金锭合成，还能做信标底座。"},
    {"name": "命令方块", "image": "CommandBlock.png", "desc": "创造模式的玩具，Minecraft 的魔法方块。"},
    {"name": "铁砧", "image": "Anvil.png", "desc": "修复装备、附魔、重命名，掉落会砸脚。"},
    {"name": "红石块", "image": "RedstoneBlock.png", "desc": "持续输出红石信号，可以永久激活装置。"},
    {"name": "鸡蛋", "image": "Egg.png", "desc": "扔出去有几率生成小鸡。"},
    {"name": "土径", "image": "GrassPath.png", "desc": "用锹右键草方块得到，走路不会踩坏草。"},
]

EGGS = [
    {"title": "神秘代码", "content": "检测到一段古老的代码……&#xA;&#xA;恭喜你获得成就：手贱达人！"},
    {"title": "开发者留言", "content": "PCL 的作者说过：&#xA;「如果你倒腾这个文件把 PCL 玩炸了，把这个文件直接删除就行了。」"},
    {"title": "钻石雨", "content": "天空下起了钻石雨！&#xA;&#xA;你捡到了：&#xA;钻石 × 64&#xA;绿宝石 × 64&#xA;&#xA;醒来后发现是做梦。"},
    {"title": "苦力怕的祝福", "content": "一只苦力怕悄悄靠近了你……&#xA;&#xA;sssssss……&#xA;&#xA;BOOM！"},
    {"title": "末影人的秘密", "content": "你盯着末影人看了太久……&#xA;&#xA;它留下了一张纸条：&#xA;「别看了，再看把你传送到虚空。」"},
    {"title": "幸运方块", "content": "你打开了一个幸运方块……&#xA;&#xA;里面跳出了一只鸡。&#xA;鸡又下了一颗蛋。&#xA;&#xA;恭喜你实现了鸡蛋自由。"},
]

LUCKY_COLORS = [
    {"name": "钻石蓝", "hex": "#4AEDD9"},
    {"name": "红石红", "hex": "#FF5555"},
    {"name": "金锭黄", "hex": "#FFAA00"},
    {"name": "绿宝石绿", "hex": "#17DD62"},
    {"name": "青金石蓝", "hex": "#2A4DD0"},
]


# ============ 版本信息获取 ============

def fetch_news_homepage():
    """从 NewsHomepage API 获取最新版本信息，失败时返回兜底数据。"""
    default = {
        "title": "最新版本",
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
            default["title"] = latest.get("title", default["title"])
            default["version"] = latest.get("version", default["version"])
            default["changelog"] = latest.get("changelog", default["changelog"])
            default["release_date"] = latest.get("release_date", default["release_date"])
            default["server_url"] = latest.get("server_url", default["server_url"])
            default["wiki_url"] = latest.get("wiki_url", default["wiki_url"])
            default["changelog_url"] = latest.get("changelog_url", default["changelog_url"])

        print("[NewsHomepage] 获取成功：" + default["title"] + " - " + default["version"])
        return default

    except Exception as e:
        print("[NewsHomepage] 请求失败：" + str(e) + "，使用默认数据。")
        return default


# ============ XAML 生成 ============

def build_xaml():
    """生成完整的 Custom.xaml 内容"""

    # 动态数据
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

    # 获取最新版本信息
    news = fetch_news_homepage()
    version = news["version"]
    news_title = "最新版本 - " + version

    changelog_lines = [line.strip() for line in news["changelog"].split("\n") if line.strip()]
    changelog_first = changelog_lines[0] if changelog_lines else "暂无更新摘要。"

    release_date = news["release_date"] if news["release_date"] else now.strftime("%Y-%m-%d")
    server_url = news["server_url"]
    wiki_url = news["wiki_url"]
    changelog_url = news["changelog_url"]

    # 拼装 XAML
    xaml = '<StackPanel>\n'

    # 卡片 1：最新版本
    xaml += '    <local:MyCard Title="' + news_title + '" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">\n'
    xaml += '        <StackPanel Margin="25,40,23,20">\n'
    xaml += '            <Border CornerRadius="8" Height="150" Margin="0,0,0,14" Background="{DynamicResource ColorBrush7}">\n'
    xaml += '                <Grid>\n'
    xaml += '                    <local:MyImage Width="90" Height="90" HorizontalAlignment="Center" VerticalAlignment="Center"\n'
    xaml += '                                   Source="pack://application:,,,/images/Blocks/CommandBlock.png" />\n'
    xaml += '                    <Border HorizontalAlignment="Center" VerticalAlignment="Bottom"\n'
    xaml += '                            Background="#E6FF5555" CornerRadius="4" Padding="16,6,16,6" Margin="0,0,0,12">\n'
    xaml += '                        <TextBlock Text="' + version + '" FontSize="16" FontWeight="Bold" Foreground="White" />\n'
    xaml += '                    </Border>\n'
    xaml += '                </Grid>\n'
    xaml += '            </Border>\n'
    xaml += '            <StackPanel Orientation="Horizontal" Margin="0,0,0,6">\n'
    xaml += '                <TextBlock Text="•" FontSize="16" Foreground="#FF5555" VerticalAlignment="Center" Margin="0,0,8,0" />\n'
    xaml += '                <TextBlock Text="' + changelog_first + '" FontSize="13" VerticalAlignment="Center" TextWrapping="Wrap" />\n'
    xaml += '            </StackPanel>\n'
    xaml += '            <TextBlock Text="最后更新: ' + release_date + '" FontSize="11" Foreground="#FFAA00" HorizontalAlignment="Right" Margin="0,0,0,10" />\n'
    xaml += '            <Grid>\n'
    xaml += '                <Grid.ColumnDefinitions>\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                </Grid.ColumnDefinitions>\n'
    xaml += '                <local:MyTextButton Grid.Column="0" Text="下载" EventType="打开网页" EventData="' + changelog_url + '" />\n'
    xaml += '                <local:MyTextButton Grid.Column="1" Text="服务端" EventType="打开网页" EventData="' + server_url + '" />\n'
    xaml += '                <local:MyTextButton Grid.Column="2" Text="WIKI" EventType="打开网页" EventData="' + wiki_url + '" />\n'
    xaml += '                <local:MyTextButton Grid.Column="3" Text="更新日志" EventType="打开网页" EventData="' + changelog_url + '" />\n'
    xaml += '            </Grid>\n'
    xaml += '        </StackPanel>\n'
    xaml += '    </local:MyCard>\n'

    # 卡片 2：今日概览
    xaml += '    <local:MyCard Title="今日概览" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">\n'
    xaml += '        <StackPanel Margin="25,40,23,20">\n'
    xaml += '            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,4">\n'
    xaml += '                <TextBlock Text="' + month + '" FontSize="40" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />\n'
    xaml += '                <TextBlock Text=" 月 " FontSize="12" VerticalAlignment="Bottom" Margin="0,0,2,10" Foreground="{DynamicResource ColorBrush3}" />\n'
    xaml += '                <TextBlock Text="' + day + '" FontSize="40" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />\n'
    xaml += '                <TextBlock Text=" 日" FontSize="12" VerticalAlignment="Bottom" Margin="0,0,0,10" Foreground="{DynamicResource ColorBrush3}" />\n'
    xaml += '            </StackPanel>\n'
    xaml += '            <TextBlock Text="' + year + ' 年 · 星期' + weekday + '" HorizontalAlignment="Center" FontSize="12" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,16" />\n'
    xaml += '            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,16">\n'
    xaml += '                <Border Width="40" Height="3" CornerRadius="2" Background="{DynamicResource ColorBrush1}" Margin="2,0" />\n'
    xaml += '                <Border Width="40" Height="3" CornerRadius="2" Background="{DynamicResource ColorBrush3}" Margin="2,0" />\n'
    xaml += '                <Border Width="40" Height="3" CornerRadius="2" Background="{DynamicResource ColorBrush5}" Margin="2,0" />\n'
    xaml += '                <Border Width="40" Height="3" CornerRadius="2" Background="{DynamicResource ColorBrush7}" Margin="2,0" />\n'
    xaml += '            </StackPanel>\n'
    xaml += '            <local:MyHint Theme="Blue" Margin="0,0,0,16" Text="每日一言：' + quote + '" />\n'
    xaml += '            <Grid>\n'
    xaml += '                <Grid.ColumnDefinitions>\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                </Grid.ColumnDefinitions>\n'
    xaml += '                <StackPanel Grid.Column="0" HorizontalAlignment="Center">\n'
    xaml += '                    <TextBlock Text="幸运数字" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" />\n'
    xaml += '                    <TextBlock Text="' + str(lucky_number) + '" FontSize="28" FontWeight="Bold" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" />\n'
    xaml += '                </StackPanel>\n'
    xaml += '                <StackPanel Grid.Column="1" HorizontalAlignment="Center">\n'
    xaml += '                    <TextBlock Text="幸运颜色" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" />\n'
    xaml += '                    <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">\n'
    xaml += '                        <Border Width="14" Height="14" CornerRadius="3" Background="' + lucky_color["hex"] + '" Margin="0,0,6,0" VerticalAlignment="Center" />\n'
    xaml += '                        <TextBlock Text="' + lucky_color["name"] + '" FontSize="14" FontWeight="Bold" VerticalAlignment="Center" Foreground="' + lucky_color["hex"] + '" />\n'
    xaml += '                    </StackPanel>\n'
    xaml += '                </StackPanel>\n'
    xaml += '            </Grid>\n'
    xaml += '        </StackPanel>\n'
    xaml += '    </local:MyCard>\n'

    # 卡片 3：今日幸运方块
    xaml += '    <local:MyCard Title="今日幸运方块" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">\n'
    xaml += '        <StackPanel Margin="25,40,23,20">\n'
    xaml += '            <Grid>\n'
    xaml += '                <Grid.ColumnDefinitions>\n'
    xaml += '                    <ColumnDefinition Width="Auto" />\n'
    xaml += '                    <ColumnDefinition Width="*" />\n'
    xaml += '                </Grid.ColumnDefinitions>\n'
    xaml += '                <local:MyImage Grid.Column="0" Width="72" Height="72" Margin="0,0,18,0" Source="pack://application:,,,/images/Blocks/' + block["image"] + '" />\n'
    xaml += '                <StackPanel Grid.Column="1" VerticalAlignment="Center">\n'
    xaml += '                    <TextBlock Text="' + block["name"] + '" FontSize="16" FontWeight="Bold" Margin="0,0,0,6" />\n'
    xaml += '                    <TextBlock TextWrapping="Wrap" FontSize="11" LineHeight="17" Foreground="{DynamicResource ColorBrush3}" Text="' + block["desc"] + '" />\n'
    xaml += '                </StackPanel>\n'
    xaml += '            </Grid>\n'
    xaml += '        </StackPanel>\n'
    xaml += '    </local:MyCard>\n'

    # 卡片 4：常用链接
    xaml += '    <local:MyCard Title="常用链接" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">\n'
    xaml += '        <StackPanel Margin="25,40,23,20">\n'
    xaml += '            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Grass.png" Title="Minecraft Wiki" Info="查阅方块、生物与游戏机制" EventType="打开网页" EventData="https://zh.minecraft.wiki/" />\n'
    xaml += '            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/RedstoneBlock.png" Title="苦力怕论坛" Info="Minecraft 中文资源与交流社区" EventType="打开网页" EventData="https://klpbbs.com/" />\n'
    xaml += '            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable" Logo="pack://application:,,,/images/Blocks/GoldBlock.png" Title="Hypixel" Info="全球最大的 Minecraft 小游戏服务器" EventType="打开网页" EventData="https://hypixel.net/" />\n'
    xaml += '            <local:MyListItem Margin="-5,0,-5,0" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Anvil.png" Title="Modrinth" Info="下载模组、整合包与资源包" EventType="打开网页" EventData="https://modrinth.com/" />\n'
    xaml += '        </StackPanel>\n'
    xaml += '    </local:MyCard>\n'

    # 卡片 5：游戏指令速查
    xaml += '    <local:MyCard Title="游戏指令速查" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">\n'
    xaml += '        <StackPanel Margin="25,40,23,20">\n'
    xaml += '            <TextBlock Text="基础模式" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,6" />\n'
    xaml += '            <Grid Margin="0,0,0,14">\n'
    xaml += '                <Grid.ColumnDefinitions>\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                </Grid.ColumnDefinitions>\n'
    xaml += '                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36" Text="创造模式" EventType="复制文本" EventData="/gamemode creative" />\n'
    xaml += '                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36" Text="生存模式" EventType="复制文本" EventData="/gamemode survival" />\n'
    xaml += '                <local:MyButton Grid.Column="2" Height="36" Text="冒险模式" EventType="复制文本" EventData="/gamemode adventure" />\n'
    xaml += '            </Grid>\n'
    xaml += '            <TextBlock Text="环境控制" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,6" />\n'
    xaml += '            <Grid Margin="0,0,0,14">\n'
    xaml += '                <Grid.ColumnDefinitions>\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                </Grid.ColumnDefinitions>\n'
    xaml += '                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36" Text="设为白天" EventType="复制文本" EventData="/time set day" />\n'
    xaml += '                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36" Text="晴天" EventType="复制文本" EventData="/weather clear" />\n'
    xaml += '                <local:MyButton Grid.Column="2" Height="36" Text="清除效果" EventType="复制文本" EventData="/effect clear @s" />\n'
    xaml += '            </Grid>\n'
    xaml += '            <TextBlock Text="实用效果" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,6" />\n'
    xaml += '            <Grid Margin="0,0,0,14">\n'
    xaml += '                <Grid.ColumnDefinitions>\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                    <ColumnDefinition Width="1*" />\n'
    xaml += '                </Grid.ColumnDefinitions>\n'
    xaml += '                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36" Text="夜视" EventType="复制文本" EventData="/effect give @s night_vision 99999 1 true" />\n'
    xaml += '                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36" Text="抗性提升" EventType="复制文本" EventData="/effect give @s resistance 99999 4 true" />\n'
    xaml += '                <local:MyButton Grid.Column="2" Height="36" Text="急迫" EventType="复制文本" EventData="/effect give @s haste 99999 2 true" />\n'
    xaml += '            </Grid>\n'
    xaml += '            <local:MyHint Theme="Yellow" Margin="0,0,0,10" Text="指令适用于 Java 版 1.13 及以上。&#xA;其他版本请自行调整语法。" />\n'
    xaml += '            <local:MyHint Theme="Blue" Text="需要开启作弊或创造模式。复制后进游戏按 T，Ctrl+V 粘贴即可。" />\n'
    xaml += '        </StackPanel>\n'
    xaml += '    </local:MyCard>\n'

    # 卡片 6：彩蛋（按钮版）
    xaml += '    <local:MyCard Title="彩蛋" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">\n'
    xaml += '        <StackPanel Margin="25,40,23,20">\n'
    xaml += '            <TextBlock TextWrapping="Wrap" Margin="0,0,0,12" Text="点击下面的按钮，看看今天抽到了什么彩蛋。" />\n'
    xaml += '            <local:MyButton Height="36" HorizontalAlignment="Left" Padding="20,0,20,0" Text="打开彩蛋" EventType="弹出窗口" EventData="' + egg["title"] + '|' + egg["content"] + '" />\n'
    xaml += '            <local:MyHint Theme="Yellow" Margin="0,12,0,0" Text="彩蛋由 GitHub Actions 定时随机生成，每 2 小时换一次。" />\n'
    xaml += '        </StackPanel>\n'
    xaml += '    </local:MyCard>\n'

    # 卡片 7：人品测试
    xaml += '    <local:MyCard Title="人品测试" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">\n'
    xaml += '        <StackPanel Margin="25,40,23,20">\n'
    xaml += '            <TextBlock Text="今日得分" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" />\n'
    xaml += '            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">\n'
    xaml += '                <TextBlock Text="' + str(score) + '" FontSize="52" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />\n'
    xaml += '                <TextBlock Text="分" FontSize="14" VerticalAlignment="Bottom" Foreground="{DynamicResource ColorBrush3}" Margin="4,0,0,12" />\n'
    xaml += '            </StackPanel>\n'
    xaml += '            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">\n'
    xaml += '                <TextBlock Text="评级 " FontSize="13" Foreground="{DynamicResource ColorBrush3}" />\n'
    xaml += '                <TextBlock Text="' + grade + '" FontSize="16" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />\n'
    xaml += '            </StackPanel>\n'
    xaml += '            <local:MyHint Theme="Blue" Text="' + comment + '" />\n'
    xaml += '        </StackPanel>\n'
    xaml += '    </local:MyCard>\n'

    xaml += '</StackPanel>\n'
    return xaml


def main():
    output = Path(__file__).resolve().parent.parent / "Custom.xaml"
    output.write_text(build_xaml(), encoding="utf-8")
    print("已生成：" + str(output))


if __name__ == "__main__":
    main()
