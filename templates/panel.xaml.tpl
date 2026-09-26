<StackPanel Margin="0,-10,0,0"
    xmlns:sys="clr-namespace:System;assembly=mscorlib"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:local="clr-namespace:PCL;assembly=Plain Craft Launcher 2">
    <TextBlock Text="更多功能"
               FontSize="22" FontWeight="SemiBold"
               HorizontalAlignment="Center"
               Margin="0,10,0,12">
        <TextBlock.Foreground>
            <SolidColorBrush x:Name="PanelTitleBrush" Color="#58A6FF" />
        </TextBlock.Foreground>
        <TextBlock.Triggers>
            <EventTrigger RoutedEvent="Loaded">
                <BeginStoryboard>
                    <Storyboard RepeatBehavior="Forever">
                        <ColorAnimationUsingKeyFrames
                            Storyboard.TargetName="PanelTitleBrush"
                            Storyboard.TargetProperty="Color">
                            <LinearColorKeyFrame Value="#58A6FF" KeyTime="0:0:0" />
                            <LinearColorKeyFrame Value="#79C0FF" KeyTime="0:0:2" />
                            <LinearColorKeyFrame Value="#39C5CF" KeyTime="0:0:4" />
                            <LinearColorKeyFrame Value="#A371F7" KeyTime="0:0:6" />
                            <LinearColorKeyFrame Value="#58A6FF" KeyTime="0:0:8" />
                        </ColorAnimationUsingKeyFrames>
                    </Storyboard>
                </BeginStoryboard>
            </EventTrigger>
        </TextBlock.Triggers>
    </TextBlock>
    <local:MyCard Title="MC 知识" CanSwap="True" Margin="0,0,0,12">
        <StackPanel Margin="25,40,23,16">
            <Border CornerRadius="12" Margin="0,0,0,12" ClipToBounds="True">
                <Grid Height="260" ClipToBounds="True">
                    <local:MyImage Source="__QUIZ_IMAGE__" HorizontalAlignment="Stretch" VerticalAlignment="Center" Stretch="UniformToFill" />
                    <Border>
                        <Border.Background>
                            <LinearGradientBrush StartPoint="0,0" EndPoint="0,1">
                                <GradientStop Color="#8C000000" Offset="0" />
                                <GradientStop Color="#14000000" Offset="0.4" />
                                <GradientStop Color="#D9000000" Offset="1" />
                            </LinearGradientBrush>
                        </Border.Background>
                    </Border>
                    <Grid Margin="18,14,16,0" VerticalAlignment="Top">
                        <StackPanel Orientation="Horizontal" HorizontalAlignment="Left" VerticalAlignment="Center">
                            <Border Width="4" Height="22" CornerRadius="2" Background="__QUIZ_ACCENT__" Margin="0,0,8,0" />
                            <local:MyImage Width="20" Height="20" Margin="0,0,8,0" VerticalAlignment="Center" Source="pack://application:,,,/images/Blocks/CommandBlock.png" />
                            <TextBlock Text="每日一题" FontSize="15" FontWeight="Bold" Foreground="#FFFFFF" VerticalAlignment="Center" />
                        </StackPanel>
                        <!-- __QUIZ_TAG__ -->
                    </Grid>
                    <StackPanel VerticalAlignment="Bottom" Margin="22,0,22,16">
                        <TextBlock Text="__QUIZ_Q__" FontSize="15" FontWeight="Bold" Foreground="#FFFFFF" TextWrapping="Wrap" TextAlignment="Center" HorizontalAlignment="Center" MaxWidth="640" LineHeight="24" />
                        <TextBlock Text="今日专属 · __QUIZ_NO__" FontSize="11" Foreground="#CCFFFFFF" HorizontalAlignment="Center" Margin="0,8,0,0" />
                    </StackPanel>
                </Grid>
            </Border>
            <local:MyIconTextButton HorizontalAlignment="Stretch" Height="42" Text="查看答案" ColorType="Highlight" LogoScale="0.9" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M512 320a128 128 0 0 1 128 128c0 64-64 96-96 128v32h-64v-48c0-64 96-80 96-112a64 64 0 1 0-128 0h-64a128 128 0 0 1 128-128z M480 640h64v64h-64z">
                <local:CustomEventService.Events>
                    <local:CustomEventCollection>
                        <local:CustomEvent Type="弹出窗口" Data="每日一题 · 答案|__QUIZ_A__" />
                    </local:CustomEventCollection>
                </local:CustomEventService.Events>
            </local:MyIconTextButton>
            <Border Height="1" Margin="0,18,0,12"><Border.Background><LinearGradientBrush StartPoint="0,0" EndPoint="1,0"><GradientStop Color="#00000000" Offset="0" /><GradientStop Color="#33808080" Offset="0.5" /><GradientStop Color="#00000000" Offset="1" /></LinearGradientBrush></Border.Background></Border>
            <Border CornerRadius="12" Margin="0,0,0,12" Background="{DynamicResource ColorBrush7}">
                <Grid Margin="18,15">
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="*" />
                        <ColumnDefinition Width="Auto" />
                    </Grid.ColumnDefinitions>
                    <StackPanel Grid.Column="0" VerticalAlignment="Center">
                        <TextBlock Text="神秘彩蛋" FontSize="15" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />
                        <TextBlock Text="今天属于你的彩蛋，明天自动换新" FontSize="11" Foreground="{DynamicResource ColorBrush3}" Margin="0,4,0,0" />
                    </StackPanel>
                    <Grid Grid.Column="1" Width="46" Height="46" VerticalAlignment="Center">
                        <local:MyImage Width="36" Height="36" Source="pack://application:,,,/images/Blocks/Egg.png" />
                    </Grid>
                </Grid>
            </Border>
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="1*" />
                    <ColumnDefinition Width="1*" />
                </Grid.ColumnDefinitions>
                <local:MyIconTextButton Grid.Column="0" Margin="0,0,4,0" HorizontalAlignment="Stretch" Height="42" Text="打开彩蛋" ColorType="Highlight" LogoScale="0.9" Logo="M320 128h384c35 0 64 29 64 64v640c0 35-29 64-64 64H320c-35 0-64-29-64-64V192c0-35 29-64 64-64z M320 192v640h384V192H320z M384 256h256v64H384z M384 384h256v64H384z M384 512h256v64H384z">
                    <local:CustomEventService.Events>
                        <local:CustomEventCollection>
                            <local:CustomEvent Type="弹出窗口" Data="__EGG_DATA__" />
                        </local:CustomEventCollection>
                    </local:CustomEventService.Events>
                </local:MyIconTextButton>
                <local:MyIconTextButton Grid.Column="1" Margin="4,0,0,0" HorizontalAlignment="Stretch" Height="42" Text="彩蛋网站" ColorType="Highlight" LogoScale="0.9" Logo="M448 128h128v384h128l-192 192-192-192h128V128z M256 832h512v64H256z" EventType="打开网页" EventData="{{BASE_URL}}/site/" ToolTip="点一下看看" />
            </Grid>
        </StackPanel>
    </local:MyCard>
    <local:MyCard Title="画板" CanSwap="True" Margin="0,0,0,12">
        <StackPanel Margin="25,40,23,16">
            <local:MyHint Theme="Blue" Margin="0,0,0,12"
                          Text="按住左键即可作画。画错了只能重开页面（刷新）。" />
            <InkCanvas EditingMode="Ink" MinHeight="380" Margin="0"
                       Background="{DynamicResource ColorBrush7}">
                <InkCanvas.DefaultDrawingAttributes>
                    <DrawingAttributes Color="#1A1A1A" Width="3" Height="3" FitToCurve="true" />
                </InkCanvas.DefaultDrawingAttributes>
            </InkCanvas>
            <local:MyHint Theme="Yellow" Margin="0,12,0,0"
                          Text="PCL 不支持把画作导出为文件。想保存请按 Win+Shift+S 截图，或直接对画板拍照。" />
        </StackPanel>
    </local:MyCard>
    <local:MyCard Title="实用工具" CanSwap="True" Margin="0,0,0,12">
        <StackPanel Margin="25,40,23,16">
            <local:MyListItem Margin="-5,0,-5,4" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Grass.png" Title="Minecraft Wiki" Info="查阅方块、生物与游戏机制" EventType="打开网页" EventData="https://zh.minecraft.wiki/" />
            <local:MyListItem Margin="-5,0,-5,4" Type="Clickable" Logo="pack://application:,,,/images/Blocks/RedstoneBlock.png" Title="苦力怕论坛" Info="Minecraft 中文资源与交流社区" EventType="打开网页" EventData="https://klpbbs.com/" />
            <local:MyListItem Margin="-5,0,-5,4" Type="Clickable" Logo="pack://application:,,,/images/Blocks/GoldBlock.png" Title="Hypixel" Info="全球最大的 Minecraft 小游戏服务器" EventType="打开网页" EventData="https://hypixel.net/" />
            <local:MyListItem Margin="-5,0,-5,4" Type="Clickable" Logo="pack://application:,,,/images/Blocks/Anvil.png" Title="Modrinth" Info="下载模组、整合包与资源包" EventType="打开网页" EventData="https://modrinth.com/" />
            <local:MyListItem Margin="-5,0,-5,4" Type="Clickable" Logo="https://www.mcmod.cn/images/favicon.ico" Title="MC百科" Info="最大的 Minecraft 中文 MOD 百科" EventType="打开网页" EventData="https://www.mcmod.cn/" />
            <local:MyListItem Margin="-5,0,-5,4" Type="Clickable" Logo="pack://application:,,,/images/Blocks/CommandBlock.png" Title="MCDoctor" Info="AI 崩溃日志分析，自动诊断崩溃原因" EventType="打开网页" EventData="https://mcdoctor.ai/" />
            <local:MyListItem Margin="-5,0,-5,0" Type="Clickable" Logo="https://s.namemc.com/img/favicon-128.png" Title="NameMC" Info="查询 Minecraft 皮肤与用户名" EventType="打开网页" EventData="https://namemc.com/" />
        </StackPanel>
    </local:MyCard>
</StackPanel>
