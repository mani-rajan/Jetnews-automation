class ArticlePage {

    private readonly shareDialogSelectors = [
        'android=new UiSelector().packageName("com.android.intentresolver")',
        'android=new UiSelector().resourceIdMatches(".*resolver.*|.*chooser.*")',
        '//*[@text="Share" or @text="Share via" or @text="Complete action using"]',
        '//*[@content-desc="Share" or @content-desc="Copy" or @content-desc="Nearby Share"]'
    ];

    private readonly likeActionSelectors = [
        '//*[@content-desc="Like" or @content-desc="Thumbs up" or @content-desc="Thumbs Up"]',
        '//*[@content-desc="Add to favorites" or @content-desc="Remove from favorites"]',
        '//android.widget.CheckBox'
    ];

    get title() {
        return $('//*[@content-desc="post_headline"]');
    }

    get bookmarkButton() {
        return $('//*[@content-desc="Add to favorites"]');
    }

    get likeButton() {
        return $(this.likeActionSelectors[0]);
    }

    get textSizeButton() {
        return $('//*[@content-desc="Text settings"]');
    }

    get navigateUpButton() {
        return $('//*[@content-desc="Navigate up" or @content-desc="Open navigation drawer"]');
    }

    get shareButton() {
        return $('//*[@content-desc="Share"]');
    }

    get bookmarkCheckbox() {
        return $('//android.widget.CheckBox');
    }

    get dialog() {
        return $('//*[contains(@text,"Functionality not available")]');
    }

    get dialogCloseButton() {
        return $('//*[@text="Close"]');
    }

    async waitForLoaded() {
        await this.title.waitForDisplayed();
    }

    async isArticleScreenVisible() {
        const anchors = [this.title, this.shareButton, this.textSizeButton, this.navigateUpButton];

        for (const anchor of anchors) {
            if (await anchor.isDisplayed().catch(() => false)) {
                return true;
            }
        }

        return false;
    }

    async getTitle() {
        return await this.title.getText();
    }

    async clickBookmark() {
        await this.bookmarkButton.waitForDisplayed();
        await this.bookmarkButton.click();
    }

    async clickLike() {
        for (const selector of this.likeActionSelectors) {
            const element = await $(selector);
            if (await element.isDisplayed().catch(() => false)) {
                await element.click();
                return;
            }
        }

        throw new Error('Unable to locate a Like action on article screen');
    }

    async isBookmarked() {
        const checked = await this.bookmarkCheckbox.getAttribute('checked');
        return checked === 'true';
    }

    async navigateUp() {
        if (await this.navigateUpButton.isExisting()) {
            await this.navigateUpButton.click();
        }
    }

    async clickTextSize() {
        await this.textSizeButton.click();
    }

    async clickShare() {
        await this.shareButton.waitForDisplayed();
        await this.shareButton.click();
    }

    async isSystemShareDialogVisible() {
        for (const selector of this.shareDialogSelectors) {
            const element = await $(selector);
            if (await element.isDisplayed().catch(() => false)) {
                return true;
            }
        }

        return false;
    }

    async isShareFallbackDialogVisible() {
        return await this.dialog.isDisplayed().catch(() => false);
    }

    async isAnyShareOutcomeVisible() {
        return (await this.isSystemShareDialogVisible()) || (await this.isShareFallbackDialogVisible());
    }

    async dismissSystemDialog() {
        await driver.back();
    }

    async dismissShareOutcome() {
        if (await this.isShareFallbackDialogVisible()) {
            await driver.back();
            return;
        }

        await this.dismissSystemDialog();
    }

    async waitForUnavailableDialog() {
        const appeared = await this.dialog.waitForDisplayed({ timeout: 5000 }).then(() => true).catch(() => false);
        if (!appeared) {
            throw new Error('Unavailable dialog did not appear after action tap. This action may be a known app issue on the current build.');
        }
    }

    async closeUnavailableDialog() {
        if (await this.dialogCloseButton.isDisplayed().catch(() => false)) {
            await this.dialogCloseButton.click();
            return;
        }

        await driver.back();
    }
}

export default new ArticlePage();