class HomePage {

    private readonly storyClickableSelectors = [
        '//*[@content-desc="top_story_post"]',
        '//*[@content-desc="post_0"]',
        '//*[@content-desc="post_1"]'
    ];

    private readonly storyTitleSelectors = [
        '//*[@content-desc="top_post_headline"]',
        '//*[@content-desc="post_title_0"]',
        '//*[@content-desc="post_title_1"]'
    ];

    get topStory() {
        return $('//*[@content-desc="top_post_headline"]');
    }

    get topStoryClickable() {
        return $('//*[@content-desc="top_story_post"]');
    }

    get secondStory() {
        return $('//*[@content-desc="post_title_0"]');
    }

    get secondStoryClickable() {
        return $('//*[@content-desc="post_0"]');
    }

    get thirdStory() {
        return $('//*[@content-desc="post_title_1"]');
    }

    get thirdStoryClickable() {
        return $('//*[@content-desc="post_1"]');
    }

    async clickTopStory() {
        await this.clickStory(1);
    }

    async getTopStoryTitle() {
        return await this.getStoryTitle(1);
    }

    async clickStory(index: number) {
        if (index < 1 || index > this.storyClickableSelectors.length) {
            throw new Error(`Invalid story index: ${index}`);
        }

        const story = await $(this.storyClickableSelectors[index - 1]);
        await story.waitForDisplayed();
        await story.click();
    }

    async getStoryTitle(index: number) {
        if (index < 1 || index > this.storyTitleSelectors.length) {
            throw new Error(`Invalid story index: ${index}`);
        }

        const title = await $(this.storyTitleSelectors[index - 1]);
        await title.waitForDisplayed();
        return await title.getText();
    }
}

export default new HomePage();