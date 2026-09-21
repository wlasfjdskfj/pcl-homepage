// 主页公告：多公告轮播（banners，≥2 条）优先，否则单条公告（homepage_banner，淡入/跑马灯）
import { escapeXaml } from './xaml.js';

// 多公告轮播卡片（每行一条，最多 4 条，每条显示 8 秒）
function buildMultiBanner(mbRaw) {
  if (!mbRaw) return "";
  const mbs = mbRaw.split(/\r?\n/).map((x) => x.trim()).filter((x) => x);
  if (mbs.length < 2) return "";
  const bn2 = Math.min(mbs.length, 4);
  const per = 8;
  let anims = "", texts = "";
  for (let i = 0; i < bn2; i++) {
    const on0 = i * per, off0 = (i + 1) * per - 1;
    texts += '<TextBlock x:Name="mb' + i + '" Text="' + escapeXaml(mbs[i]) + '" FontSize="15" LineHeight="24" Foreground="{DynamicResource ColorBrush1}" VerticalAlignment="Center" Opacity="0"/>';
    anims += '<DoubleAnimation Storyboard.TargetName="mb' + i + '" Storyboard.TargetProperty="Opacity" From="0" To="1" Duration="0:0:1" BeginTime="0:0:' + on0 + '"/>'
      + '<DoubleAnimation Storyboard.TargetName="mb' + i + '" Storyboard.TargetProperty="Opacity" From="1" To="0" Duration="0:0:1" BeginTime="0:0:' + off0 + '"/>';
  }
  return '<local:MyCard Title="公告" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">'
    + '<StackPanel Margin="25,36,23,16" ClipToBounds="True" Height="28">'
    + '<Grid>'
    + '<Grid.Triggers><EventTrigger RoutedEvent="FrameworkElement.Loaded"><BeginStoryboard><Storyboard RepeatBehavior="Forever">' + anims + '</Storyboard></BeginStoryboard></EventTrigger></Grid.Triggers>'
    + texts
    + '</Grid>'
    + '</StackPanel>'
    + '</local:MyCard>';
}

// 单条公告：≤40 字淡入，超长跑马灯
function buildSingleBanner(bn) {
  if (!bn || !bn.enabled || !bn.text || !String(bn.text).trim()) return "";
  const bText = String(bn.text).trim();
  if (bText.length <= 40) {
    return '<local:MyCard Title="公告" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">'
      + '<StackPanel Margin="25,36,23,16">'
      + '<StackPanel.Triggers><EventTrigger RoutedEvent="FrameworkElement.Loaded"><BeginStoryboard><Storyboard>'
      + '<DoubleAnimation Storyboard.TargetName="bqFade" Storyboard.TargetProperty="Opacity" From="0" To="1" Duration="0:0:0.6"/>'
      + '</Storyboard></BeginStoryboard></EventTrigger></StackPanel.Triggers>'
      + '<TextBlock x:Name="bqFade" TextWrapping="Wrap" FontSize="15" LineHeight="24" Foreground="{DynamicResource ColorBrush1}" Text="' + escapeXaml(bText) + '"/>'
      + '</StackPanel>'
      + '</local:MyCard>';
  }
  const bTextW = bText.length * 15;
  const bTo = -(bTextW + 40);
  const bDur = Math.max(8, Math.min(30, Math.round((500 - bTo) / 50)));
  return '<local:MyCard Title="公告" Margin="0,0,0,12" CanSwap="True" IsSwapped="False">'
    + '<StackPanel Margin="25,36,23,16" ClipToBounds="True" Height="28">'
    + '<TextBlock Text="' + escapeXaml(bText) + '" FontSize="15" LineHeight="24" Foreground="{DynamicResource ColorBrush1}" VerticalAlignment="Center">'
    + '<TextBlock.RenderTransform><TranslateTransform x:Name="bqMarquee" X="0"/></TextBlock.RenderTransform>'
    + '<TextBlock.Triggers><EventTrigger RoutedEvent="FrameworkElement.Loaded"><BeginStoryboard><Storyboard RepeatBehavior="Forever">'
    + '<DoubleAnimation Storyboard.TargetName="bqMarquee" Storyboard.TargetProperty="X" From="500" To="' + bTo + '" Duration="0:0:' + bDur + '"/>'
    + '</Storyboard></BeginStoryboard></EventTrigger></TextBlock.Triggers>'
    + '</TextBlock>'
    + '</StackPanel>'
    + '</local:MyCard>';
}

export { buildMultiBanner, buildSingleBanner };
