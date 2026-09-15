import { expect, test } from '@playwright/test'

test('the app loads to the connect screen without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible()

  expect(errors).toEqual([])
})
