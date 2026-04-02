param(
    [string]$Udid1 = $env:ANDROID_UDID_1,
    [string]$Udid2 = $env:ANDROID_UDID_2,
    [int]$AppiumPort1 = 4723,
    [int]$AppiumPort2 = 4725,
    [string]$Tags = $env:TAGS,
    [switch]$UseAppBinary
)

$ErrorActionPreference = 'Stop'

if (-not $Udid1) { $Udid1 = 'emulator-5554' }
if (-not $Udid2) { $Udid2 = 'emulator-5556' }

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot 'logs'
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Get-ConnectedDevices {
    $lines = & adb devices
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to execute adb devices.'
    }

    return $lines |
        Select-Object -Skip 1 |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ -match "`tdevice$" } |
        ForEach-Object { ($_ -split "`t")[0] }
}

$connected = Get-ConnectedDevices
$required = @($Udid1, $Udid2)
$missing = $required | Where-Object { $connected -notcontains $_ }
if ($missing.Count -gt 0) {
    throw "Missing required emulator(s): $($missing -join ', '). Connected: $($connected -join ', ')"
}

$useInstalledApp = if ($UseAppBinary.IsPresent) { 'false' } else { 'true' }

function Start-WdioWorker {
    param(
        [int]$WorkerIndex,
        [string]$Udid,
        [int]$AppiumPort,
        [int]$SystemPort,
        [int]$MjpegPort,
        [int]$ChromedriverPort,
        [string]$TagExpression,
        [string]$RepoPath,
        [string]$UseInstalledAppOnly,
        [string]$Logs
    )

    $stdout = Join-Path $Logs "wdio-worker-$WorkerIndex.out.log"
    $stderr = Join-Path $Logs "wdio-worker-$WorkerIndex.err.log"

    $command = @"
`$env:APPIUM_PORT='$AppiumPort'
`$env:MULTI_DEVICE='false'
`$env:MAX_INSTANCES='1'
`$env:REQUIRE_ALL_DEVICES='false'
`$env:USE_INSTALLED_APP='$UseInstalledAppOnly'
`$env:ANDROID_UDID_1='$Udid'
`$env:ANDROID_DEVICE_1='$Udid'
`$env:ANDROID_SYSTEM_PORT_1='$SystemPort'
`$env:ANDROID_MJPEG_PORT_1='$MjpegPort'
`$env:ANDROID_CHROMEDRIVER_PORT_1='$ChromedriverPort'
if ('$TagExpression') { `$env:TAGS='$TagExpression' }
Set-Location '$RepoPath'
npx wdio run config/wdio.android.conf.ts
exit `$LASTEXITCODE
"@

    Start-Process -FilePath 'powershell' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command) -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
}

Write-Host "Starting parallel WDIO runs on ${Udid1}:${AppiumPort1} and ${Udid2}:${AppiumPort2}"

$worker1 = Start-WdioWorker -WorkerIndex 1 -Udid $Udid1 -AppiumPort $AppiumPort1 -SystemPort 8200 -MjpegPort 7810 -ChromedriverPort 9515 -TagExpression $Tags -RepoPath $repoRoot -UseInstalledAppOnly $useInstalledApp -Logs $logDir
$worker2 = Start-WdioWorker -WorkerIndex 2 -Udid $Udid2 -AppiumPort $AppiumPort2 -SystemPort 8201 -MjpegPort 7811 -ChromedriverPort 9516 -TagExpression $Tags -RepoPath $repoRoot -UseInstalledAppOnly $useInstalledApp -Logs $logDir

$null = Wait-Process -Id $worker1.Id, $worker2.Id

$worker1.Refresh()
$worker2.Refresh()
$exit1 = $worker1.ExitCode
$exit2 = $worker2.ExitCode

Write-Host "Worker 1 exit code: $exit1"
Write-Host "Worker 2 exit code: $exit2"
Write-Host "Logs: $logDir"

if ($exit1 -ne 0 -or $exit2 -ne 0) {
    throw "At least one worker failed. Check log files under $logDir"
}
