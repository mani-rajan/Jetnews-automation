import { Given, When, Then, Before, AfterStep, After } from '@wdio/cucumber-framework';
import { expect } from '@wdio/globals';
import HomePage from '../../pages/home.page';
import ArticlePage from '../../pages/article.page';

const { attach } = require('wdio-cucumberjs-json-reporter') as {
    attach: (data: string | object, mediaType?: string) => void;
};

let storedHeadline = '';

function isMeaningfulValue(value: unknown): value is string | number {
    if (value === undefined || value === null) {
        return false;
    }

    const normalized = String(value).trim();
    return normalized !== '' && !/^(unknown|unknown-device)$/i.test(normalized);
}

function getNestedValue(source: any, path: string[]): unknown {
    let current = source;
    for (const key of path) {
        if (current == null) {
            return undefined;
        }
        current = current[key];
    }
    return current;
}

function collectCapabilitySources(capabilities: any): any[] {
    if (!capabilities) {
        return [];
    }

    const firstMatch: any[] = Array.isArray(capabilities.firstMatch) ? capabilities.firstMatch : [];
    const nested = [
        capabilities,
        capabilities.alwaysMatch,
        capabilities['appium:options'],
        capabilities.appiumOptions,
        ...firstMatch,
        ...firstMatch.map((entry: any) => entry?.['appium:options']),
        ...firstMatch.map((entry: any) => entry?.appiumOptions)
    ];

    return nested.filter(Boolean);
}

function resolveCapabilityValue(...paths: string[][]): string | undefined {
    const candidateRoots = [
        ...(Array.isArray((browser as any)?.capabilities)
            ? ((browser as any).capabilities as any[])
            : [(browser as any)?.capabilities]),
        ...(Array.isArray((browser as any)?.requestedCapabilities)
            ? ((browser as any).requestedCapabilities as any[])
            : [(browser as any)?.requestedCapabilities]),
        ...(Array.isArray((browser as any)?.options?.capabilities)
            ? ((browser as any).options.capabilities as any[])
            : [(browser as any)?.options?.capabilities])
    ].filter(Boolean);

    const sources = candidateRoots.flatMap((root) => collectCapabilitySources(root));

    for (const source of sources) {
        for (const path of paths) {
            const value = getNestedValue(source, path);
            if (isMeaningfulValue(value)) {
                return String(value).trim();
            }
        }
    }

    return undefined;
}

function isFailedStatus(status?: string): boolean {
    return String(status ?? '').toLowerCase() === 'failed';
}

Before(async function () {
    const device =
        resolveCapabilityValue(
            ['appium:udid'],
            ['udid'],
            ['appium:deviceName'],
            ['deviceName']
        ) ??
        process.env.DEVICE_NAME ??
        process.env.ANDROID_UDID_1 ??
        process.env.ANDROID_DEVICE_1 ??
        'unknown-device';

    const platform =
        resolveCapabilityValue(
            ['platformName'],
            ['appium:platformName']
        ) ??
        process.env.PLATFORM_NAME ??
        'Android';

    const version =
        resolveCapabilityValue(
            ['appium:platformVersion'],
            ['platformVersion']
        ) ??
        process.env.PLATFORM_VERSION ??
        process.env.ANDROID_PLATFORM_VERSION_1 ??
        'unknown';

    const appiumPort = process.env.APPIUM_PORT ?? '4723';

    // Visible in cucumber HTML attachments for each scenario.
    attach(`Executed on ${device} (${platform} ${version}) via Appium ${appiumPort}`, 'text/plain');
});

Given('I am on the JetNews home screen', async () => {
    if (await ArticlePage.title.isExisting().catch(() => false)) {
        await ArticlePage.navigateUp();
    }

    await HomePage.topStory.waitForDisplayed();
});

Given('I store the top story headline from home screen', async () => {
    storedHeadline = await HomePage.getTopStoryTitle();
    await expect(storedHeadline).not.toEqual('');
});

When('I open the top story', async () => {
    await HomePage.clickTopStory();
    await ArticlePage.waitForLoaded();
});

Then('the article headline should match the stored headline', async () => {
    const articleHeadline = await ArticlePage.getTitle();
    await expect(articleHeadline).toEqual(storedHeadline);
});

Then('the stored headline should be {string}', async (expectedHeadline: string) => {
    await expect(storedHeadline).toEqual(expectedHeadline);
});

Given('I open story number {int} from home screen', async (storyNumber: number) => {
    storedHeadline = await HomePage.getStoryTitle(storyNumber);
    await HomePage.clickStory(storyNumber);
    await ArticlePage.waitForLoaded();
});

When('I tap the share button on article screen', async () => {
    await ArticlePage.clickShare();
});

Then('the Android OS share dialog should be visible', async () => {
    // On clean emulators there may be no share targets; app can show fallback dialog instead.
    const shareOutcomeVisible = await ArticlePage.isAnyShareOutcomeVisible();
    await expect(shareOutcomeVisible).toBe(true);
    await ArticlePage.dismissShareOutcome();
});
When('I tap the like button on article screen', async () => {
    await ArticlePage.clickLike();
});

Then('I verify Functionality not available alert message', async () => {
    await ArticlePage.waitForUnavailableDialog();
    const dialogVisible = await ArticlePage.dialog.isDisplayed().catch(() => false);
    await expect(dialogVisible).toBe(true);
});

Then('I close the alert message', async () => {
    await ArticlePage.closeUnavailableDialog();
});

When('I tap the bookmark button on article screen', async () => {
    await ArticlePage.clickBookmark();
});

Then('I should still be on the article screen', async () => {
    const articleVisible = await ArticlePage.isArticleScreenVisible();
    await expect(articleVisible).toBe(true);
});

Then('I should not be on the home feed', async () => {
    const homeVisible = await HomePage.topStory.isDisplayed().catch(() => false);
    await expect(homeVisible).toBe(false);
});

Then('bookmark should navigate back to home feed', async () => {
    // If home feed appears within settle time, bookmark navigation is no longer broken.
    const navigatedHome = await browser.waitUntil(async () => {
        return await HomePage.topStory.isDisplayed().catch(() => false);
    }, {
        timeout: 3000,
        interval: 400
    }).then(() => true).catch(() => false);

    console.log(`[bookmark-check] navigatedHome=${navigatedHome}`);
    console.log('navigatedHome:', navigatedHome);
    await expect(navigatedHome).toBe(true);
});

AfterStep(async function ({ result }: { result: { status?: string } }) {
    if (!isFailedStatus(result?.status)) {
        return;
    }

    // Attach screenshot directly to cucumber JSON for HTML report rendering.
    attach(await browser.takeScreenshot(), 'image/png');
});

After(async function ({ result }: { result?: { status?: string } }) {
    if (!isFailedStatus(result?.status)) {
        return;
    }

    // Fallback screenshot at scenario end, useful when a failure is not tied to an AfterStep callback.
    attach(await browser.takeScreenshot(), 'image/png');
});

