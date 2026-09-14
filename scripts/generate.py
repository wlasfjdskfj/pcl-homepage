# -*- coding: utf-8 -*-
"""
PCL 主页生成脚本（完整版）
由 GitHub Actions 定时运行，生成带动态数据的 Custom.xaml。
功能：
  1. 从 NewsHomepage API 获取最新 Minecraft 版本信息
  2. 生成带封面图、版本号、更新摘要的卡片
  3. 生成今日概览、幸运方块、彩蛋、人品测试等动态卡片
"""

import random
import requests
from datetime import datetime
from pathlib import Path

# ============ 配置 ============

# NewsHomepage API 地址（参考项目文档）
NEWS_API = "https://news.bugjump.net/News.json"

# 请求超时时间（秒）
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
    {"title": "神秘代码", "content": "检测到一段古老的代码……&#xA;&#xA;恭喜你获得成就：手贱达人！", "image": "CommandBlock.png"},
    {"title": "开发者留言", "content": "PCL 的作者说过：&#xA;「如果你倒腾这个文件把 PCL 玩炸了，把这个文件直接删除就行了。」", "image": "Anvil.png"},
    {"title": "钻石雨", "content": "天空下起了钻石雨！&#xA;&#xA;你捡到了：&#xA;钻石 × 64&#xA;绿宝石 × 64&#xA;&#xA;醒来后发现是做梦。", "image": "GoldBlock.png"},
    {"title": "苦力怕的祝福", "content": "一只苦力怕悄悄靠近了你……&#xA;&#xA;sssssss……&#xA;&#xA;BOOM！", "image": "Grass.png"},
    {"title": "末影人的秘密", "content": "你盯着末影人看了太久……&#xA;&#xA;它留下了一张纸条：&#xA;「别看了，再看把你传送到虚空。」", "image": "Egg.png"},
    {"title": "幸运方块", "content": "你打开了一个幸运方块……&#xA;&#xA;里面跳出了一只鸡。&#xA;鸡又下了一颗蛋。&#xA;&#xA;恭喜你实现了鸡蛋自由。", "image": "RedstoneBlock.png"},
]

LUCKY_COLORS = [
    {"name": "钻石蓝", "hex": "#4AEDD9"},
    {"name": "红石红", "hex": "#FF5555"},
    {"name": "金锭黄", "hex": "#FFAA00"},
    {"name": "绿宝石绿", "hex": "#17DD62"},
    {"name": "青金石蓝", "hex": "#2A4DD0"},
]


# ============ 版本信息获取 ============

def fetch_news_homepage() -> dict:
    """
    从 NewsHomepage API 获取最新版本信息。
    返回一个字典，包含 title、version、image、changelog、release_date、launch_url 等字段。
    如果请求失败，返回一个兜底的默认值。
    """
    default = {
        "title": "最新版本",
        "version": "1.21",
        "image": "",
        "changelog": "暂无更新信息。",
        "release_date": "",
        "launch_url": "",
        "server_url": "",
        "wiki_url": "https://zh.minecraft.wiki/",
        "changelog_url": "https://www.minecraft.net/zh-hans/download",
    }

    try:
        resp = requests.get(NEWS_API, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        # 根据 API 实际返回结构调整以下解析逻辑
        # 参考 NewsHomepage 的 JSON 结构，通常包含 latest 或 cards 字段
        latest = data.get("latest") or data.get("latest_card") or {}

        if latest:
            default["title"] = latest.get("title", default["title"])
            default["version"] = latest.get("version", default["version"])
            default["image"] = latest.get("image", default["image"])
            default["changelog"] = latest.get("changelog", default["changelog"])
            default["release_date"] = latest.get("release_date", default["release_date"])
            default["launch_url"] = latest.get("launch_url", default["launch_url"])
            default["server_url"] = latest.get("server_url", default["server_url"])
            default["wiki_url"] = latest.get("wiki_url", default["wiki_url"])
            default["changelog_url"] = latest.get("changelog_url", default["changelog_url"])

        print(f"[NewsHomepage] 获取成功：{default['title']} - {default['version']}")
        return default

    except requests.RequestException as e:
        print(f"[NewsHomepage] 请求失败：{e}，使用默认数据。")
        return default
    except (ValueError, KeyError) as e:
        print(f"[NewsHomepage] 解析失败：{e}，使用默认数据。")
        return default


# ============ XAML 生成 ============

def build_xaml() -> str:
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

    <!-- ========== 卡片 1：最新版本 ========== -->
    <local:MyCard Title="{news_title}" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,20">

            <!-- 封面大图 + 版本号浮层 -->
            <Grid Margin="0,0,0,14">
                <Border CornerRadius="8" ClipToBounds="True" Height="150">
                    <local:MyImage Source="{cover_image}" FallbackSource="{cover_fallback}" />
                </Border>
                <Border HorizontalAlignment="Center" VerticalAlignment="Bottom"
                        Background="#E6FF5555" CornerRadius="4" Padding="16,6,16,6"
                        Margin="0,0,0,12">
                    <TextBlock Text="{version}" FontSize="16" FontWeight="Bold"
                               Foreground="White" />
                </Border>
            </Grid>

            <!-- 更新摘要 -->
            <StackPanel Orientation="Horizontal" Margin="0,0,0,6">
                <TextBlock Text="•" FontSize="16" Foreground="#FF5555"
                           VerticalAlignment="Center" Margin="0,0,8,0" />
                <TextBlock Text="{changelog_first}" FontSize="13" VerticalAlignment="Center"
                           TextWrapping="Wrap" />
            </StackPanel>

            <!-- 最后更新时间 -->
            <TextBlock Text="最后更新: {release_date}" FontSize="11"
                       Foreground="#FFAA00" HorizontalAlignment="Right" Margin="0,0,0,10" />

            <!-- 底部操作栏 -->
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>

                <local:MyTextButton Grid.Column="0" Text="下载"
                                    EventType="打开网页" EventData="{changelog_url}" />
                <local:MyTextButton Grid.Column="1" Text="服务端"
                                    EventType="打开网页" EventData="{server_url}" />
                <local:MyTextButton Grid.Column="2" Text="WIKI"
                                    EventType="打开网页" EventData="{wiki_url}" />
                <local:MyTextButton Grid.Column="3" Text="更新日志"
                                    EventType="打开网页" EventData="{changelog_url}" />
            </Grid>
        </StackPanel>
    </local:MyCard>
    <!-- ========== 卡片 2：今日概览 ========== -->
    <local:MyCard Title="今日概览" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,20">

            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,4">
                <TextBlock Text="{month}" FontSize="40" FontWeight="Bold"
                           Foreground="{{DynamicResource ColorBrush1}}" />
                <TextBlock Text=" 月 " FontSize="12" VerticalAlignment="Bottom"
                           Margin="0,0,2,10" Foreground="{{DynamicResource ColorBrush3}}" />
                <TextBlock Text="{day}" FontSize="40" FontWeight="Bold"
                           Foreground="{{DynamicResource ColorBrush1}}" />
                <TextBlock Text=" 日" FontSize="12" VerticalAlignment="Bottom"
                           Margin="0,0,0,10" Foreground="{{DynamicResource ColorBrush3}}" />
            </StackPanel>
            <TextBlock Text="{year} 年 · 星期{weekday}" HorizontalAlignment="Center"
                       FontSize="12" Foreground="{{DynamicResource ColorBrush3}}" Margin="0,0,0,16" />

            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,16">
                <Border Width="40" Height="3" CornerRadius="2"
                        Background="{{DynamicResource ColorBrush1}}" Margin="2,0" />
                <Border Width="40" Height="3" CornerRadius="2"
                        Background="{{DynamicResource ColorBrush3}}" Margin="2,0" />
                <Border Width="40" Height="3" CornerRadius="2"
                        Background="{{DynamicResource ColorBrush5}}" Margin="2,0" />
                <Border Width="40" Height="3" CornerRadius="2"
                        Background="{{DynamicResource ColorBrush7}}" Margin="2,0" />
            </StackPanel>

            <local:MyHint Theme="Blue" Margin="0,0,0,16" Text="每日一言：{quote}" />

            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>

                <StackPanel Grid.Column="0" HorizontalAlignment="Center">
                    <TextBlock Text="幸运数字" FontSize="11" HorizontalAlignment="Center"
                               Foreground="{{DynamicResource ColorBrush3}}" Margin="0,0,0,4" />
                    <TextBlock Text="{lucky_number}" FontSize="28" FontWeight="Bold"
                               HorizontalAlignment="Center"
                               Foreground="{{DynamicResource ColorBrush1}}" />
                </StackPanel>

                <StackPanel Grid.Column="1" HorizontalAlignment="Center">
                    <TextBlock Text="幸运颜色" FontSize="11" HorizontalAlignment="Center"
                               Foreground="{{DynamicResource ColorBrush3}}" Margin="0,0,0,4" />
                    <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
                        <Border Width="14" Height="14" CornerRadius="3"
                                Background="{lucky_color["hex"]}" Margin="0,0,6,0"
                                VerticalAlignment="Center" />
                        <TextBlock Text="{lucky_color["name"]}" FontSize="14" FontWeight="Bold"
                                   VerticalAlignment="Center"
                                   Foreground="{lucky_color["hex"]}" />
                    </StackPanel>
                </StackPanel>
            </Grid>
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 3：今日幸运方块 ========== -->
    <local:MyCard Title="今日幸运方块" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,20">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="Auto" />
                    <ColumnDefinition Width="*" />
                </Grid.ColumnDefinitions>
                <local:MyImage Grid.Column="0" Width="72" Height="72" Margin="0,0,18,0"
                               Source="pack://application:,,,/images/Blocks/{block["image"]}" />
                <StackPanel Grid.Column="1" VerticalAlignment="Center">
                    <TextBlock Text="{block["name"]}" FontSize="16" FontWeight="Bold"
                               Margin="0,0,0,6" />
                    <TextBlock TextWrapping="Wrap" FontSize="11" LineHeight="17"
                               Foreground="{{DynamicResource ColorBrush3}}"
                               Text="{block["desc"]}" />
                </StackPanel>
            </Grid>
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 4：常用链接 ========== -->
    <local:MyCard Title="常用链接" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,20">
            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable"
                              Logo="pack://application:,,,/images/Blocks/Grass.png"
                              Title="Minecraft Wiki" Info="查阅方块、生物与游戏机制"
                              EventType="打开网页" EventData="https://zh.minecraft.wiki/" />
            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable"
                              Logo="pack://application:,,,/images/Blocks/RedstoneBlock.png"
                              Title="苦力怕论坛" Info="Minecraft 中文资源与交流社区"
                              EventType="打开网页" EventData="https://klpbbs.com/" />
            <local:MyListItem Margin="-5,0,-5,6" Type="Clickable"
                              Logo="pack://application:,,,/images/Blocks/GoldBlock.png"
                              Title="Hypixel" Info="全球最大的 Minecraft 小游戏服务器"
                              EventType="打开网页" EventData="https://hypixel.net/" />
            <local:MyListItem Margin="-5,0,-5,0" Type="Clickable"
                              Logo="pack://application:,,,/images/Blocks/Anvil.png"
                              Title="Modrinth" Info="下载模组、整合包与资源包"
                              EventType="打开网页" EventData="https://modrinth.com/" />
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 5：游戏指令速查 ========== -->
    <local:MyCard Title="游戏指令速查" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,20">

            <TextBlock Text="基础模式" FontSize="11" FontWeight="Bold"
                       Foreground="{{DynamicResource ColorBrush3}}" Margin="0,0,0,6" />
            <Grid Margin="0,0,0,14">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36"
                                Text="创造模式" EventType="复制文本"
                                EventData="/gamemode creative" />
                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36"
                                Text="生存模式" EventType="复制文本"
                                EventData="/gamemode survival" />
                <local:MyButton Grid.Column="2" Height="36"
                                Text="冒险模式" EventType="复制文本"
                                EventData="/gamemode adventure" />
            </Grid>

            <TextBlock Text="环境控制" FontSize="11" FontWeight="Bold"
                       Foreground="{{DynamicResource ColorBrush3}}" Margin="0,0,0,6" />
            <Grid Margin="0,0,0,14">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36"
                                Text="设为白天" EventType="复制文本"
                                EventData="/time set day" />
                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36"
                                Text="晴天" EventType="复制文本"
                                EventData="/weather clear" />
                <local:MyButton Grid.Column="2" Height="36"
                                Text="清除效果" EventType="复制文本"
                                EventData="/effect clear @s" />
            </Grid>

            <TextBlock Text="实用效果" FontSize="11" FontWeight="Bold"
                       Foreground="{{DynamicResource ColorBrush3}}" Margin="0,0,0,6" />
            <Grid Margin="0,0,0,14">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36"
                                Text="夜视" EventType="复制文本"
                                EventData="/effect give @s night_vision 99999 1 true" />
                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36"
                                Text="抗性提升" EventType="复制文本"
                                EventData="/effect give @s resistance 99999 4 true" />
                <local:MyButton Grid.Column="2" Height="36"
                                Text="急迫" EventType="复制文本"
                                EventData="/effect give @s haste 99999 2 true" />
            </Grid>

            <local:MyHint Theme="Yellow" Margin="0,0,0,10"
                          Text="指令适用于 Java 版 1.13 及以上。&#xA;其他版本请自行调整语法。" />

            <local:MyHint Theme="Blue"
                          Text="需要开启作弊或创造模式。复制后进游戏按 T，Ctrl+V 粘贴即可。" />
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 6：彩蛋 ========== -->
    <local:MyCard Title="彩蛋" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,20">

            <TextBlock TextWrapping="Wrap" Margin="0,0,0,12"
                       Text="点击下面的按钮，看看今天抽到了什么彩蛋。" />

            <local:MyButton Height="36" HorizontalAlignment="Left" Padding="20,0,20,0"
                            Text="打开彩蛋"
                            EventType="弹出窗口"
                            EventData="{egg["title"]}|{egg["content"]}" />

            <local:MyHint Theme="Yellow" Margin="0,12,0,0"
                          Text="彩蛋由 GitHub Actions 定时随机生成，每 2 小时换一次。" />
        </StackPanel>
    </local:MyCard>
    <!-- ========== 卡片 7：人品测试 ========== -->
    <local:MyCard Title="人品测试" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,20">

            <TextBlock Text="今日得分" FontSize="11" HorizontalAlignment="Center"
                       Foreground="{{DynamicResource ColorBrush3}}" Margin="0,0,0,4" />

            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">
                <TextBlock Text="{score}" FontSize="52" FontWeight="Bold"
                           Foreground="{{DynamicResource ColorBrush1}}" />
                <TextBlock Text="分" FontSize="14" VerticalAlignment="Bottom"
                           Foreground="{{DynamicResource ColorBrush3}}" Margin="4,0,0,12" />
            </StackPanel>

            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,14">
                <Border Width="24" Height="8" CornerRadius="2" Margin="1,0"
                        Background="{{DynamicResource ColorBrush1}}" />
                <Border Width="24" Height="8" CornerRadius="2" Margin="1,0"
                        Background="{{DynamicResource ColorBrush1}}" />
                <Border Width="24" Height="8" CornerRadius="2" Margin="1,0"
                        Background="{{DynamicResource ColorBrush1}}" />
                <Border Width="24" Height="8" CornerRadius="2" Margin="1,0"
                        Background="{{DynamicResource ColorBrush1}}" />
                <Border Width="24" Height="8" CornerRadius="2" Margin="1,0"
                        Background="{{DynamicResource ColorBrush1}}" />
                <Border Width="24" Height="8" CornerRadius="2" Margin="1,0"
                        Background="{{DynamicResource ColorBrush5}}" />
                <Border Width="24" Height="8" CornerRadius="2" Margin="1,0"
                        Background="{{DynamicResource ColorBrush5}}" />
                <Border Width="24" Height="8" CornerRadius="2" Margin="1,0"
                        Background="{{DynamicResource ColorBrush7}}" />
                <Border Width="24" Height="8" CornerRadius="2" Margin="1,0"
                        Background="{{DynamicResource ColorBrush7}}" />
                <Border Width="24" Height="8" CornerRadius="2" Margin="1,0"
                        Background="{{DynamicResource ColorBrush7}}" />
            </StackPanel>

            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">
                <TextBlock Text="评级 " FontSize="13"
                           Foreground="{{DynamicResource ColorBrush3}}" />
                <TextBlock Text="{grade}" FontSize="16" FontWeight="Bold"
                           Foreground="{{DynamicResource ColorBrush1}}" />
            </StackPanel>

            <local:MyHint Theme="Blue" Text="{comment}" />
        </StackPanel>
    </local:MyCard>

</StackPanel>
'''
    return xaml


def main():
    output = Path(__file__).resolve().parent.parent / "Custom.xaml"
    output.write_text(build_xaml(), encoding="utf-8")
    print(f"已生成：{output}")


if __name__ == "__main__":
    main()
