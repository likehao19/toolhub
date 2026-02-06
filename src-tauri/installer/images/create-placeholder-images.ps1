# 创建 NSIS 安装程序占位图片
# 此脚本使用 .NET 库创建基本的 BMP 图片

Add-Type -AssemblyName System.Drawing

# 创建 Header 图片 (500x60)
$headerWidth = 500
$headerHeight = 60
$headerBitmap = New-Object System.Drawing.Bitmap($headerWidth, $headerHeight)
$headerGraphics = [System.Drawing.Graphics]::FromImage($headerBitmap)

# 设置背景色（浅蓝色）
$backgroundColor = [System.Drawing.Color]::FromArgb(230, 240, 250)
$headerGraphics.Clear($backgroundColor)

# 添加文字
$font = New-Object System.Drawing.Font("Microsoft YaHei", 16, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 80, 120))
$headerGraphics.DrawString("Vue3 Tauri Desktop App", $font, $brush, 20, 15)

# 保存为 BMP
$headerPath = Join-Path $PSScriptRoot "installer-header.bmp"
$headerBitmap.Save($headerPath, [System.Drawing.Imaging.ImageFormat]::Bmp)

# 清理
$headerGraphics.Dispose()
$headerBitmap.Dispose()
$font.Dispose()
$brush.Dispose()

Write-Host "Header image created: $headerPath" -ForegroundColor Green

# 创建 Sidebar 图片 (164x314)
$sidebarWidth = 164
$sidebarHeight = 314
$sidebarBitmap = New-Object System.Drawing.Bitmap($sidebarWidth, $sidebarHeight)
$sidebarGraphics = [System.Drawing.Graphics]::FromImage($sidebarBitmap)

# 渐变背景
$startColor = [System.Drawing.Color]::FromArgb(200, 220, 240)
$endColor = [System.Drawing.Color]::FromArgb(230, 240, 250)
$rect = New-Object System.Drawing.Rectangle(0, 0, $sidebarWidth, $sidebarHeight)
$linearBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $startColor, $endColor, 90)
$sidebarGraphics.FillRectangle($linearBrush, $rect)

# 添加文字
$titleFont = New-Object System.Drawing.Font("Microsoft YaHei", 12, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 80, 120))

# 居中绘制文字
$text = "Vue3 Tauri`nDesktop App"
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

$textRect = New-Object System.Drawing.RectangleF(0, 120, $sidebarWidth, 80)
$sidebarGraphics.DrawString($text, $titleFont, $textBrush, $textRect, $format)

# 保存为 BMP
$sidebarPath = Join-Path $PSScriptRoot "installer-sidebar.bmp"
$sidebarBitmap.Save($sidebarPath, [System.Drawing.Imaging.ImageFormat]::Bmp)

# 清理
$sidebarGraphics.Dispose()
$sidebarBitmap.Dispose()
$titleFont.Dispose()
$textBrush.Dispose()
$linearBrush.Dispose()

Write-Host "Sidebar image created: $sidebarPath" -ForegroundColor Green
Write-Host "Placeholder images created successfully!" -ForegroundColor Cyan
