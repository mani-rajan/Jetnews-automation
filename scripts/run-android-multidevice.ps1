param(
    [string]$AvdName1 = $env:ANDROID_AVD_1,
    [string]$AvdName2 = $env:ANDROID_AVD_2,
    [int]$BootTimeoutSec = 240,
    [switch]$SkipStart,
    [switch]$SkipRun,
    [switch]$Cleanup
)

$ErrorActionPreference = 'Stop'

function Resolve-SdkRoot {
    if ($env:ANDROID_SDK_ROOT) { return $env:ANDROID_SDK_ROOT }
    if ($env:ANDROID_HOME) { return $env:ANDROID_HOME }
    throw 'ANDROID_SDK_ROOT (or ANDROID_HOME) is not set.'
}

function Get-AdbPath {
    if ($env:ADB_PATH -and (Test-Path $env:ADB_PATH)) { return $env:ADB_PATH }
    $sdkRoot = Resolve-SdkRoot
    $adb = Join-Path $sdkRoot 'platform-tools\adb.exe'
    if (-not (Test-Path $adb)) {
        throw "adb.exe not found at $adb"
    }
    return $adb
}

function Get-EmulatorPath {
    $sdkRoot = Resolve-SdkRoot
    $emulator = Join-Path $sdkRoot 'emulator\emulator.exe'
    if (-not (Test-Path $emulator)) {
        throw "emulator.exe not found at $emulator"
    }
    return $emulator
}

function Get-ConnectedDevices([string]$AdbPath) {
    $lines = & $AdbPath devices
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to run adb devices.'
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
        [string]$AdbPath,
        [string]$Udid,
        [string]$AppPackage
    )

    if (-not $Udid) {
        return
    }

    try {
        & $AdbPath -s $Udid shell am force-stop $AppPackage | Out-Null
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

function Wait-ForAdditionalDevices {
    param(
        [string]$AdbPath,
        [string[]]$Baseline,
        [int]$ExpectedCount,
        [int]$TimeoutSec
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    do {
        Start-Sleep -Seconds 3
        $connected = Get-ConnectedDevices -AdbPath $AdbPath
        $newOnes = $connected | Where-Object { $Baseline -notcontains $_ }
        if ($newOnes.Count -ge $ExpectedCount) {
            return $newOnes
        }
    } while ((Get-Date) -lt $deadline)

    throw "Timed out waiting for $ExpectedCount newly connected emulator(s)."
}

$adbPath = Get-AdbPath
$appPackage = Get-AndroidAppPackage
$baselineDevices = Get-ConnectedDevices -AdbPath $adbPath
$newDevices = @()
$startedProcesses = @()
$udid1 = $null
$udid2 = $null

try {
    if (-not $SkipStart) {
        if (-not $AvdName1 -or -not $AvdName2) {
            throw 'Please pass -AvdName1 and -AvdName2, or set ANDROID_AVD_1 and ANDROID_AVD_2.'
        }

        $emulatorPath = Get-EmulatorPath
        Write-Host "Starting AVDs: $AvdName1, $AvdName2"
        $startedProcesses += Start-Process -FilePath $emulatorPath -ArgumentList "-avd $AvdName1" -PassThru
        Start-Sleep -Seconds 2
        $startedProcesses += Start-Process -FilePath $emulatorPath -ArgumentList "-avd $AvdName2" -PassThru

        $newDevices = Wait-ForAdditionalDevices -AdbPath $adbPath -Baseline $baselineDevices -ExpectedCount 2 -TimeoutSec $BootTimeoutSec
    } else {
        $connectedNow = Get-ConnectedDevices -AdbPath $adbPath
        if ($connectedNow.Count -lt 2) {
            throw "SkipStart was used, but only $($connectedNow.Count) device(s) are connected."
        }
        $newDevices = $connectedNow | Select-Object -First 2
    }

    $udid1 = $newDevices[0]
    $udid2 = $newDevices[1]

    Write-Host "Using devices: $udid1 and $udid2"

    $env:MULTI_DEVICE = 'true'
    $env:MAX_INSTANCES = '2'
    $env:ANDROID_UDID_1 = $udid1
    $env:ANDROID_DEVICE_1 = $udid1
    $env:ANDROID_UDID_2 = $udid2
    $env:ANDROID_DEVICE_2 = $udid2

    if (-not $SkipRun) {
        & npx wdio run config/wdio.android.conf.ts
        if ($LASTEXITCODE -ne 0) {
            throw "WDIO run failed with exit code $LASTEXITCODE"
        }
    }
}
finally {
    Force-Stop-App -AdbPath $adbPath -Udid $udid1 -AppPackage $appPackage
    Force-Stop-App -AdbPath $adbPath -Udid $udid2 -AppPackage $appPackage

    if ($Cleanup -and $startedProcesses.Count -gt 0) {
        foreach ($proc in $startedProcesses) {
            if ($proc -and -not $proc.HasExited) {
                try {
                    Stop-Process -Id $proc.Id -Force
                }
                catch {
                    Write-Warning "Could not stop emulator process $($proc.Id): $($_.Exception.Message)"
                }
            }
        }
    }
}

