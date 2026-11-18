# Resizes one image with Windows' built-in imaging (no extra libraries), keeping aspect ratio.
# usage: powershell -NoProfile -File resize.ps1 <in> <out> <maxSide> <jpegQuality>
param([string]$In, [string]$Out, [int]$Max, [int]$Quality = 86)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile($In)
try {
  $scale = [Math]::Min(1.0, $Max / [Math]::Max($src.Width, $src.Height))
  $w = [int][Math]::Round($src.Width * $scale); $h = [int][Math]::Round($src.Height * $scale)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($src, 0, 0, $w, $h)
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Quality)
  $bmp.Save($Out, $codec, $ep)
  $g.Dispose(); $bmp.Dispose()
} finally { $src.Dispose() }
"$w x $h"
