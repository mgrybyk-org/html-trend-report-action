import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.goto('/chart')
})

test('chart', async ({ page }) => {
    await expect(page.locator('[data-testid="foo"]')).toBeVisible()
    await expect(page.locator('[data-testid="foo"] h2')).toHaveText('foo #')

    await expect(page).toHaveScreenshot()
})
