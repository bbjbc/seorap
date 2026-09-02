# 서랍 (Seorap) 설치 스크립트. Windows PowerShell 5.1 이상.
#   irm https://raw.githubusercontent.com/bbjbc/seorap/main/install.ps1 | iex
# 최신 릴리즈의 Seorap-Setup-*.exe 를 내려받아 조용히 설치한 뒤 실행합니다.
# 관리자 권한은 필요하지 않습니다 (사용자 폴더에 설치).

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repo = 'bbjbc/seorap'
$api = "https://api.github.com/repos/$repo/releases/latest"

Write-Host "→ 최신 릴리즈 확인 중..." -ForegroundColor DarkGray
$release = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'seorap-install' }
$asset = $release.assets | Where-Object { $_.name -like 'Seorap-Setup-*.exe' } | Select-Object -First 1
if (-not $asset) { throw "설치 파일을 찾지 못했습니다. https://github.com/$repo/releases 에서 직접 내려받아 주세요." }

$sizeMB = [math]::Round($asset.size / 1MB)
Write-Host "→ $($release.tag_name) · $($asset.name) ($sizeMB MB) 내려받는 중..." -ForegroundColor DarkGray
$tmp = Join-Path $env:TEMP $asset.name
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp -UseBasicParsing

# SHA256SUMS.txt 가 있으면 검증한다.
$sums = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS.txt' } | Select-Object -First 1
if ($sums) {
  $expected = ((Invoke-WebRequest -Uri $sums.browser_download_url -UseBasicParsing).Content -split "`n" |
    Where-Object { $_ -match [regex]::Escape($asset.name) } | Select-Object -First 1) -split '\s+' | Select-Object -First 1
  $actual = (Get-FileHash -Path $tmp -Algorithm SHA256).Hash.ToLower()
  if ($expected -and $actual -ne $expected.ToLower()) { Remove-Item $tmp -Force; throw "체크섬이 일치하지 않습니다. 설치를 중단합니다." }
  Write-Host "✓ SHA256 확인" -ForegroundColor Green
}

Write-Host "→ 설치 중 (조용히)..." -ForegroundColor DarkGray
# 내려받은 파일의 '인터넷에서 온 파일' 표시를 지워 SmartScreen 대화상자 없이 조용히 설치되게 한다.
Unblock-File -Path $tmp -ErrorAction SilentlyContinue
$proc = Start-Process -FilePath $tmp -ArgumentList '/S' -PassThru -Wait
if ($proc.ExitCode -ne 0) { throw "설치 프로그램이 종료 코드 $($proc.ExitCode) 로 끝났습니다." }
Remove-Item $tmp -Force -ErrorAction SilentlyContinue

$exe = Join-Path $env:LOCALAPPDATA 'Programs\Seorap\Seorap.exe'
if (-not (Test-Path $exe)) { throw "설치는 끝났지만 실행 파일을 찾지 못했습니다: $exe" }
Write-Host "✓ 설치 완료: $exe" -ForegroundColor Green
Start-Process -FilePath $exe
Write-Host "  서랍이 트레이에 떠 있습니다. Ctrl+Alt+V 로 아무거나 넣어 보세요." -ForegroundColor DarkGray
