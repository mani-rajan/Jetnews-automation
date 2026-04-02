export const iosCapabilities: WebdriverIO.Capabilities[] = [
    {
        platformName: 'iOS',
        'appium:deviceName': process.env.IOS_DEVICE_1 ?? 'iPhone 14',
        'appium:platformVersion': process.env.IOS_PLATFORM_VERSION_1 ?? '16.0',
        'appium:automationName': 'XCUITest',
        'appium:bundleId': process.env.IOS_BUNDLE_ID ?? 'com.example.jetnews',
        ...(process.env.APP_PATH_IOS ? { 'appium:app': process.env.APP_PATH_IOS } : {}),
        'wdio:maxInstances': Number(process.env.IOS_DEVICE_1_MAX_INSTANCES ?? 1)
    },
    {
        platformName: 'iOS',
        'appium:deviceName': process.env.IOS_DEVICE_2 ?? 'iPhone 15',
        'appium:platformVersion': process.env.IOS_PLATFORM_VERSION_2 ?? '17.0',
        'appium:automationName': 'XCUITest',
        'appium:bundleId': process.env.IOS_BUNDLE_ID ?? 'com.example.jetnews',
        ...(process.env.APP_PATH_IOS ? { 'appium:app': process.env.APP_PATH_IOS } : {}),
        'wdio:maxInstances': Number(process.env.IOS_DEVICE_2_MAX_INSTANCES ?? 1)
    }
];

