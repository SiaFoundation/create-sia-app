import { expect, test } from '@playwright/test'

test('the app loads to the connect screen without console errors', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible({ timeout: 15_000 })

  expect(errors).toEqual([])
})
