Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path (Get-Location) "Logo Videm.png"
$destDir = Join-Path (Get-Location) "assets\icons"

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir | Out-Null
}

$src = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($size, $filename) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    $outPath = Join-Path $destDir $filename
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Created: $filename"
}

function Create-Maskable($size, $filename) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#06080D'))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    $bgBrush.Dispose()
    $margin = [int]($size * 0.1)
    $innerSize = $size - (2 * $margin)
    $g.DrawImage($src, $margin, $margin, $innerSize, $innerSize)
    $g.Dispose()
    $outPath = Join-Path $destDir $filename
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Created Maskable: $filename"
}

Resize-Image 192 "icon-192.png"
Resize-Image 512 "icon-512.png"
Resize-Image 180 "apple-touch-icon.png"
Create-Maskable 512 "icon-maskable-512.png"

$src.Dispose()
Write-Output "All icons generated successfully!"
