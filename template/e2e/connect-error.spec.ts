import { expect, test } from '@playwright/test'

// `.invalid` is reserved and never resolves, so the request fails without
// depending on any real indexer.
test('a failed connection is shown on the connect screen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').fill('https://indexer.invalid')
  await page.getByRole('button', { name: 'Connect' }).click()

  await expect(page.getByRole('alert')).toContainText('Connection failed')
  await expect(
    page.getByRole('heading', { name: 'Connect to Indexer' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Connect' })).toBeEnabled()
})
