<Border CornerRadius="10" Padding="12,12" Margin="0,0,0,8" Background="{DynamicResource ColorBrush7}">
    <Grid>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*" />
            <ColumnDefinition Width="Auto" />
        </Grid.ColumnDefinitions>
        <StackPanel Grid.Column="0" VerticalAlignment="Center">
            <TextBlock Text="{{NAME}}" FontSize="15" FontWeight="Bold" Foreground="{DynamicResource ColorBrush1}" />
            <TextBlock Text="{{ADDRESS}}" FontSize="11" Foreground="{DynamicResource ColorBrush3}" Margin="0,2,0,0" />
        </StackPanel>
        <local:MyIconTextButton Grid.Column="1" Height="32" Padding="12,0,12,0" Text="复制" LogoScale="0.8" ColorType="Highlight" Logo="{{COPY_LOGO}}" EventType="复制文本" EventData="{{ADDRESS}}" />
    </Grid>
</Border>
