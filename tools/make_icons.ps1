# يرسم أيقونات عمران (منيب على خلفية خضراء):  powershell -File tools\make_icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $root 'icons') | Out-Null

foreach ($size in 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $s = $size / 100.0
  $g.Clear([System.Drawing.Color]::FromArgb(47, 143, 91))
  $blue = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(79, 142, 240))
  $dark = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(42, 91, 184)), (3 * $s)
  $face = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(233, 243, 255))
  $ink = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(29, 36, 51))
  $gold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 211, 77))
  $g.DrawLine($dark, 50 * $s, 14 * $s, 50 * $s, 26 * $s)
  $g.FillEllipse($gold, 45 * $s, 9 * $s, 10 * $s, 10 * $s)
  $g.FillRectangle($blue, 20 * $s, 26 * $s, 60 * $s, 50 * $s)
  $g.DrawRectangle($dark, 20 * $s, 26 * $s, 60 * $s, 50 * $s)
  $g.FillRectangle($face, 27 * $s, 34 * $s, 46 * $s, 32 * $s)
  $g.FillEllipse($ink, 35 * $s, 43 * $s, 10 * $s, 10 * $s)
  $g.FillEllipse($ink, 55 * $s, 43 * $s, 10 * $s, 10 * $s)
  $smile = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(29, 36, 51)), (3 * $s)
  $g.DrawArc($smile, 40 * $s, 50 * $s, 20 * $s, 10 * $s, 20, 140)
  $g.FillRectangle($blue, 32 * $s, 76 * $s, 36 * $s, 14 * $s)
  $g.FillEllipse($gold, 46 * $s, 79 * $s, 8 * $s, 8 * $s)
  $bmp.Save((Join-Path $root "icons\icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Write-Output 'icons done'
