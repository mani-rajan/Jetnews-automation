import { Given, When, Then } from '@wdio/cucumber-framework';
import { expect } from '@wdio/globals';
import HomePage from '../../pages/home.page';
import ArticlePage from '../../pages/article.page';

let storedHeadline = '';

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

Then('bookmark should not navigate back to home feed', async () => {
    // If home feed appears within settle time, bookmark navigation is no longer broken.
    const navigatedHome = await browser.waitUntil(async () => {
        return await HomePage.topStory.isDisplayed().catch(() => false);
    }, {
        timeout: 3000,
        interval: 400
    }).then(() => true).catch(() => false);

    await expect(navigatedHome).toBe(false);
});

