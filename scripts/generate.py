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

    xaml = f'''<StackPanel>

    <!-- ========== 卡片 1：今日概览（视觉重设计） ========== -->
    <local:MyCard Title="今日概览" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,20">

            <!-- 日期行：月 / 日 / 年 + 星期 -->
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

            <!-- 彩色装饰条 -->
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

            <!-- 每日一言 -->
            <local:MyHint Theme="Blue" Margin="0,0,0,16" Text="每日一言：{quote}" />

            <!-- 幸运数字 + 幸运颜色 -->
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

    <!-- ========== 卡片 2：今日幸运方块 ========== -->
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

    <!-- ========== 卡片 3：常用链接 ========== -->
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

    <!-- ========== 卡片 4：游戏指令速查 ========== -->
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
            <Grid>
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

            <local:MyHint Theme="Blue" Margin="0,14,0,0"
                          Text="这些指令需要开启作弊或创造模式。复制后进游戏按 T，Ctrl+V 粘贴即可。" />
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 5：彩蛋 ========== -->
    <local:MyCard Title="彩蛋" Margin="0,0,0,15" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,20">

            <local:MyImage Height="72" HorizontalAlignment="Center" Margin="0,0,0,14"
                           Source="pack://application:,,,/images/Blocks/{egg["image"]}" />

            <TextBlock Text="「{egg["title"]}」" FontSize="15" FontWeight="Bold"
                       HorizontalAlignment="Center" Margin="0,0,0,10" />

            <Border CornerRadius="6" Padding="14,10"
                    Background="{{DynamicResource ColorBrush7}}" Margin="0,0,0,14">
                <TextBlock TextWrapping="Wrap" Text="{egg["content"]}"
                           FontSize="12" LineHeight="19" />
            </Border>

            <local:MyHint Theme="Yellow"
                          Text="彩蛋由 GitHub Actions 定时随机生成，每 2 小时换一次。" />
        </StackPanel>
    </local:MyCard>

    <!-- ========== 卡片 6：人品测试 ========== -->
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

            <!-- 进度条：用 10 个色块拼成 -->
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
