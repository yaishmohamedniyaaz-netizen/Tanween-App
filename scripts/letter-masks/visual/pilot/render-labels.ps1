param([string]$InputPath, [string]$OutputDir)
Add-Type -AssemblyName System.Drawing
$labels = Get-Content -LiteralPath $InputPath -Raw -Encoding UTF8 | ConvertFrom-Json
$font = New-Object System.Drawing.Font('Traditional Arabic', 48, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$format = New-Object System.Drawing.StringFormat
$format.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
foreach ($label in $labels) {
  $bitmap = New-Object System.Drawing.Bitmap(180,100)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::White)
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $rectangle = New-Object System.Drawing.RectangleF(0,0,180,100)
  $graphics.DrawString($label.text, $font, [System.Drawing.Brushes]::Black, $rectangle, $format)
  $bitmap.Save((Join-Path $OutputDir ($label.key + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose()
}
$font.Dispose(); $format.Dispose()
