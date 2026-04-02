# Automation Execution Guide

This document explains how to execute the mobile automation suite in this project using the commands and configuration currently present in the repository.

## 1. What this project uses

- WebdriverIO
- Appium
- Cucumber
- Android emulator(s) or connected Android device(s)
- PowerShell commands on Windows

## 2. Prerequisites

Before execution, make sure the following are available:

- Node.js installed
- `npm install` already executed in the project root
- Java installed
- Android SDK installed
- Android SDK paths available through one of these environment variables:
  - `ANDROID_SDK_ROOT`
  - `ANDROID_HOME`
- `adb` available either on PATH or inside the SDK under `platform-tools`
- At least one Android emulator or Android device available for single-device execution

Install project dependencies:

```powershell
cd D:\mobile-automation
npm install
```

## 3. Do you need to start Appium manually?

Based on `config/wdio.shared.conf.ts`, this project uses the WebdriverIO Appium service:

- Appium is started automatically by the test run
- Default Appium port is `4723`
- For the two-emulator parallel script, separate worker processes set different Appium ports

So for the standard project commands below, **you do not need to start Appium manually first**.

Manual Appium startup is only useful if you intentionally want to run against an already running external Appium server and adjust the configuration for that purpose.

## 4. Do simulators / emulators need to be active before execution?

### Single-device run
For these commands, at least one Android device/emulator should already be visible in `adb devices`:

```powershell
npm run bdd:android
npm run bdd:android:run
npm run bdd:android:parallel
npm run bdd:android:report
```

Recommended quick check:

```powershell
adb devices
```

### Multi-device run
For these commands, two devices/emulators are expected:

```powershell
npm run bdd:android:multidevice
npm run bdd:android:two-emulators
npm run bdd:android:two-emulators:report
npm run bdd:android:multidevice:report
```

### One-shot multi-device launcher
This script can start the emulators for you, wait for them, then run WDIO:

```powershell
npm run bdd:android:multidevice:oneshot
```

For that command, configure the AVD names first:

```powershell
$env:ANDROID_SDK_ROOT='D:\sdk'
$env:ANDROID_AVD_1='Pixel_4_API_30'
$env:ANDROID_AVD_2='Pixel_5_API_30'
npm run bdd:android:multidevice:oneshot
```

## 5. Recommended pre-run checks

Before running the suite, verify:

### Check connected devices
```powershell
adb devices
```

### Check installed dependencies
```powershell
cd D:\mobile-automation
npm install
```

### Optional: verify the APK exists
```powershell
Test-Path D:\mobile-automation\apps\jetnews-assessment-debug.apk
```

## 6. Execution commands

## 6.1 Single-device execution

### Run tests and auto-generate Cucumber HTML report
```powershell
cd D:\mobile-automation
npm run bdd:android
```

What this does in the current project:
- Runs Android WDIO tests
- Generates Cucumber JSON
- Generates Cucumber HTML report after the test run

### Run tests only (no HTML generation wrapper)
```powershell
cd D:\mobile-automation
npm run bdd:android:run
```

### Run tests and then explicitly generate Cucumber report
```powershell
cd D:\mobile-automation
npm run bdd:android:report
```

## 6.2 Same-device parallel execution

This uses `MAX_INSTANCES=2` with the Android WDIO config.

```powershell
cd D:\mobile-automation
npm run bdd:android:parallel
```

Generate report after that run:

```powershell
cd D:\mobile-automation
npm run bdd:android:parallel:report
```

## 6.3 Two-emulator execution

This expects two connected emulators. By default the script uses:
- `emulator-5554`
- `emulator-5556`

Behavior in this project:
- scenarios are automatically sharded across worker 1 and worker 2
- each worker writes its own JSON output (`reports/cucumber-json/worker-1`, `reports/cucumber-json/worker-2`)
- Cucumber HTML generation merges both worker outputs and keeps device metadata
- after execution, the JetNews app is automatically closed on both emulators

Run:

```powershell
cd D:\mobile-automation
npm run bdd:android:two-emulators
```

Run and generate Cucumber HTML report:

```powershell
cd D:\mobile-automation
npm run bdd:android:two-emulators:report
```

This script writes worker logs to:
- `logs/wdio-worker-1.out.log`
- `logs/wdio-worker-1.err.log`
- `logs/wdio-worker-2.out.log`
- `logs/wdio-worker-2.err.log`

## 6.4 Multi-device execution using adb discovery

This command uses the Android WDIO config to discover connected devices through `adb devices`.

Behavior in this project:
- this keeps the existing WDIO multi-capability execution model
- use this mode when you want current multi-device behavior retained
- after execution, the JetNews app is automatically closed on the participating devices

```powershell
cd D:\mobile-automation
npm run bdd:android:multidevice
```

Run and generate report:

```powershell
cd D:\mobile-automation
npm run bdd:android:multidevice:report
```

## 6.5 One-shot emulator startup + execution

This PowerShell launcher can:
- start 2 AVDs
- wait until both appear in adb
- assign them to the run
- execute WDIO
- close the JetNews app on both devices after the run finishes

```powershell
cd D:\mobile-automation
$env:ANDROID_SDK_ROOT='D:\sdk'
$env:ANDROID_AVD_1='Pixel_4_API_30'
$env:ANDROID_AVD_2='Pixel_5_API_30'
npm run bdd:android:multidevice:oneshot
```

Optional direct script flags:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-android-multidevice.ps1 -SkipStart
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-android-multidevice.ps1 -SkipRun
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-android-multidevice.ps1 -Cleanup
```

## 7. Reports

## 7.1 Cucumber JSON output
Generated under:

- `reports/cucumber-json/`

## 7.2 Cucumber HTML report
Generated under:

- `reports/cucumber-html/`
- main file: `reports/cucumber-html/index.html`

Generate report from existing JSON only:

```powershell
cd D:\mobile-automation
npm run report:cucumber
```

Open the HTML report:

```powershell
start D:\mobile-automation\reports\cucumber-html\index.html
```

## 7.3 Allure report
Allure raw results:

- `allure-results/`

Generate Allure HTML:

```powershell
cd D:\mobile-automation
npm run report:allure
```

Open Allure report:

```powershell
cd D:\mobile-automation
npm run report:allure:open
```

Run test execution and then generate Allure:

```powershell
cd D:\mobile-automation
npm run bdd:android:report:allure
```

## 8. Screenshots on failures

Based on the current project setup:

- Failed scenarios save PNG screenshots into `screenshots/`
- Failed steps are also attached to Cucumber JSON for HTML report rendering

If a scenario fails, check:

- `screenshots/`
- `reports/cucumber-html/index.html`

## 9. Execution notes

### Report cleanup behavior
Before each run, the current configuration removes stale:
- `reports/cucumber-json/`
- `allure-results/`

This helps ensure reports reflect the current run.

### Device discovery behavior
The Android config checks connected devices using `adb devices`.

If multi-device execution is requested and some devices are not connected:
- disconnected devices may be skipped
- strict mode can fail the run when `REQUIRE_ALL_DEVICES=true`

## 10. Common environment variables

```powershell
$env:ANDROID_SDK_ROOT='D:\sdk'
$env:ANDROID_DEVICE_1='emulator-5554'
$env:ANDROID_DEVICE_2='emulator-5556'
$env:MAX_INSTANCES='2'
$env:MULTI_DEVICE='true'
$env:REQUIRE_ALL_DEVICES='true'
$env:USE_INSTALLED_APP='true'
$env:TAGS='@like or @shared'
```

## 11. Quick-start examples

### Example A: run on one emulator and generate HTML automatically
```powershell
cd D:\mobile-automation
adb devices
npm run bdd:android
```

### Example B: run on two already-running emulators and generate Cucumber HTML
```powershell
cd D:\mobile-automation
adb devices
npm run bdd:android:two-emulators:report
```

### Example C: start two AVDs and run automatically
```powershell
cd D:\mobile-automation
$env:ANDROID_SDK_ROOT='D:\sdk'
$env:ANDROID_AVD_1='Pixel_4_API_30'
$env:ANDROID_AVD_2='Pixel_5_API_30'
npm run bdd:android:multidevice:oneshot
```

## 12. If execution fails

Check the following in order:

1. `adb devices` shows the expected emulator(s)/device(s)
2. `ANDROID_SDK_ROOT` or `ANDROID_HOME` is set correctly
3. The APK exists at `apps/jetnews-assessment-debug.apk`
4. `npm install` completed successfully
5. Worker logs under `logs/` for two-emulator runs
6. Appium startup messages in WDIO console output

## 13. Useful file references

- Android runner: `config/wdio.android.conf.ts`
- Shared WDIO/Cucumber/Appium config: `config/wdio.shared.conf.ts`
- Android one-shot launcher: `scripts/run-android-multidevice.ps1`
- Android two-emulator runner: `scripts/run-android-two-emulators.ps1`
- Android run + report wrapper: `scripts/run-android-and-report.js`
- Cucumber HTML generator: `scripts/generate-cucumber-report.js`

