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
$cucumberRoot = Join-Path $repoRoot 'reports\cucumber-json'
$allureRoot = Join-Path $repoRoot 'allure-results'
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}
foreach ($dir in @($cucumberRoot, $allureRoot)) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $dir | Out-Null
}

function Get-CucumberShards([string]$RepoRootPath) {
    $shardScript = Join-Path $RepoRootPath 'scripts\build-cucumber-shards.js'
    if (-not (Test-Path $shardScript)) {
        throw "Sharding helper not found at $shardScript"
    }

    $json = & node $shardScript
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to build cucumber shards.'
    }

    return $json | ConvertFrom-Json
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

function Get-AndroidAppPackage {
    if ($env:ANDROID_APP_PACKAGE) {
        return $env:ANDROID_APP_PACKAGE
    }

    return 'com.example.jetnews'
}

function Force-Stop-App {
    param(
        [string]$Udid,
        [string]$AppPackage
    )

    if (-not $Udid) {
        return
    }

    try {
        & adb -s $Udid shell am force-stop $AppPackage | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Closed app $AppPackage on $Udid"
        }
        else {
            Write-Warning "Could not close app $AppPackage on $Udid (exit code $LASTEXITCODE)."
        }
    }
    catch {
        Write-Warning "Could not close app ${AppPackage} on ${Udid}: $($_.Exception.Message)"
    }
}

$connected = Get-ConnectedDevices
$appPackage = Get-AndroidAppPackage
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
        [string]$Logs,
        [string]$CucumberDir,
        [string]$AllureDir,
        [string]$ScenarioNameRegex,
        [string]$ExitCodeFile
    )

    $stdout = Join-Path $Logs "wdio-worker-$WorkerIndex.out.log"
    $stderr = Join-Path $Logs "wdio-worker-$WorkerIndex.err.log"
    $safeScenarioRegex = if ($ScenarioNameRegex) { $ScenarioNameRegex.Replace("'", "''") } else { '' }
    $safeTags = if ($TagExpression) { $TagExpression.Replace("'", "''") } else { '' }

    $command = @"
`$env:APPIUM_PORT='$AppiumPort'
`$env:MULTI_DEVICE='false'
`$env:MAX_INSTANCES='1'
`$env:REQUIRE_ALL_DEVICES='false'
`$env:USE_INSTALLED_APP='$UseInstalledAppOnly'
`$env:CLOSE_APP_ON_COMPLETE='true'
`$env:ANDROID_UDID_1='$Udid'
`$env:ANDROID_DEVICE_1='$Udid'
`$env:DEVICE_NAME='$Udid'
`$env:PLATFORM_NAME='Android'
`$env:ANDROID_SYSTEM_PORT_1='$SystemPort'
`$env:ANDROID_MJPEG_PORT_1='$MjpegPort'
`$env:ANDROID_CHROMEDRIVER_PORT_1='$ChromedriverPort'
`$env:CUCUMBER_JSON_DIR='$CucumberDir'
`$env:ALLURE_RESULTS_DIR='$AllureDir'
 if ('$safeScenarioRegex') { `$env:CUCUMBER_NAME='$safeScenarioRegex' }
 if ('$safeTags') { `$env:TAGS='$safeTags' }
Set-Location '$RepoPath'
npx wdio run config/wdio.android.conf.ts
`$code = `$LASTEXITCODE
Set-Content -Path '$ExitCodeFile' -Value `$code -Encoding ascii
exit `$code
"@

    Start-Process -FilePath 'powershell' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command) -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
}

$worker1 = $null
$worker2 = $null

try {
    Write-Host "Starting parallel WDIO runs on ${Udid1}:${AppiumPort1} and ${Udid2}:${AppiumPort2}"

    $shards = Get-CucumberShards -RepoRootPath $repoRoot
    Write-Host "Sharding scenarios across workers. Total scenarios: $($shards.totalScenarios)"
    Write-Host "Worker 1 scenarios: $($shards.worker1.Count)"
    Write-Host "Worker 2 scenarios: $($shards.worker2.Count)"

    $worker1JsonDir = Join-Path $cucumberRoot 'worker-1'
    $worker2JsonDir = Join-Path $cucumberRoot 'worker-2'
    $worker1AllureDir = Join-Path $allureRoot 'worker-1'
    $worker2AllureDir = Join-Path $allureRoot 'worker-2'
    $worker1ExitFile = Join-Path $logDir 'wdio-worker-1.exitcode'
    $worker2ExitFile = Join-Path $logDir 'wdio-worker-2.exitcode'
    foreach ($f in @($worker1ExitFile, $worker2ExitFile)) {
        if (Test-Path $f) { Remove-Item -Path $f -Force }
    }

    $worker1 = Start-WdioWorker -WorkerIndex 1 -Udid $Udid1 -AppiumPort $AppiumPort1 -SystemPort 8200 -MjpegPort 7810 -ChromedriverPort 9515 -TagExpression $Tags -RepoPath $repoRoot -UseInstalledAppOnly $useInstalledApp -Logs $logDir -CucumberDir $worker1JsonDir -AllureDir $worker1AllureDir -ScenarioNameRegex $shards.worker1Regex -ExitCodeFile $worker1ExitFile

    if ($shards.worker2Regex) {
        $worker2 = Start-WdioWorker -WorkerIndex 2 -Udid $Udid2 -AppiumPort $AppiumPort2 -SystemPort 8201 -MjpegPort 7811 -ChromedriverPort 9516 -TagExpression $Tags -RepoPath $repoRoot -UseInstalledAppOnly $useInstalledApp -Logs $logDir -CucumberDir $worker2JsonDir -AllureDir $worker2AllureDir -ScenarioNameRegex $shards.worker2Regex -ExitCodeFile $worker2ExitFile
    }
    else {
        Write-Warning 'No shard assigned to worker 2 (not enough scenarios to split).'
    }

    $waitIds = @($worker1.Id)
    if ($worker2) { $waitIds += $worker2.Id }
    $null = Wait-Process -Id $waitIds

    $exit1 = if (Test-Path $worker1ExitFile) { [int](Get-Content -Path $worker1ExitFile -Raw).Trim() } else { 1 }
    $exit2 = if ($worker2) {
        if (Test-Path $worker2ExitFile) { [int](Get-Content -Path $worker2ExitFile -Raw).Trim() } else { 1 }
    } else { 0 }

    Write-Host "Worker 1 exit code: $exit1"
    Write-Host "Worker 2 exit code: $exit2"
    Write-Host "Logs: $logDir"

    if ($exit1 -ne 0 -or $exit2 -ne 0) {
        throw "At least one worker failed. Check log files under $logDir"
    }
}
finally {
    Force-Stop-App -Udid $Udid1 -AppPackage $appPackage
    Force-Stop-App -Udid $Udid2 -AppPackage $appPackage
}
