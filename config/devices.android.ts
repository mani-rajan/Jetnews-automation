const androidAppPath = process.env.APP_PATH_ANDROID ?? 'D:/mobile-automation/apps/jetnews-assessment-debug.apk';
const androidAppPackage = process.env.ANDROID_APP_PACKAGE ?? 'com.example.jetnews';
const androidAppActivity = process.env.ANDROID_APP_ACTIVITY ?? 'com.example.jetnews.ui.MainActivity';
const androidAppWaitActivity =
    process.env.ANDROID_APP_WAIT_ACTIVITY ??
    'com.example.jetnews.ui.MainActivity,com.example.jetnews.MainActivity,com.example.jetnews.ui.*,com.example.jetnews.*';

/**
 * When USE_INSTALLED_APP=true the app is already on the device.
 * Omitting `appium:app` and setting `appium:noReset: true` tells
 * UiAutomator2 to launch the existing installation rather than
 * reinstalling the APK, which saves significant session-start time
 * in the two-emulator and multidevice parallel runners.
 */
const useInstalledApp = process.env.USE_INSTALLED_APP === 'true';

const appCap: Partial<WebdriverIO.Capabilities> = useInstalledApp
    ? { 'appium:noReset': true }
    : { 'appium:app': androidAppPath };

export const androidCapabilities: WebdriverIO.Capabilities[] = [
    {
        platformName: 'Android',
        'appium:deviceName': process.env.ANDROID_DEVICE_1 ?? 'emulator-5554',
        'appium:udid': process.env.ANDROID_UDID_1 ?? process.env.ANDROID_DEVICE_1 ?? 'emulator-5554',
        'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION_1 ?? '11',
        'appium:automationName': 'UiAutomator2',
        'appium:appPackage': androidAppPackage,
        'appium:appActivity': androidAppActivity,
        'appium:appWaitActivity': androidAppWaitActivity,
        'appium:appWaitDuration': Number(process.env.ANDROID_APP_WAIT_DURATION ?? 120000),
        'appium:androidInstallTimeout': Number(process.env.ANDROID_INSTALL_TIMEOUT ?? 180000),
        'appium:systemPort': Number(process.env.ANDROID_SYSTEM_PORT_1 ?? 8200),
        'appium:mjpegServerPort': Number(process.env.ANDROID_MJPEG_PORT_1 ?? 7810),
        'appium:chromedriverPort': Number(process.env.ANDROID_CHROMEDRIVER_PORT_1 ?? 9515),
        ...appCap,
        'wdio:maxInstances': Number(process.env.ANDROID_DEVICE_1_MAX_INSTANCES ?? 1)
    },
    {
        platformName: 'Android',
        'appium:deviceName': process.env.ANDROID_DEVICE_2 ?? 'emulator-5556',
        'appium:udid': process.env.ANDROID_UDID_2 ?? process.env.ANDROID_DEVICE_2 ?? 'emulator-5556',
        'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION_2 ?? '11',
        'appium:automationName': 'UiAutomator2',
        'appium:appPackage': androidAppPackage,
        'appium:appActivity': androidAppActivity,
        'appium:appWaitActivity': androidAppWaitActivity,
        'appium:appWaitDuration': Number(process.env.ANDROID_APP_WAIT_DURATION ?? 120000),
        'appium:androidInstallTimeout': Number(process.env.ANDROID_INSTALL_TIMEOUT ?? 180000),
        'appium:systemPort': Number(process.env.ANDROID_SYSTEM_PORT_2 ?? 8201),
        'appium:mjpegServerPort': Number(process.env.ANDROID_MJPEG_PORT_2 ?? 7811),
        'appium:chromedriverPort': Number(process.env.ANDROID_CHROMEDRIVER_PORT_2 ?? 9516),
        ...appCap,
        'wdio:maxInstances': Number(process.env.ANDROID_DEVICE_2_MAX_INSTANCES ?? 1)
    }
];

