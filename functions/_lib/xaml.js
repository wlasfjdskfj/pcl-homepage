// XAML 构建与转义工具（从 _middleware.js 抽离）

// XAML 文本转义（后台可配置文案进入 XAML 前必须调用，避免一个 & 或 < 导致整页白屏）
function escapeXaml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 随机挑战渐变背景（按难度配色）
function buildChallengeBg(diff) {
  const d = diff || "";
  let c;
  if (/噩梦|地狱/.test(d)) c = ["#4A148C", "#AD1457"];
  else if (/困难/.test(d)) c = ["#B71C1C", "#F57C00"];
  else if (/专家/.test(d)) c = ["#5E35B1", "#D81B60"];
  else if (/简单/.test(d)) c = ["#1B6B3A", "#66BB6A"];
  else c = ["#1565C0", "#42A5F5"];
  return '<LinearGradientBrush StartPoint="0,0" EndPoint="1,1">'
    + '<GradientStop Color="' + c[0] + '" Offset="0" />'
    + '<GradientStop Color="' + c[1] + '" Offset="1" />'
    + '</LinearGradientBrush>';
}

// 人品分数条（10 格，红→黄→绿）
function buildScoreBar(score) {
  const blocks = 10;
  const filled = Math.floor(score / 10);
  let bar = '<StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,14">';
  for (let i = 0; i < blocks; i++) {
    let bg;
    if (i >= filled) {
      bg = '{DynamicResource ColorBrush7}';
    } else {
      const pos = i / blocks;
      if (pos < 0.4) {
        bg = '#FF6B6B';
      } else if (pos < 0.7) {
        bg = '#FFC93C';
      } else {
        bg = '#4ADE80';
      }
    }
    bar += '<Border Width="24" Height="9" CornerRadius="4.5" Margin="1.5,0" Background="' + bg + '" />';
  }
  bar += '</StackPanel>';
  return bar;
}

// 刷新按钮（兜底页复用）
const REFRESH_BUTTON = '<local:MyIconTextButton Margin="0,24,0,0" Height="40" HorizontalAlignment="Center" Text="刷新页面" LogoScale="0.9" ColorType="Highlight" Logo="M512 128a384 384 0 1 1 0 768 384 384 0 0 1 0-768z M512 192a320 320 0 1 0 0 640 320 320 0 0 0 0-640z M480 288h64v208l144 88-32 56-176-104V288z" EventType="刷新页面" EventData="-" />';

// 兜底/封禁等页面；showLoading=true 时渲染"服务器正在更新"施工动画
function buildFallbackXaml(title, message, eta, reason) {
  const showLoading = title === '服务器正在更新';

  // 简单场景（如访问被拒绝）：红圈禁止图标 + 居中标题 + 说明 + 刷新按钮
  if (!showLoading) {
    return '<StackPanel>' +
      '<local:MyCard Title="" Margin="0,0,0,15">' +
      '<StackPanel Margin="30,40,30,32">' +
      '<Grid Width="64" Height="64" HorizontalAlignment="Center">' +
      '<Ellipse Width="64" Height="64" Fill="#FFE5484D"/>' +
      '<Path Data="M20,20 L44,44" Stroke="#FFFFFFFF" StrokeThickness="8" StrokeStartLineCap="Round" StrokeEndLineCap="Round"/>' +
      '</Grid>' +
      '<TextBlock Text="' + escapeXaml(title) + '" FontSize="20" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" TextAlignment="Center" HorizontalAlignment="Center" Margin="0,18,0,0"/>' +
      '<TextBlock Text="' + escapeXaml(message) + '" FontSize="14" Foreground="{DynamicResource ColorBrush3}" TextAlignment="Center" TextWrapping="Wrap" MaxWidth="420" HorizontalAlignment="Center" LineHeight="24" Margin="0,10,0,0"/>' +
      REFRESH_BUTTON +
      '</StackPanel>' +
      '</local:MyCard>' +
      '</StackPanel>';
  }

  // ===== 服务器正在更新：精致加载页 =====
  const statusText = '短暂的等待，是为了之后更长久的顺畅，感谢您的耐心。';
  const statusLine =
    '<TextBlock Text="' + statusText + '" FontSize="15" Foreground="{DynamicResource ColorBrush3}" TextAlignment="Center" TextWrapping="Wrap" MaxWidth="440" HorizontalAlignment="Center" LineHeight="26" Margin="0,18,0,0"/>';

  // 旋转加载圈
  const spinner =
    '<Grid Width="64" Height="64" HorizontalAlignment="Center">' +
    '<Ellipse Width="64" Height="64" Stroke="#22000000" StrokeThickness="5"/>' +
    '<Ellipse Width="64" Height="64" Stroke="#FF4C8DFF" StrokeThickness="5" StrokeDashArray="1.4,100" StrokeDashCap="Round" RenderTransformOrigin="0.5,0.5">' +
    '<Ellipse.RenderTransform><RotateTransform x:Name="spin" Angle="0"/></Ellipse.RenderTransform>' +
    '<Ellipse.Triggers><EventTrigger RoutedEvent="Ellipse.Loaded"><BeginStoryboard><Storyboard RepeatBehavior="Forever">' +
    '<DoubleAnimation Storyboard.TargetName="spin" Storyboard.TargetProperty="Angle" From="0" To="360" Duration="0:0:1.1"/>' +
    '</Storyboard></BeginStoryboard></EventTrigger></Ellipse.Triggers>' +
    '</Ellipse>' +
    '</Grid>';

  let etaLine = '';
  if (eta && eta !== '0') {
    etaLine = '<TextBlock Text="预计 ' + escapeXaml(eta) + ' 更新完成" FontSize="14" Foreground="{DynamicResource ColorBrush3}" TextAlignment="Center" HorizontalAlignment="Center" Margin="0,16,0,0"/>';
  }
  let reasonLine = '';
  if (reason && reason.trim()) {
    reasonLine = '<TextBlock Text="原因：' + escapeXaml(reason) + '" FontSize="13" Foreground="{DynamicResource ColorBrush2}" TextAlignment="Center" TextWrapping="Wrap" MaxWidth="440" HorizontalAlignment="Center" LineHeight="22" Margin="0,8,0,0"/>';
  }

  return '<StackPanel>' +
    '    <local:MyCard Title="" Margin="0,0,0,15">' +
    '        <StackPanel Margin="30,42,30,34">' +
    spinner +
    '            <TextBlock Text="服务器正在更新" FontSize="20" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" TextAlignment="Center" HorizontalAlignment="Center" Margin="0,20,0,0"/>' +
    statusLine +
    reasonLine +
    etaLine +
    REFRESH_BUTTON +
    '            <local:MyHint Theme="Yellow" Margin="0,18,0,0" Text="' + escapeXaml(message) + '" />' +
    '            <local:MyHint Theme="Blue" Margin="0,10,0,0" Text="如果一直看到这个页面，请去 GitHub 提 Issue。" />' +
    '        </StackPanel>' +
    '    </local:MyCard>' +
    '</StackPanel>';
}

export { escapeXaml, buildChallengeBg, buildScoreBar, buildFallbackXaml };
