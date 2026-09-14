# -*- coding: utf-8 -*-
"""
PCL 主页生成脚本
由 GitHub Actions 定时运行，生成带动态数据的 Custom.xaml。
"""

import random
from datetime import datetime
from pathlib import Path

# ---------- 数据源 ----------

QUOTES = [
    "今天也要好好挖矿。",
    "苦力怕从不敲门。",
    "钻石在 Y=-59。",
    "别在岩浆边挖矿。",
    "末影人不会主动攻击你，除非你盯着它看。",
    "下界合金比钻石更耐用。",
    "睡觉可以跳过夜晚。",
    "村民交易可以打折，只要你治好了僵尸村民。",
    "附魔台周围放书架可以提升等级。",
    "信标需要金字塔底座。",
]

EGGS = [
    {"title": "神秘代码", "content": "检测到一段古老的代码……&#xA;&#xA;恭喜你获得成就：手贱达人！"},
    {"title": "开发者留言", "content": "PCL 的作者说过：&#xA;「如果你倒腾这个文件把 PCL 玩炸了，把这个文件直接删除就行了。」"},
    {"title": "钻石雨", "content": "天空中出现了一片乌云……&#xA;下起了钻石雨！&#xA;&#xA;你捡到了：&#xA;钻石 × 64&#xA;绿宝石 × 64&#xA;下界合金锭 × 64&#xA;&#xA;醒来后发现是做梦。"},
    {"title": "苦力怕的祝福", "content": "一只苦力怕悄悄靠近了你……&#xA;&#xA;sssssss……&#xA;&#xA;BOOM！&#xA;&#xA;彩蛋被炸没了。"},
    {"title": "末影人的秘密", "content": "你盯着末影人看了太久……&#xA;&#xA;它传送走了。&#xA;但在原地留下了一张纸条：&#xA;&#xA;「别看了，再看把你传送到虚空。」"},
    {"title": "幸运方块", "content": "你打开了一个幸运方块……&#xA;&#xA;里面跳出了一只鸡。&#xA;鸡又下了一颗蛋。&#xA;蛋又孵出了一只鸡。&#xA;&#xA;恭喜你实现了鸡蛋自由。"},
    {"title": "来自未来的留言", "content": "你收到了一条来自未来的消息：&#xA;&#xA;「未来的你正在玩 Minecraft。」&#xA;「没错，就是现在。」"},
    {"title": "虚空回响", "content": "你在虚空中听到了一个声音：&#xA;&#xA;「为什么要把我丢进末地？」&#xA;&#xA;你环顾四周，什么也没有。"},
]


def build_xaml() -> str:
    """生成完整的 Custom.xaml 内容"""

    # ---------- 动态数据 ----------
    now = datetime.now()
    date_str = now.strftime("%Y 年 %m 月 %d 日")
    weekday_map = ["一", "二", "三", "四", "五", "六", "日"]
    weekday_str = weekday_map[now.weekday()]

    quote = random.choice(QUOTES)

    score = random.randint(1, 100)
    if score >= 95:
        comment = "欧皇降世！建议立刻去抽卡。"
    elif score >= 80:
        comment = "运气极佳，适合下矿挖钻石。"
    elif score >= 60:
        comment = "运气不错，平平淡淡才是真。"
    elif score >= 40:
        comment = "一般般，建议扶老奶奶过马路。"
    elif score >= 20:
        comment = "非酋预警，今天别碰附魔台。"
    else:
        comment = "非酋认证，建议在家种地。"

    egg = random.choice(EGGS)

    # ---------- 拼装 XAML ----------
    xaml = f'''<StackPanel>
    <!-- 由 GitHub Actions 自动生成，请勿手动编辑 -->
    <!-- 生成时间：{now.strftime("%Y-%m-%d %H:%M:%S")} -->

    <!-- ========== 卡片 1：今日概览 ========== -->
    <local:MyCard Title="今日概览" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,15">
            <TextBlock TextWrapping="Wrap" Margin="0,0,0,8" FontSize="14" FontWeight="Bold"
                       Text="今天是 {date_str} 星期{weekday_str}" />
            <local:MyHint Theme="Blue" Margin="0,4,0,0"
                          Text="每日一言：{quote}" />
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 2：常用链接 ========== -->
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

    <!-- ========== 卡片 3：游戏指令速查 ========== -->
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

    <!-- ========== 卡片 4：彩蛋 ========== -->
    <local:MyCard Title="彩蛋" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,15">
            <TextBlock TextWrapping="Wrap" Margin="0,0,0,10" FontSize="14" FontWeight="Bold"
                       Text="「{egg["title"]}」" />
            <TextBlock TextWrapping="Wrap" Margin="0,0,0,14"
                       Text="{egg["content"]}" />
            <local:MyHint Theme="Yellow" Margin="0,12,0,0"
                          Text="彩蛋由 GitHub Actions 定时随机生成，大约每小时更新一次。" />
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 5：人品测试 ========== -->
    <local:MyCard Title="人品测试" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,15">
            <TextBlock TextWrapping="Wrap" Margin="0,0,0,12"
                       Text="每次主页更新都会重新生成结果，完全随机。" />
            <local:MyButton Height="36" HorizontalAlignment="Left" Padding="20,0,20,0"
                            Text="查看今日人品"
                            EventType="弹出窗口"
                            EventData="人品检测报告|正在扫描您的 Minecraft 生涯...&#xA;检测完成！&#xA;&#xA;您今日的人品值为：{score} 分&#xA;&#xA;（{comment}）" />
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
