$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$signingDir = Join-Path $env:LOCALAPPDATA 'WeatherRadar\signing'
$credentialsPath = Join-Path $signingDir 'release-credentials.json'
$keystorePath = Join-Path $signingDir 'weather-radar-release.jks'

if (-not (Test-Path -LiteralPath $signingDir)) {
  New-Item -ItemType Directory -Path $signingDir | Out-Null
}

if (Test-Path -LiteralPath $credentialsPath) {
  $credentials = Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json
  if (-not (Test-Path -LiteralPath $keystorePath)) {
    throw 'Release credentials exist but the keystore is missing. Restore the signing backup before building.'
  }
} else {
  if (Test-Path -LiteralPath $keystorePath) {
    throw 'Release keystore exists without credentials. Restore the matching backup before building.'
  }
  $keytool = (Get-Command keytool.exe -ErrorAction SilentlyContinue).Source
  if (-not $keytool -and $env:JAVA_HOME) { $keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe' }
  if (-not $keytool -or -not (Test-Path -LiteralPath $keytool)) { throw 'keytool.exe is required. Set JAVA_HOME to JDK 17.' }
  $bytes = New-Object byte[] 36
  $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $random.GetBytes($bytes) } finally { $random.Dispose() }
  $password = [Convert]::ToBase64String($bytes)
  $alias = 'weather-radar-personal'
  & $keytool -genkeypair -noprompt -keystore $keystorePath -alias $alias -keyalg RSA -keysize 3072 -validity 10000 -storepass $password -keypass $password -dname 'CN=Weather Radar Personal, O=Personal Use, C=PL'
  if ($LASTEXITCODE -ne 0) { throw 'Could not create the Android release signing key.' }
  $credentials = @{ alias = $alias; password = $password }
  $credentials | ConvertTo-Json | Set-Content -LiteralPath $credentialsPath -Encoding UTF8
  Write-Host "Created local release signing files in $signingDir. Back up this entire folder privately."
}

$env:WR_RELEASE_STORE_FILE = $keystorePath
$env:WR_RELEASE_STORE_PASSWORD = $credentials.password
$env:WR_RELEASE_KEY_ALIAS = $credentials.alias
$env:WR_RELEASE_KEY_PASSWORD = $credentials.password
try {
  Push-Location $projectRoot
  try {
    & npx.cmd expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }
    Push-Location (Join-Path $projectRoot 'android')
    try {
      & .\gradlew.bat app:assembleRelease --no-daemon
      if ($LASTEXITCODE -ne 0) { throw 'Android release build failed.' }
    } finally { Pop-Location }
    $apk = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path -LiteralPath $apk)) { throw 'Gradle succeeded but the release APK was not found.' }
    $artifacts = Join-Path $projectRoot 'artifacts'
    if (-not (Test-Path -LiteralPath $artifacts)) { New-Item -ItemType Directory -Path $artifacts | Out-Null }
    $output = Join-Path $artifacts 'weather-radar-release.apk'
    Copy-Item -LiteralPath $apk -Destination $output -Force
    Write-Host "Installable release APK: $output"
  } finally { Pop-Location }
} finally {
  Remove-Item Env:WR_RELEASE_STORE_FILE, Env:WR_RELEASE_STORE_PASSWORD, Env:WR_RELEASE_KEY_ALIAS, Env:WR_RELEASE_KEY_PASSWORD -ErrorAction SilentlyContinue
}
