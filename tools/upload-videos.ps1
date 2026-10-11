# Uploads the phone-size wedding videos to the GitHub release "videos" so the GitHub Pages site can play them.
# Each file must be under 2 GB (GitHub's limit for release files).
$ErrorActionPreference = "Stop"
$gh = "C:\Program Files\GitHub CLI\gh.exe"
$repo = "yogeshwardev/DIGITAL-Album"
$media = Join-Path $PSScriptRoot "..\media"
$files = @("disc1-web.mp4", "disc2-web.mp4") | ForEach-Object { Join-Path $media $_ }

foreach ($f in $files) {
    if (-not (Test-Path $f)) { throw "Missing $f" }
    if ((Get-Item $f).Length -ge 2GB) { throw "$f is over 2 GB" }
}

& $gh release view videos --repo $repo *> $null
if ($LASTEXITCODE -ne 0) {
    & $gh release create videos --repo $repo --title "Wedding videos" --notes "Phone-size videos streamed by the website (Part 1 and Part 2)."
}
foreach ($f in $files) {
    Write-Host "Uploading $(Split-Path $f -Leaf) ..."
    & $gh release upload videos $f --repo $repo --clobber
    if ($LASTEXITCODE -ne 0) { throw "Upload failed: $f" }
}
Write-Host "All videos uploaded."
