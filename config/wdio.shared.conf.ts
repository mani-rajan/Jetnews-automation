import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const screenshotDir = join(process.cwd(), 'screenshots');
const cucumberJsonDir = join(process.cwd(), 'reports', 'cucumber-json');
const allureResultsDir = join(process.cwd(), 'allure-results');
const appiumPort = Number(process.env.APPIUM_PORT ?? 4723);
const uiWaitTimeout = Number(process.env.UI_WAIT_TIMEOUT ?? 15000);

// Metadata embedded into every Cucumber JSON feature by wdio-cucumberjs-json-reporter.
// Env vars allow overriding at runtime; sensible defaults are used otherwise.
const reporterMetadata = {
    app: {
        name:    process.env.APP_NAME    ?? 'JetNews',
        version: process.env.APP_VERSION ?? '1.0'
    },
    browser: {
        name:    'Appium',
        version: '3.x'
    },
    device:
        process.env.DEVICE_NAME ??
        process.env.ANDROID_DEVICE_1 ??
        process.env.IOS_DEVICE_1 ??
        'emulator-5554',
    platform: {
        name:
            process.env.PLATFORM_NAME ??
            (process.env.IOS_DEVICE_1 && !process.env.ANDROID_DEVICE_1 ? 'iOS' : 'Android'),
        version:
            process.env.PLATFORM_VERSION ??
            process.env.ANDROID_PLATFORM_VERSION_1 ??
            process.env.IOS_PLATFORM_VERSION_1 ??
            '11'
    }
};

function safeName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export const sharedConfig: Partial<WebdriverIO.Config> = {
    runner: 'local',
    hostname: '127.0.0.1',
    port: appiumPort,
    services: [
        ['appium', { command: 'appium', args: { address: '127.0.0.1', port: appiumPort } }]
    ],
    framework: 'cucumber',
    waitforTimeout: uiWaitTimeout,
    reporters: [
        'spec',
        ['allure', { outputDir: 'allure-results' }],
        [
            'cucumberjs-json',
            {
                jsonFolder: cucumberJsonDir,
                language: 'en',
                reportFilePerRetry: false,
                metadata: reporterMetadata
            }
        ]
    ],
    onPrepare: function () {
        // Clean stale artefacts so each run's reports only contain current output.
        rmSync(cucumberJsonDir, { recursive: true, force: true });
        rmSync(allureResultsDir, { recursive: true, force: true });
    },
    cucumberOpts: {
        requireModule: ['ts-node/register/transpile-only'],
        require: ['./features/step-definitions/**/*.ts'],
        timeout: Number(process.env.CUCUMBER_TIMEOUT ?? 60000),
        failFast: false,
        strict: true,
        tags: process.env.TAGS ?? 'not @skip'
    },
    afterScenario: async function (_world: any, result: any) {
        if (!result?.error) {
            return;
        }

        if (!existsSync(screenshotDir)) {
            mkdirSync(screenshotDir, { recursive: true });
        }

        const cid = process.env.WDIO_WORKER_ID ?? 'worker';
        const platform = String((browser.capabilities as any)?.platformName ?? 'unknown').toLowerCase();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const scenarioName = result?.pickle?.name ?? 'scenario';
        const fileName = `${safeName(platform)}_${safeName(cid)}_${safeName(scenarioName)}_${timestamp}.png`;

        await driver.saveScreenshot(join(screenshotDir, fileName));
    }
};

