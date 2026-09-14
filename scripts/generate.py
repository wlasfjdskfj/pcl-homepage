# -*- coding: utf-8 -*-
"""
PCL 主页生成脚本
由 GitHub Actions 定时运行，生成带动态数据的 Custom.xaml。
"""

import random
from datetime import datetime
from pathlib import Path

# ============ 数据源 ============

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
    "床在下界会爆炸，别试。",
    "水桶可以救你于岩浆之中。",
    "岩浆怪会分裂，小心处理。",
    "鞘翅需要烟花才能飞得远。",
    "远古守卫者会让你挖掘疲劳，别惹它。",
]

LUCKY_COLORS = [
    {"name": "钻石蓝", "hex": "#4AEDD9"},
    {"name": "红石红", "hex": "#FF5555"},
    {"name": "金锭黄", "hex": "#FFAA00"},
    {"name": "绿宝石绿", "hex": "#17DD62"},
    {"name": "青金石蓝", "hex": "#2A4DD0"},
    {"name": "紫水晶紫", "hex": "#A64DFF"},
    {"name": "下界石英白", "hex": "#E0E0E0"},
]

BLOCKS = [
    {"name": "草方块", "image": "Grass.png", "desc": "Minecraft 的标志性方块，随处可见，是建造的第一选择。"},
    {"name": "圆石", "image": "Cobblestone.png", "desc": "挖石头就能得到，建筑党的好帮手，也是熔炉的原料。"},
    {"name": "金块", "image": "GoldBlock.png", "desc": "9 个金锭合成，存钱不如存金块，还能做信标底座。"},
    {"name": "命令方块", "image": "CommandBlock.png", "desc": "创造模式的玩具，能执行各种指令，被称作 Minecraft 的魔法方块。"},
    {"name": "铁砧", "image": "Anvil.png", "desc": "修复装备、附魔、重命名，但掉落会砸脚，小心使用。"},
    {"name": "红石块", "image": "RedstoneBlock.png", "desc": "持续输出红石信号，红石电路的常客，可以永久激活装置。"},
    {"name": "红石灯（亮）", "image": "RedstoneLampOn.png", "desc": "收到红石信号就会亮起来，是红石照明系统的基本组件。"},
    {"name": "红石灯（灭）", "image": "RedstoneLampOff.png", "desc": "没收到信号时的状态，和亮着的版本是同一个方块。"},
    {"name": "鸡蛋", "image": "Egg.png", "desc": "扔出去有几率生成小鸡，是鸡场自动化的核心物品。"},
    {"name": "土径", "image": "GrassPath.png", "desc": "用锹右键草方块得到，走路不会踩坏草，也不会刷怪。"},
    {"name": "未知方块", "image": "Fabric.png", "desc": "来自模组加载器 Fabric 的神秘方块，代表着无限的可能。"},
    {"name": "狐狸头像", "image": "NeoForge.png", "desc": "NeoForge 模组加载器的标志，象征着模组开发的新时代。"},
]

EGGS = [
    {"title": "神秘代码", "content": "检测到一段古老的代码……&#xA;&#xA;恭喜你获得成就：手贱达人！&#xA;（此成就仅存在于本页面中）", "image": "CommandBlock.png"},
    {"title": "开发者留言", "content": "PCL 的作者说过：&#xA;「如果你倒腾这个文件把 PCL 玩炸了，把这个文件直接删除就行了。」&#xA;&#xA;所以放心折腾吧。", "image": "Anvil.png"},
    {"title": "钻石雨", "content": "天空中出现了一片乌云……&#xA;下起了钻石雨！&#xA;&#xA;你捡到了：&#xA;钻石 × 64&#xA;绿宝石 × 64&#xA;下界合金锭 × 64&#xA;&#xA;醒来后发现是做梦。", "image": "GoldBlock.png"},
    {"title": "苦力怕的祝福", "content": "一只苦力怕悄悄靠近了你……&#xA;&#xA;sssssss……&#xA;&#xA;BOOM！&#xA;&#xA;彩蛋被炸没了。", "image": "Grass.png"},
    {"title": "末影人的秘密", "content": "你盯着末影人看了太久……&#xA;&#xA;它传送走了。&#xA;但在原地留下了一张纸条：&#xA;&#xA;「别看了，再看把你传送到虚空。」", "image": "Egg.png"},
    {"title": "幸运方块", "content": "你打开了一个幸运方块……&#xA;&#xA;里面跳出了一只鸡。&#xA;鸡又下了一颗蛋。&#xA;蛋又孵出了一只鸡。&#xA;&#xA;恭喜你实现了鸡蛋自由。", "image": "RedstoneBlock.png"},
    {"title": "来自未来的留言", "content": "你收到了一条来自未来的消息：&#xA;&#xA;「未来的你正在玩 Minecraft。」&#xA;「没错，就是现在。」", "image": "RedstoneLampOn.png"},
    {"title": "虚空回响", "content": "你在虚空中听到了一个声音：&#xA;&#xA;「为什么要把我丢进末地？」&#xA;&#xA;你环顾四周，什么也没有。", "image": "RedstoneLampOff.png"},
]


def make_bar(score: int) -> str:
    """生成 ASCII 进度条"""
    filled = score // 10
    empty = 10 - filled
    return "[" + "#" * filled + "-" * empty + "]"


def build_xaml() -> str:
    """生成完整的 Custom.xaml 内容"""

    # ---------- 动态数据 ----------
    now = datetime.now()
    month = now.strftime("%m").lstrip("0") or "0"
    day = now.strftime("%d").lstrip("0") or "0"
    year = now.strftime("%Y")
    weekday_map = ["一", "二", "三", "四", "五", "六", "日"]
    weekday = weekday_map[now.weekday()]

    quote = random.choice(QUOTES)
    lucky_number = random.randint(1, 99)
    lucky_color = random.choice(LUCKY_COLORS)
    block = random.choice(BLOCKS)
    egg = random.choice(EGGS)

    score = random.randint(1, 100)
    if score >= 95:
        comment = "欧皇降世！建议立刻去抽卡。"
        grade = "SSR"
    elif score >= 80:
        comment = "运气极佳，适合下矿挖钻石。"
        grade = "SR"
    elif score >= 60:
        comment = "运气不错，平平淡淡才是真。"
        grade = "R"
    elif score >= 40:
        comment = "一般般，建议扶老奶奶过马路。"
        grade = "N"
    elif score >= 20:
        comment = "非酋预警，今天别碰附魔台。"
        grade = "N-"
    else:
        comment = "非酋认证，建议在家种地。"
        grade = "N--"

    bar = make_bar(score)

    # ---------- 拼装 XAML ----------
    xaml = '''<StackPanel>
    <!-- 由 GitHub Actions 自动生成，请勿手动编辑 -->
    <!-- 生成时间：%%GENERATED_AT%% -->

    <!-- ========== 卡片 1：今日概览 ========== -->
    <local:MyCard Title="今日概览" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,15">
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,4">
                <TextBlock Text="%%MONTH%%" FontSize="32" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />
                <TextBlock Text=" 月 " FontSize="12" VerticalAlignment="Bottom" Margin="0,0,2,6" />
                <TextBlock Text="%%DAY%%" FontSize="32" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />
                <TextBlock Text=" 日" FontSize="12" VerticalAlignment="Bottom" Margin="0,0,0,6" />
            </StackPanel>
            <TextBlock Text="%%YEAR%% 年 · 星期%%WEEKDAY%%" HorizontalAlignment="Center"
                       FontSize="12" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,12" />

            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">
                <TextBlock Text="■" Foreground="{DynamicResource ColorBrush1}" FontSize="10" Margin="2,0" />
                <TextBlock Text="■" Foreground="{DynamicResource ColorBrush3}" FontSize="10" Margin="2,0" />
                <TextBlock Text="■" Foreground="{DynamicResource ColorBrush5}" FontSize="10" Margin="2,0" />
                <TextBlock Text="■" Foreground="{DynamicResource ColorBrush7}" FontSize="10" Margin="2,0" />
            </StackPanel>

            <local:MyHint Theme="Blue" Margin="0,0,0,10"
                          Text="每日一言：%%QUOTE%%" />

            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <StackPanel Grid.Column="0" HorizontalAlignment="Center">
                    <TextBlock Text="幸运数字" FontSize="11" Foreground="{DynamicResource ColorBrush3}"
                               HorizontalAlignment="Center" Margin="0,0,0,2" />
                    <TextBlock Text="%%LUCKY_NUMBER%%" FontSize="22" FontWeight="Bold"
                               Foreground="{DynamicResource ColorBrush1}" HorizontalAlignment="Center" />
                </StackPanel>
                <StackPanel Grid.Column="1" HorizontalAlignment="Center">
                    <TextBlock Text="幸运颜色" FontSize="11" Foreground="{DynamicResource ColorBrush3}"
                               HorizontalAlignment="Center" Margin="0,0,0,2" />
                    <TextBlock Text="%%LUCKY_COLOR_NAME%%" FontSize="14" FontWeight="Bold"
                               Foreground="%%LUCKY_COLOR_HEX%%" HorizontalAlignment="Center" />
                </StackPanel>
            </Grid>
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 2：今日幸运方块 ========== -->
    <local:MyCard Title="今日幸运方块" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,15">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="Auto" />
                    <ColumnDefinition Width="*" />
                </Grid.ColumnDefinitions>
                <local:MyImage Grid.Column="0" Width="60" Height="60" Margin="0,0,15,0"
                               Source="pack://application:,,,/images/Blocks/%%BLOCK_IMAGE%%" />
                <StackPanel Grid.Column="1" VerticalAlignment="Center">
                    <TextBlock Text="%%BLOCK_NAME%%" FontSize="14" FontWeight="Bold" Margin="0,0,0,4" />
                    <TextBlock TextWrapping="Wrap" FontSize="11"
                               Foreground="{DynamicResource ColorBrush3}"
                               Text="%%BLOCK_DESC%%" />
                </StackPanel>
            </Grid>
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 3：常用链接 ========== -->
    <local:MyCard Title="常用链接" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,15">
            <local:MyListItem Margin="-5,0,-5,8" Type="Clickable"
                              Logo="pack://application:,,,/images/Blocks/Grass.png"
                              Title="Minecraft Wiki" Info="查阅方块、生物与游戏机制的中文百科"
                              EventType="打开网页" EventData="https://zh.minecraft.wiki/" />
            <local:MyListItem Margin="-5,0,-5,8" Type="Clickable"
                              Logo="pack://application:,,,/images/Blocks/RedstoneBlock.png"
                              Title="苦力怕论坛" Info="Minecraft 中文资源与交流社区"
                              EventType="打开网页" EventData="https://klpbbs.com/" />
            <local:MyListItem Margin="-5,0,-5,8" Type="Clickable"
                              Logo="pack://application:,,,/images/Blocks/GoldBlock.png"
                              Title="Hypixel" Info="全球最大的 Minecraft 小游戏服务器"
                              EventType="打开网页" EventData="https://hypixel.net/" />
            <local:MyListItem Margin="-5,0,-5,0" Type="Clickable"
                              Logo="pack://application:,,,/images/Blocks/Anvil.png"
                              Title="Modrinth" Info="下载模组、整合包与资源包"
                              EventType="打开网页" EventData="https://modrinth.com/" />
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 4：游戏指令速查 ========== -->
    <local:MyCard Title="游戏指令速查" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,15">
            <TextBlock TextWrapping="Wrap" Margin="0,0,0,12"
                       Text="点击按钮即可复制对应指令，进游戏后粘贴到聊天框使用。" />
            <Grid Margin="0,0,0,10">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36"
                                Text="创造模式" ToolTip="/gamemode creative"
                                EventType="复制文本" EventData="/gamemode creative" />
                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36"
                                Text="生存模式" ToolTip="/gamemode survival"
                                EventType="复制文本" EventData="/gamemode survival" />
                <local:MyButton Grid.Column="2" Height="36"
                                Text="设为白天" ToolTip="/time set day"
                                EventType="复制文本" EventData="/time set day" />
            </Grid>
            <Grid Margin="0,0,0,10">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <local:MyButton Grid.Column="0" Margin="0,0,10,0" Height="36"
                                Text="晴天" ToolTip="/weather clear"
                                EventType="复制文本" EventData="/weather clear" />
                <local:MyButton Grid.Column="1" Margin="0,0,10,0" Height="36"
                                Text="清除效果" ToolTip="/effect clear @s"
                                EventType="复制文本" EventData="/effect clear @s" />
                <local:MyButton Grid.Column="2" Height="36"
                                Text="夜视效果" ToolTip="/effect give @s night_vision 99999 1 true"
                                EventType="复制文本" EventData="/effect give @s night_vision 99999 1 true" />
            </Grid>
            <local:MyHint Theme="Blue" Margin="0,6,0,0"
                          Text="这些指令需要开启作弊或在创造模式下使用。&#xA;复制后进入游戏，按 T 打开聊天框，Ctrl + V 粘贴并回车即可。" />
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 5：彩蛋 ========== -->
    <local:MyCard Title="彩蛋" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,15">
            <local:MyImage Height="60" HorizontalAlignment="Center" Margin="0,0,0,10"
                           Source="pack://application:,,,/images/Blocks/%%EGG_IMAGE%%" />
            <TextBlock TextWrapping="Wrap" Margin="0,0,0,8" FontSize="14" FontWeight="Bold"
                       HorizontalAlignment="Center" Text="「%%EGG_TITLE%%」" />
            <TextBlock TextWrapping="Wrap" Margin="0,0,0,12"
                       Text="%%EGG_CONTENT%%" />
            <local:MyHint Theme="Yellow" Margin="0,0,0,0"
                          Text="彩蛋由 GitHub Actions 定时随机生成，大约每 2 小时更新一次。" />
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 6：人品测试 ========== -->
    <local:MyCard Title="人品测试" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,15">
            <TextBlock TextWrapping="Wrap" Margin="0,0,0,12"
                       Text="每次主页更新都会重新生成结果，完全随机。" />

            <StackPanel HorizontalAlignment="Center" Margin="0,0,0,10">
                <TextBlock Text="%%SCORE%%" FontSize="36" FontWeight="Bold"
                           Foreground="{DynamicResource ColorBrush1}" HorizontalAlignment="Center" />
                <TextBlock Text="分" FontSize="12" Foreground="{DynamicResource ColorBrush3}"
                           HorizontalAlignment="Center" Margin="0,-4,0,0" />
            </StackPanel>

            <TextBlock Text="%%BAR%%" FontFamily="Consolas" FontSize="14"
                       HorizontalAlignment="Center" Margin="0,0,0,6" />

            <TextBlock Text="评级：%%GRADE%%" FontSize="14" FontWeight="Bold"
                       HorizontalAlignment="Center" Margin="0,0,0,10"
                       Foreground="{DynamicResource ColorBrush1}" />

            <local:MyHint Theme="Blue" Margin="0,0,0,0"
                          Text="%%COMMENT%%" />
        </StackPanel>
    </local:MyCard>
</StackPanel>
'''

    # 替换占位符
    xaml = xaml.replace("%%GENERATED_AT%%", now.strftime("%Y-%m-%d %H:%M:%S"))
    xaml = xaml.replace("%%MONTH%%", month)
    xaml = xaml.replace("%%DAY%%", day)
    xaml = xaml.replace("%%YEAR%%", year)
    xaml = xaml.replace("%%WEEKDAY%%", weekday)
    xaml = xaml.replace("%%QUOTE%%", quote)
    xaml = xaml.replace("%%LUCKY_NUMBER%%", str(lucky_number))
    xaml = xaml.replace("%%LUCKY_COLOR_NAME%%", lucky_color["name"])
    xaml = xaml.replace("%%LUCKY_COLOR_HEX%%", lucky_color["hex"])
    xaml = xaml.replace("%%BLOCK_IMAGE%%", block["image"])
    xaml = xaml.replace("%%BLOCK_NAME%%", block["name"])
    xaml = xaml.replace("%%BLOCK_DESC%%", block["desc"])
    xaml = xaml.replace("%%EGG_IMAGE%%", egg["image"])
    xaml = xaml.replace("%%EGG_TITLE%%", egg["title"])
    xaml = xaml.replace("%%EGG_CONTENT%%", egg["content"])
    xaml = xaml.replace("%%SCORE%%", str(score))
    xaml = xaml.replace("%%BAR%%", bar)
    xaml = xaml.replace("%%GRADE%%", grade)
    xaml = xaml.replace("%%COMMENT%%", comment)

    return xaml


def main():
    output = Path(__file__).resolve().parent.parent / "Custom.xaml"
    output.write_text(build_xaml(), encoding="utf-8")
    print(f"已生成：{output}")


if __name__ == "__main__":
    main()
