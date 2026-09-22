<StackPanel>
    <!-- __BANNER__ -->
    <local:MyCard Title="今日概览" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,16">
            <!-- __FESTIVAL_BANNER__ -->
            <Border CornerRadius="12" Height="280" Margin="0,0,0,16" ClipToBounds="True">
                <Grid>
                    <local:MyImage Source="{{WALLPAPER_URL}}" HorizontalAlignment="Stretch" VerticalAlignment="Stretch" Stretch="UniformToFill" />
                    <Border>
                        <Border.Background>
                            <LinearGradientBrush StartPoint="0,0" EndPoint="0,1">
                                <GradientStop Color="#26000000" Offset="0" />
                                <GradientStop Color="#59000000" Offset="0.55" />
                                <GradientStop Color="#8C000000" Offset="1" />
                            </LinearGradientBrush>
                        </Border.Background>
                    </Border>
                    <Border HorizontalAlignment="Left" VerticalAlignment="Top" Margin="18,16,0,0" Background="#59000000" CornerRadius="14" Padding="12,10,16,10">
                        <StackPanel>
                            <StackPanel Orientation="Horizontal">
                                <Border Width="26" Height="26" CornerRadius="13" Background="{DynamicResource ColorBrush1}" Margin="0,0,8,0" VerticalAlignment="Center">
                                    <local:MyImage Width="16" Height="16" HorizontalAlignment="Center" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/Grass.png" />
                                </Border>
                                <TextBlock Text="__GREETING__" FontSize="15" FontWeight="Bold" Foreground="White" VerticalAlignment="Center" />
                                <TextBlock Text="{user}" FontSize="15" FontWeight="Bold" Foreground="White" VerticalAlignment="Center" Margin="6,0,0,0" />
                            </StackPanel>
                            <TextBlock Text="__GREETING_SUB__" FontSize="12" Foreground="#D9FFFFFF" Margin="0,4,0,0" MaxWidth="250" TextWrapping="Wrap" />
                        </StackPanel>
                    </Border>
                    <!-- __COUNTDOWN_BODY__ -->
                    <StackPanel VerticalAlignment="Center" HorizontalAlignment="Center">
                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
                            <TextBlock Text="__DATE_MONTH__" FontSize="60" FontWeight="Bold" Foreground="White" />
                            <TextBlock Text=" 月 " FontSize="15" VerticalAlignment="Bottom" Margin="0,0,4,16" Foreground="#CCFFFFFF" />
                            <TextBlock Text="__DATE_DAY__" FontSize="60" FontWeight="Bold" Foreground="White" />
                            <TextBlock Text=" 日" FontSize="15" VerticalAlignment="Bottom" Margin="0,0,4,16" Foreground="#CCFFFFFF" />
                        </StackPanel>
                        <TextBlock Text="星期__DATE_WEEKDAY__" HorizontalAlignment="Center" FontSize="12" FontWeight="Bold" Foreground="#EEFFFFFF" Margin="0,10,0,0" />
                    </StackPanel>
                </Grid>
            </Border>
            <!-- 每日一言（按 IP 下发；放在照片外，浅色/深色主题下都清晰） -->
            <StackPanel Margin="0,0,0,16">
                <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,8">
                    <Border Width="3" Height="12" CornerRadius="1.5" Background="{DynamicResource ColorBrush3}" Margin="0,0,8,0" VerticalAlignment="Center" />
                    <TextBlock Text="每日一言" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />
                </StackPanel>
                <TextBlock Text="__QUOTE__" FontSize="12" Foreground="{DynamicResource ColorBrush3}" TextWrapping="Wrap" TextAlignment="Center" HorizontalAlignment="Center" MaxWidth="560" LineHeight="20" />
            </StackPanel>
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
            <Border CornerRadius="10" Padding="18,16" Margin="0,0,0,12" Background="{DynamicResource ColorBrush7}">
                <StackPanel>
                    <Grid Margin="0,0,0,12">
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="Auto" />
                            <ColumnDefinition Width="*" />
                        </Grid.ColumnDefinitions>
                        <local:MyImage Grid.Column="0" Width="22" Height="22" Margin="0,0,12,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/CommandBlock.png" />
                        <StackPanel Grid.Column="1" VerticalAlignment="Center">
                            <TextBlock Text="玩家 ID" FontSize="11" Foreground="{DynamicResource ColorBrush3}" />
                            <TextBlock Text="{user}" FontSize="15" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" Margin="0,2,0,0" />
                            <TextBlock Text="{user}" FontSize="1" Foreground="Transparent" />
                        </StackPanel>
                    </Grid>
                    <Border Height="1" Margin="0,0,0,12" Background="{DynamicResource ColorBrush4}" />
                    <Grid>
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="Auto" />
                            <ColumnDefinition Width="*" />
                        </Grid.ColumnDefinitions>
                        <local:MyImage Grid.Column="0" Width="22" Height="22" Margin="0,0,12,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/RedstoneBlock.png" />
                        <StackPanel Grid.Column="1" VerticalAlignment="Center">
                            <TextBlock Text="公网 IP" FontSize="11" Foreground="{DynamicResource ColorBrush3}" />
                            <TextBlock Text="__USER_IP__" FontSize="15" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" Margin="0,2,0,0" />
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
    <local:MyCard Title="当前最新版本 · {{MAIN_VERSION}}" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,16">
            <Border CornerRadius="12" Height="200" Margin="0,0,0,12" Background="{DynamicResource ColorBrush7}" ClipToBounds="True">
                <Grid>
                    <local:MyImage Source="{{VERSION_IMAGE_SOURCE}}" HorizontalAlignment="Center" VerticalAlignment="Center" Stretch="UniformToFill" />
                    <Border HorizontalAlignment="Center" VerticalAlignment="Bottom" Background="#CC1A1A1A" CornerRadius="12" Padding="18,6,18,6" Margin="0,0,0,16" BorderBrush="#33FFFFFF" BorderThickness="1">
                        <StackPanel Orientation="Horizontal">
                            <Border Width="6" Height="6" CornerRadius="3" Background="#FFFFFF" VerticalAlignment="Center" Margin="0,0,8,0" />
                            <TextBlock Text="{{SNAP_VERSION}}" FontSize="15" FontWeight="Bold" Foreground="White" VerticalAlignment="Center" />
                        </StackPanel>
                    </Border>
                </Grid>
            </Border>
            <TextBlock Text="最新快照：{{SNAP_VERSION}}" HorizontalAlignment="Center" FontSize="11" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,12" />
            <TextBlock Text="最后更新 {{MAIN_DATE}}" FontSize="11" Foreground="{DynamicResource ColorBrush3}" HorizontalAlignment="Right" Margin="0,0,0,12" />
            <Border Height="1" Margin="0,0,0,12" Background="{DynamicResource ColorBrush4}" />
            <StackPanel Orientation="Horizontal" Margin="2,0,0,8">
                <Border Width="3" Height="11" CornerRadius="1.5" Background="{DynamicResource ColorBrush3}" Margin="0,0,8,0" VerticalAlignment="Center" />
                <TextBlock Text="最近正式版" FontSize="12" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" VerticalAlignment="Center" />
            </StackPanel>
{{RELEASE_ITEMS}}
            <local:MyHint Theme="Blue" Margin="0,6,0,12" Text="数据来源：Mojang 官方版本清单，只显示正式版。点击任意版本查看该版本的更新总结。" />
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <local:MyIconTextButton Grid.Column="0" Text="下载" LogoScale="0.9" Logo="M448 128h128v384h128l-192 192-192-192h128V128z M256 832h512v64H256z" EventType="打开网页" EventData="https://www.minecraft.net/zh-hans/download" />
                <local:MyIconTextButton Grid.Column="1" Text="服务端" LogoScale="0.9" Logo="M128 192h768v256H128V192z M128 576h768v256H128V576z M192 256h128v128H192V256z M192 640h128v128H192V640z" EventType="打开网页" EventData="https://www.minecraft.net/zh-hans/download/server" />
                <local:MyIconTextButton Grid.Column="2" Text="WIKI" LogoScale="0.9" Logo="M224 96h448c35 0 64 29 64 64v704c0 35-29 64-64 64H224c-35 0-64-29-64-64V160c0-35 29-64 64-64z M224 160v704h448V160H224z M288 224h320v64H288z M288 352h320v64H288z M288 480h320v64H288z M288 608h192v64H288z" EventType="打开网页" EventData="https://zh.minecraft.wiki/" />
                <local:MyIconTextButton Grid.Column="3" Text="更新日志" LogoScale="0.9" ColorType="Highlight" Logo="M192 64h384l256 256v576c0 35-29 64-64 64H192c-35 0-64-29-64-64V128c0-35 29-64 64-64z M576 64v256h256z" EventType="打开网页" EventData="{{WIKI_VERSION_URL}}" />
            </Grid>
        </StackPanel>
    </local:MyCard>
    <local:MyCard Title="今日运势" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,16">
            <TextBlock Text="今日得分" FontSize="11" HorizontalAlignment="Center" Foreground="{DynamicResource ColorBrush3}" Margin="0,0,0,4" />
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
            <Border Height="1" Margin="0,0,0,16" Background="{DynamicResource ColorBrush4}" />
            <Border CornerRadius="10" Padding="16,16" Margin="0,0,0,12" Background="{DynamicResource ColorBrush7}">
                <StackPanel Orientation="Horizontal">
                    <local:MyImage Width="36" Height="36" Margin="0,0,12,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/Grass.png" />
                    <StackPanel VerticalAlignment="Center">
                        <TextBlock Text="今日种子" FontSize="11" Foreground="{DynamicResource ColorBrush3}" />
                        <TextBlock Text="__SEED__" FontSize="20" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" Margin="0,4,0,0" />
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
            <Border Height="1" Margin="0,0,0,16" Background="{DynamicResource ColorBrush4}" />
            <Border CornerRadius="12" Height="150" Margin="0,0,0,12" Background="{DynamicResource ColorBrush7}">
                <Grid Margin="18,0">
                    <StackPanel Orientation="Horizontal" HorizontalAlignment="Left" VerticalAlignment="Top" Margin="0,16,0,0">
                        <local:MyImage Width="16" Height="16" Margin="0,0,4,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/CommandBlock.png" />
                        <TextBlock Text="本次挑战" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" VerticalAlignment="Center" />
                    </StackPanel>
                    <TextBlock HorizontalAlignment="Right" VerticalAlignment="Top" Margin="0,16,0,0" Text="__CHALLENGE_DIFF__" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource ColorBrush3}" />
                    <TextBlock Text="__CHALLENGE__" FontSize="20" FontWeight="Bold" HorizontalAlignment="Center" VerticalAlignment="Center" TextWrapping="Wrap" Foreground="{DynamicResource ColorBrush1}" Margin="24,20" TextAlignment="Center" />
                </Grid>
            </Border>
            <local:MyIconTextButton HorizontalAlignment="Center" Height="40" Padding="24,0,24,0" Text="换一个挑战" ColorType="Highlight" LogoScale="0.9" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />
        </StackPanel>
    </local:MyCard>
    <local:MyCard Title="更多功能" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,16">
            <local:MyListItem Margin="-5,0,-5,8" Type="Clickable" Logo="pack://application:,,,/images/Blocks/RedstoneLampOn.png" Title="打开更多功能" Info="MC 知识 · 实用工具 · 服务器推荐" EventType="打开帮助" EventData="{{BASE_URL}}/panel.json" />
            <local:MyHint Theme="Blue" Text="点击上面这一行，在独立窗口中打开：每日一题与彩蛋、常用网站与指令速查、推荐服务器。" />
        </StackPanel>
    </local:MyCard>
    <local:MyCard Title="反馈" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">
        <StackPanel Margin="25,40,23,16">
            <TextBlock TextWrapping="Wrap" Margin="0,0,0,12" FontSize="12" LineHeight="20" Foreground="{DynamicResource ColorBrush1}" Text="如果主页有问题、想加新功能，或想提建议，欢迎在 GitHub 留言。也可以直接查看源代码。" />
            <Grid>
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
