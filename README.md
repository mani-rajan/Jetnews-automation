# Mobile Automation (WDIO + Appium + Cucumber)

## Prerequisites

- Node.js ≥ 18
- Android SDK with `adb` and `emulator` on PATH (or set `ANDROID_SDK_ROOT`)
- Appium 3.x is started automatically by WDIO; no manual `appium` launch needed
- Java 11+ (required by Appium / UiAutomator2)

## Install

```powershell
npm install
```

## Run tests

```powershell
# Single device (default emulator-5554)
npm run bdd:android

# 2 parallel workers on same device
npm run bdd:android:parallel

# 2 devices, discovered automatically via adb
npm run bdd:android:multidevice

# One-shot: launch 2 AVDs → wait for adb → run tests
npm run bdd:android:multidevice:oneshot
```

## Reports

### Cucumber HTML

Run tests **and** generate report in one command:

```powershell
npm run bdd:android:report
npm run bdd:android:two-emulators:report
npm run bdd:android:multidevice:report
```

Generate Cucumber HTML from the latest JSON files only:

```powershell
npm run report:cucumber
# → reports/cucumber-html/index.html
```

### Allure

Run tests **and** generate Allure report:

```powershell
npm run bdd:android:report:allure
```

Generate Allure HTML from existing `allure-results/` only:

```powershell
npm run report:allure        # → reports/allure-html/
npm run report:allure:open   # generate + open in browser
```

## Multi-device (one-shot launcher)

```powershell
$env:ANDROID_SDK_ROOT='D:\sdk'
$env:ANDROID_AVD_1='Pixel_4_API_30'
$env:ANDROID_AVD_2='Pixel_5_API_30'
npm run bdd:android:multidevice:oneshot
```

Optional flags passed directly to the script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-android-multidevice.ps1 -SkipStart
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-android-multidevice.ps1 -SkipRun
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-android-multidevice.ps1 -Cleanup
```

## Two-emulator parallel runner

```powershell
# Uses emulator-5554 and emulator-5556 by default
npm run bdd:android:two-emulators

# Run + generate Cucumber HTML report
npm run bdd:android:two-emulators:report
```

Both workers write independent logs to `logs/wdio-worker-{1,2}.{out,err}.log`.

## iOS (future-ready)

```powershell
npm run bdd:ios
npm run bdd:ios:multidevice
```

Set `APP_PATH_IOS` to point to a `.app` or `.ipa` bundle when installing fresh.

## Project layout

```
config/
  wdio.shared.conf.ts      # reporters, hooks, cucumber options
  wdio.android.conf.ts     # Android caps + adb device discovery
  wdio.ios.conf.ts         # iOS caps
  devices.android.ts       # capability definitions for up to 2 Android devices
  devices.ios.ts           # capability definitions for up to 2 iOS devices
features/
  news.feature             # BDD scenarios
  step-definitions/
    news.steps.ts          # step implementations
pages/
  home.page.ts             # JetNews home screen POM
  article.page.ts          # JetNews article screen POM
scripts/
  generate-cucumber-report.js     # Cucumber HTML report generator
  run-android-multidevice.ps1     # one-shot AVD launcher + WDIO runner
  run-android-two-emulators.ps1   # parallel two-emulator runner
```

## Feature file tags

| Tag | Meaning |
|-----|---------|
| `@android` | runs on Android |
| `@ios` | runs on iOS |
| `@skip` | excluded by default |
| `@known-issue` | documents a known app defect; assertions are inverted |
| `@like` | like-button scenarios |
| `@shared` | share-button scenarios |
| `@bookmark` | bookmark-button scenarios |
| `@story-navigation` | story navigation outline scenarios |

Filter by tag at runtime:

```powershell
$env:TAGS='@like or @shared'
npm run bdd:android
```

## Notes

- Failed scenarios automatically save screenshots to `screenshots/`.
- Cucumber JSON → `reports/cucumber-json/` → HTML → `reports/cucumber-html/`.
- Allure raw results → `allure-results/` → HTML → `reports/allure-html/`.
- For manual Appium Inspector sessions use activity `com.example.jetnews.ui.MainActivity`.
- Optional env vars:

| Variable | Default | Description |
|----------|---------|-------------|
| `MULTI_DEVICE` | `false` | Enable second device capability |
| `MAX_INSTANCES` | auto | Override parallel worker count |
| `REQUIRE_ALL_DEVICES` | `false` | Throw if not all devices are connected |
| `USE_INSTALLED_APP` | – | Skip reinstalling the APK |
| `ANDROID_DEVICE_1` | `emulator-5554` | Device 1 serial |
| `ANDROID_DEVICE_2` | `emulator-5556` | Device 2 serial |
| `ANDROID_SDK_ROOT` | – | Path to Android SDK |
| `APPIUM_PORT` | `4723` | Appium server port |
| `CUCUMBER_TIMEOUT` | `60000` | Per-step timeout (ms) |
| `TAGS` | `not @skip` | Cucumber tag expression |
| `APP_PATH_ANDROID` | bundled APK | Path to APK under test |
| `APP_PATH_IOS` | – | Path to iOS app bundle |

