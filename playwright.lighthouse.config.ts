import { defineConfig, devices } from '@playwright/test'

process.env.LH_REPORT_DIR = 'lighthouse-html'
process.env.LH_CSV_REPORT_DIR = 'lighthouse-csv'
process.env.LH_SCORES_DIR = 'lh-scores'

const baseURL = 'http://127.0.0.1:3000'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests/lighthouse',
    testMatch: '*.spec.ts',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 1 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 2 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [['line']],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        baseURL,
        acceptDownloads: false,
        trace: 'off',
        video: 'off',
        screenshot: 'off',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run start',
        url: baseURL,
        reuseExistingServer: false,
    },
    globalSetup: './tests/lighthouse/global-setup.ts',
    globalTeardown: './tests/lighthouse/global-teardown.ts',
})
