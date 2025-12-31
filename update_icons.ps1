Add-Type -AssemblyName System.Drawing
$sourcePath = "C:\Users\Administrator\.gemini\antigravity\brain\5bf60637-c6a2-408e-8531-a1e35220ff10\doc_oclock_app_icon_blue_1767107342938.png"
$resPath = "c:\Users\Administrator\Desktop\Dococlock\healthconnect-ride-07\android\app\src\main\res"

function Resize-Image {
    param($source, $dest, $width, $height)
    Write-Host "Resizing to $width x $height -> $dest"
    $bmp = New-Object System.Drawing.Bitmap($source)
    $newBmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($newBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($bmp, 0, 0, $width, $height)
    $newBmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $newBmp.Dispose()
    $bmp.Dispose()
}

# Mipmap sizes
$sizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($folder in $sizes.Keys) {
    $size = $sizes[$folder]
    $targetDir = Join-Path $resPath $folder
    if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir | Out-Null }
    Resize-Image $sourcePath (Join-Path $targetDir "ic_launcher.png") $size $size
    Resize-Image $sourcePath (Join-Path $targetDir "ic_launcher_round.png") $size $size
}

# Also update drawable foreground for adaptive icons
Resize-Image $sourcePath (Join-Path $resPath "drawable\ic_launcher_foreground.png") 432 432
Resize-Image $sourcePath (Join-Path $resPath "drawable-v24\ic_launcher_foreground.png") 432 432

Write-Host "Icon replacement complete!"
