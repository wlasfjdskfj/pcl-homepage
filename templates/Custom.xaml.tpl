<StackPanel>
    <StackPanel.Resources>
        <!-- 全局字体：MiSans（现代 UI 字体）。带回退，缺失时退回雅黑 -->
        <Style TargetType="TextBlock">
            <Setter Property="FontFamily" Value="MiSans, Microsoft YaHei UI, Segoe UI" />
        </Style>

    </StackPanel.Resources>
    <!-- __BANNER__ -->
    <local:MyCard Title="今日概览" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,16">
            <StackPanel.Triggers>
                <EventTrigger RoutedEvent="StackPanel.Loaded">
                    <BeginStoryboard>
                        <Storyboard>
                            <DoubleAnimation Storyboard.TargetProperty="Opacity"
                                             From="0" To="1" Duration="0:0:0.90"
                                             BeginTime="0:0:0.30">
                                <DoubleAnimation.EasingFunction>
                                    <CubicEase EasingMode="EaseOut" />
                                </DoubleAnimation.EasingFunction>
                            </DoubleAnimation>
                            <DoubleAnimation
                                Storyboard.TargetProperty="(UIElement.Effect).(BlurEffect.Radius)"
                                From="8" To="0" Duration="0:0:0.90" BeginTime="0:0:0.30" />
                        </Storyboard>
                    </BeginStoryboard>
                </EventTrigger>
            </StackPanel.Triggers>
            <StackPanel.Effect>
                <BlurEffect Radius="0" />
            </StackPanel.Effect>
            <!-- __FESTIVAL_BANNER__ -->
            <Border CornerRadius="12" Height="280" Margin="0,0,0,16" ClipToBounds="True">
                <Grid>
                    <local:MyImage Source="{{WALLPAPER_URL}}" HorizontalAlignment="Stretch" VerticalAlignment="Stretch" Stretch="UniformToFill" />
                    <Border>
                        <Border.Background>
                            <LinearGradientBrush StartPoint="0,0" EndPoint="0,1">
                                <GradientStop Color="#33000000" Offset="0" />
                                <GradientStop Color="#88000000" Offset="0.55" />
                                <GradientStop Color="#CC000000" Offset="1" />
                            </LinearGradientBrush>
                        </Border.Background>
                    </Border>
                    <Border HorizontalAlignment="Left" VerticalAlignment="Top" Margin="18,16,0,0" Background="#59000000" CornerRadius="12" Padding="12,10,16,10">
                        <StackPanel>
                            <StackPanel Orientation="Horizontal">
                                <Border Width="26" Height="26" CornerRadius="13" Background="{DynamicResource ColorBrush1}" Margin="0,0,8,0" VerticalAlignment="Center">
                                    <local:MyImage Width="16" Height="16" HorizontalAlignment="Center" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/Grass.png" />
                                </Border>
                                <TextBlock Text="__GREETING__，{user}！" FontSize="15" FontWeight="Bold" Foreground="White" VerticalAlignment="Center" />
                            </StackPanel>
                            <TextBlock Text="__GREETING_SUB__" FontSize="11" Foreground="#D9FFFFFF" Margin="0,3,0,0" />
                        </StackPanel>
                    </Border>
                    <!-- __COUNTDOWN_BODY__ -->
                    <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center">
                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
                            <TextBlock Text="__DATE_MONTH__" FontSize="60" FontWeight="Bold" Foreground="White" />
                            <TextBlock Text=" 月 " FontSize="15" VerticalAlignment="Bottom" Margin="0,0,4,16" Foreground="#D9FFFFFF" />
                            <TextBlock Text="__DATE_DAY__" FontSize="60" FontWeight="Bold" Foreground="White" />
                            <TextBlock Text=" 日" FontSize="15" VerticalAlignment="Bottom" Margin="0,0,4,16" Foreground="#D9FFFFFF" />
                        </StackPanel>
                        <TextBlock Text="星期__DATE_WEEKDAY__" HorizontalAlignment="Center" FontSize="12" FontWeight="Bold" Foreground="#FFFFFF" Margin="0,10,0,0" />
                    </StackPanel>
                    <!-- 每日一言（叠加在横幅底部，按 IP 下发） -->
                    <StackPanel VerticalAlignment="Bottom" Margin="20,0,16,12" HorizontalAlignment="Center">
                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,4">
                            <Border Width="3" Height="10" CornerRadius="1.5" Background="#FFFFFF" Margin="0,0,8,0" VerticalAlignment="Center" />
                            <TextBlock Text="每日一言" FontSize="11" FontWeight="Bold" Foreground="#D9FFFFFF" VerticalAlignment="Center" />
                        </StackPanel>
                        <TextBlock Text="__QUOTE__" FontSize="12" Foreground="#D9FFFFFF" TextWrapping="Wrap" TextAlignment="Center" HorizontalAlignment="Center" MaxWidth="540" LineHeight="20" ToolTip="每天每人一句，同一天同一 IP 固定" />
                    </StackPanel>
                    <!-- 彩蛋入口：右上角小标记（点开跳转 /site/） -->
                    <local:MyButton HorizontalAlignment="Right" VerticalAlignment="Bottom"
                                    Margin="0,0,16,14" Height="30" Padding="14,0,14,0"
                                    Text="彩蛋"
                                    EventType="打开网页" EventData="{{BASE_URL}}/site/"
                                    ToolTip="点一下看看" />
                </Grid>
            </Border>
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <Border Grid.Column="0" CornerRadius="10" Padding="16,16" Margin="0,0,4,0" Background="{DynamicResource ColorBrush7}" ClipToBounds="True">
                    <Grid>
                        <StackPanel>
                            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,8">
                                <local:MyImage Width="16" Height="16" Margin="0,0,4,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/GoldBlock.png" />
                                <TextBlock Text="幸运数字" FontSize="11" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />
                            </StackPanel>
                            <TextBlock Text="__LUCKY_NUMBER__" FontSize="36" FontWeight="Bold" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" />
                        </StackPanel>
                    </Grid>
                </Border>
                <Border Grid.Column="1" CornerRadius="10" Padding="16,16" Margin="6,0,0,0" Background="{DynamicResource ColorBrush7}">
                    <StackPanel>
                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,8">
                            <local:MyImage Width="16" Height="16" Margin="0,0,4,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/RedstoneLampOn.png" />
                            <TextBlock Text="幸运颜色" FontSize="11" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />
                        </StackPanel>
                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
                            <Border Width="26" Height="26" CornerRadius="13" Background="__LUCKY_COLOR_HEX__" BorderBrush="{DynamicResource ColorBrush4}" BorderThickness="1" Margin="0,0,8,0" VerticalAlignment="Center" />
                            <TextBlock Text="__LUCKY_COLOR_NAME__" FontSize="15" FontWeight="Bold" VerticalAlignment="Center" Foreground="{DynamicResource ColorBrush1}" />
                        </StackPanel>
                    </StackPanel>
                </Border>
            </Grid>
        </StackPanel>
    </local:MyCard>
    <local:MyCard Title="你的信息" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,16">
            <StackPanel.Triggers>
                <EventTrigger RoutedEvent="StackPanel.Loaded">
                    <BeginStoryboard>
                        <Storyboard>
                            <DoubleAnimation Storyboard.TargetProperty="Opacity"
                                             From="0" To="1" Duration="0:0:0.90"
                                             BeginTime="0:0:0.55">
                                <DoubleAnimation.EasingFunction>
                                    <CubicEase EasingMode="EaseOut" />
                                </DoubleAnimation.EasingFunction>
                            </DoubleAnimation>
                            <DoubleAnimation
                                Storyboard.TargetProperty="(UIElement.Effect).(BlurEffect.Radius)"
                                From="8" To="0" Duration="0:0:0.90" BeginTime="0:0:0.55" />
                        </Storyboard>
                    </BeginStoryboard>
                </EventTrigger>
            </StackPanel.Triggers>
            <StackPanel.Effect>
                <BlurEffect Radius="0" />
            </StackPanel.Effect>
            <Border CornerRadius="10" Padding="18,16" Margin="0,0,0,12" Background="{DynamicResource ColorBrush7}">
                <StackPanel>
                    <Grid Margin="0,0,0,12">
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="Auto" />
                            <ColumnDefinition Width="*" />
                        </Grid.ColumnDefinitions>
                        <local:MyImage Grid.Column="0" Width="22" Height="22" Margin="0,0,12,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/CommandBlock.png" />
                        <StackPanel Grid.Column="1" VerticalAlignment="Center">
                            <TextBlock Text="玩家 ID" FontSize="11" Foreground="{DynamicResource ColorBrush3}" ToolTip="由 PCL 提供的 {user} 替换标记填入；未登录时为空，刷新页面即可" />
                            <TextBlock Text="{user}" FontSize="15" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" Margin="0,2,0,0" />
                            <TextBlock Text="{user}" FontSize="1" Foreground="Transparent" />
                        </StackPanel>
                    </Grid>
                    <Border Height="1" Margin="0,0,0,12"><Border.Background><LinearGradientBrush StartPoint="0,0" EndPoint="1,0"><GradientStop Color="#00000000" Offset="0" /><GradientStop Color="#33808080" Offset="0.5" /><GradientStop Color="#00000000" Offset="1" /></LinearGradientBrush></Border.Background></Border>
                    <Grid>
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="Auto" />
                            <ColumnDefinition Width="*" />
                        </Grid.ColumnDefinitions>
                        <local:MyImage Grid.Column="0" Width="22" Height="22" Margin="0,0,12,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/RedstoneBlock.png" />
                        <StackPanel Grid.Column="1" VerticalAlignment="Center">
                            <TextBlock Text="公网 IP" FontSize="11" Foreground="{DynamicResource ColorBrush3}" />
                            <TextBlock Text="__USER_IP__" FontSize="15" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" Margin="0,2,0,0" ToolTip="由 Cloudflare 请求头 CF-Connecting-IP 读取" />
                        </StackPanel>
                    </Grid>
                </StackPanel>
            </Border>
            <!-- __WEATHER_BODY__ -->
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <local:MyIconTextButton Grid.Column="0" Margin="0,0,4,0" Height="48" Text="内存优化" LogoScale="0.9" ColorType="Highlight" Logo="M128 192h768v192H128z M128 448h768v192H128z M256 224v128 M256 480v128" EventType="内存优化" EventData="-" />
                <local:MyIconTextButton Grid.Column="1" Margin="4,0,4,0" Height="48" Text="清理垃圾" LogoScale="0.9" ColorType="Highlight" Logo="M384 128h256l32 64h192v64H160v-64h192z M224 320h576l-48 512H272z M384 384v384h64V384z M576 384v384h64V384z" EventType="清理垃圾" EventData="-" />
                <local:MyIconTextButton Grid.Column="2" Margin="4,0,0,0" Height="48" Text="刷新数据" LogoScale="0.9" ColorType="Highlight" Logo="M753 271 C691 209 606 171 512 171 c-189 0 -341 153 -341 341 s152 341 341 341 c159 0 292 -109 330 -256 h-89 c-35 99 -130 171 -241 171 c-141 0 -256 -115 -256 -256 s115 -256 256 -256 c71 0 134 29 180 76 L555 469 h299 V171 l-100 100 Z" EventType="刷新页面" EventData="-" />
            </Grid>
            <local:MyHint Theme="Blue" Margin="0,14,0,0" Text="内存优化会释放 PCL 占用内存，清理垃圾会删除临时文件，刷新可重新加载今日内容。" />
        </StackPanel>
    </local:MyCard>
    <local:MyCard Title="今日运势" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,16">
            <StackPanel.Triggers>
                <EventTrigger RoutedEvent="StackPanel.Loaded">
                    <BeginStoryboard>
                        <Storyboard>
                            <DoubleAnimation Storyboard.TargetProperty="Opacity"
                                             From="0" To="1" Duration="0:0:0.90"
                                             BeginTime="0:0:0.80">
                                <DoubleAnimation.EasingFunction>
                                    <CubicEase EasingMode="EaseOut" />
                                </DoubleAnimation.EasingFunction>
                            </DoubleAnimation>
                            <DoubleAnimation
                                Storyboard.TargetProperty="(UIElement.Effect).(BlurEffect.Radius)"
                                From="8" To="0" Duration="0:0:0.90" BeginTime="0:0:0.80" />
                        </Storyboard>
                    </BeginStoryboard>
                </EventTrigger>
            </StackPanel.Triggers>
            <StackPanel.Effect>
                <BlurEffect Radius="0" />
            </StackPanel.Effect>
            <TextBlock Text="今日得分" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" ToolTip="依据 IP 与当日日期计算，同一天同一 IP 分数固定。&#xA;评级：95+ SSR / 80+ SR / 60+ R / 40+ N" />
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">
                <TextBlock Text="__SCORE__" FontSize="60" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />
                <TextBlock Text="分" FontSize="15" VerticalAlignment="Bottom" Foreground="{DynamicResource ColorBrush3}" Margin="6,0,0,12" />
            </StackPanel>
            <!-- __SCORE_BAR__ -->
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,12">
                <TextBlock Text="评级 " FontSize="12" Foreground="{DynamicResource ColorBrush3}" />
                <TextBlock Text="__GRADE__" FontSize="20" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />
            </StackPanel>
            <Grid Margin="0,0,0,12">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <Border Grid.Column="0" CornerRadius="10" Padding="12,12" Margin="0,0,4,0" Background="{DynamicResource ColorBrush7}">
                    <StackPanel>
                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,4">
                            <Grid Width="20" Height="20" Margin="0,0,8,0" VerticalAlignment="Center">
                                <Ellipse Fill="#2E9E5B" />
                                <Path Data="M382 732L160 510l-72 72 294 294 576-576-72-72z" Fill="White" Stretch="Uniform" Margin="4" />
                            </Grid>
                            <TextBlock Text="宜" FontSize="12" FontWeight="Bold" Foreground="#2E9E5B" VerticalAlignment="Center" />
                        </StackPanel>
                        <TextBlock Text="__FORTUNE_GOOD__" FontSize="15" FontWeight="Bold" HorizontalAlignment="Center" Foreground="#2E9E5B" />
                    </StackPanel>
                </Border>
                <Border Grid.Column="1" CornerRadius="10" Padding="12,12" Margin="6,0,0,0" Background="{DynamicResource ColorBrush7}">
                    <StackPanel>
                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,4">
                            <Grid Width="20" Height="20" Margin="0,0,8,0" VerticalAlignment="Center">
                                <Ellipse Fill="#D9534F" />
                                <Path Data="M712 256L512 456 312 256l-56 56 200 200-200 200 56 56 200-200 200 200 56-56-200-200 200-200z" Fill="White" Stretch="Uniform" Margin="4" />
                            </Grid>
                            <TextBlock Text="忌" FontSize="12" FontWeight="Bold" Foreground="#D9534F" VerticalAlignment="Center" />
                        </StackPanel>
                        <TextBlock Text="__FORTUNE_BAD__" FontSize="15" FontWeight="Bold" HorizontalAlignment="Center" Foreground="#D9534F" />
                    </StackPanel>
                </Border>
            </Grid>
            <local:MyHint Theme="Blue" Margin="0,0,0,8" Text="__COMMENT__" />
            <local:MyHint Theme="Yellow" Text="小贴士：__FORTUNE_TIP__" />
            <Border Height="1" Margin="0,0,0,16"><Border.Background><LinearGradientBrush StartPoint="0,0" EndPoint="1,0"><GradientStop Color="#00000000" Offset="0" /><GradientStop Color="#33808080" Offset="0.5" /><GradientStop Color="#00000000" Offset="1" /></LinearGradientBrush></Border.Background></Border>
            <Border CornerRadius="10" Padding="16,16" Margin="0,0,0,12" Background="{DynamicResource ColorBrush7}">
                <StackPanel Orientation="Horizontal">
                    <local:MyImage Width="36" Height="36" Margin="0,0,12,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/Grass.png" />
                    <StackPanel VerticalAlignment="Center">
                        <TextBlock Text="今日种子" FontSize="11" Foreground="{DynamicResource ColorBrush3}" />
                        <TextBlock Text="__SEED__" FontSize="20" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" Margin="0,4,0,0" ToolTip="点击「更多」可从备选种子中挑选" />
                    </StackPanel>
                </StackPanel>
            </Border>
            <local:MyHint Theme="Blue" Margin="0,0,0,12" Text="__SEED_DESC__" />
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <local:MyIconTextButton Grid.Column="0" Margin="0,0,4,0" Height="38" Text="复制种子" ColorType="Highlight" LogoScale="0.9" Logo="M448 128h128v384h128l-192 192-192-192h128V128z M256 832h512v64H256z" EventType="复制文本" EventData="__SEED__" />
                <local:MyIconTextButton Grid.Column="1" Margin="4,0,4,0" Height="38" Text="换一个" LogoScale="0.9" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />
                <local:MyIconTextButton Grid.Column="2" Margin="4,0,0,0" Height="38" Text="更多" LogoScale="0.9" Logo="M256 384a128 128 0 1 1 0 256 128 128 0 0 1 0-256z M512 384a128 128 0 1 1 0 256 128 128 0 0 1 0-256z M768 384a128 128 0 1 1 0 256 128 128 0 0 1 0-256z" EventType="弹出窗口" EventData="__SEED_PICKER__" />
            </Grid>
            <Border Height="1" Margin="0,0,0,16"><Border.Background><LinearGradientBrush StartPoint="0,0" EndPoint="1,0"><GradientStop Color="#00000000" Offset="0" /><GradientStop Color="#33808080" Offset="0.5" /><GradientStop Color="#00000000" Offset="1" /></LinearGradientBrush></Border.Background></Border>
            <Border CornerRadius="12" Height="150" Margin="0,0,0,12" Background="{DynamicResource ColorBrush7}">
                <Grid Margin="18,0">
                    <StackPanel Orientation="Horizontal" HorizontalAlignment="Left" VerticalAlignment="Top" Margin="0,16,0,0">
                        <local:MyImage Width="16" Height="16" Margin="0,0,4,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/CommandBlock.png" />
                        <TextBlock Text="本次挑战" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />
                    </StackPanel>
                    <TextBlock HorizontalAlignment="Right" VerticalAlignment="Top" Margin="0,16,0,0" Text="__CHALLENGE_DIFF__" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" />
                    <TextBlock Text="__CHALLENGE__" FontSize="20" FontWeight="Bold" HorizontalAlignment="Center" VerticalAlignment="Center" TextWrapping="Wrap" Foreground="{DynamicResource ColorBrush1}" Margin="24,20" TextAlignment="Center" ToolTip="难度决定卡片配色；点「换一个挑战」刷新" />
                </Grid>
            </Border>
            <local:MyIconTextButton HorizontalAlignment="Center" Height="40" Padding="24,0,24,0" Text="换一个挑战" ColorType="Highlight" LogoScale="0.9" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />
        </StackPanel>
    </local:MyCard>
    <local:MyCard Title="更多" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,16">
            <StackPanel.Triggers>
                <EventTrigger RoutedEvent="StackPanel.Loaded">
                    <BeginStoryboard>
                        <Storyboard>
                            <DoubleAnimation Storyboard.TargetProperty="Opacity"
                                             From="0" To="1" Duration="0:0:0.90"
                                             BeginTime="0:0:1.05">
                                <DoubleAnimation.EasingFunction>
                                    <CubicEase EasingMode="EaseOut" />
                                </DoubleAnimation.EasingFunction>
                            </DoubleAnimation>
                            <DoubleAnimation
                                Storyboard.TargetProperty="(UIElement.Effect).(BlurEffect.Radius)"
                                From="8" To="0" Duration="0:0:0.90" BeginTime="0:0:1.05" />
                        </Storyboard>
                    </BeginStoryboard>
                </EventTrigger>
            </StackPanel.Triggers>
            <StackPanel.Effect>
                <BlurEffect Radius="0" />
            </StackPanel.Effect>
            <local:MyListItem Margin="-5,0,-5,8" Type="Clickable" Logo="pack://application:,,,/images/Blocks/RedstoneLampOn.png" Title="打开更多功能" Info="MC 知识 · 实用工具 · 服务器推荐" EventType="打开帮助" EventData="{{BASE_URL}}/panel.json" />
            <Grid Margin="0,4,0,0">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <local:MyIconTextButton Grid.Column="0" Margin="0,0,4,0" Height="40" Text="问题反馈" LogoScale="0.9" ColorType="Highlight" Logo="M512 0C229 0 0 229 0 512c0 226 147 418 351 486 26 5 35-11 35-25 0-12 0-44-1-86-143 31-173-69-173-69-23-59-57-75-57-75-47-32 4-31 4-31 52 4 79 53 79 53 46 79 121 56 150 43 5-33 18-56 33-69-114-13-234-57-234-254 0-56 20-102 53-138-5-13-23-65 5-136 0 0 43-14 141 53 41-11 85-17 129-17s88 6 129 17c98-67 141-53 141-53 28 71 10 123 5 136 33 36 53 82 53 138 0 198-120 241-235 254 18 16 35 47 35 95 0 69-1 124-1 141 0 14 9 30 35 25 204-68 351-260 351-486C1024 229 795 0 512 0z" EventType="打开网页" EventData="https://github.com/wlasfjdskfj/pcl-homepage/issues" />
                <local:MyIconTextButton Grid.Column="1" Margin="6,0,0,0" Height="40" Text="查看源码" LogoScale="0.9" Logo="M384 320l-192 192 192 192z M640 320v384l192-192z" EventType="打开网页" EventData="https://github.com/wlasfjdskfj/pcl-homepage" />
            </Grid>
        </StackPanel>
    </local:MyCard>
</StackPanel>
