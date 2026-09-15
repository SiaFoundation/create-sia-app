import { expect, type Page, test as base } from '@playwright/test'

import { fakeIndexer, INDEXER_URL } from './fake-indexer'

type Indexer = Awaited<ReturnType<typeof fakeIndexer>>

// The recipient side of public sharing. The fake indexer cannot hold real
// files, so a share opens with no files in it; creating and stopping a share
// needs a real account and is checked by hand.
//
// Like the auth tests, each test fails on any console error from the app,
// ignoring the ones Chrome logs for failed requests to the fake indexer.
const test = base.extend<{ indexer: Indexer }>({
  indexer: [
    async ({ page }, provide) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (
          msg.type() === 'error' &&
          !msg.location().url.startsWith(INDEXER_URL)
        ) {
          errors.push(msg.text())
        }
      })
      page.on('pageerror', (err) => errors.push(err.message))
      await provide(await fakeIndexer(page))
      expect(errors).toEqual([])
    },
    { auto: true },
  ],
})

const SEED = 'c0ffee'.repeat(10) + 'c0ff'

function shareHash(seed = SEED) {
  return `#${new URLSearchParams({ share: seed, indexer: INDEXER_URL })}`
}

// Changing only the fragment keeps the page loaded, as pasting a link into a
// tab that already has the app open does.
function pasteShareLink(page: Page, seed = SEED) {
  return page.evaluate(
    `window.location.hash = ${JSON.stringify(shareHash(seed))}`,
  )
}

function expectSharePage(page: Page) {
  return expect(page.getByText('This share has no files.')).toBeVisible()
}

function back(page: Page) {
  return page.getByRole('link', { name: 'Back' }).click()
}

function expectConnectScreen(page: Page) {
  return expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible()
}

function sharedWithYou(page: Page) {
  return page.getByRole('heading', { name: 'Shared with you', level: 2 })
}

// The fake indexer's shares have no files, so each is titled "Empty share".
function shareRows(page: Page) {
  return page.getByRole('link', { name: /Empty share/ })
}

test('a share link opens its page without an account and stays listed at home', async ({
  page,
}) => {
  await page.goto(`/${shareHash()}`)
  await expectSharePage(page)

  await back(page)
  await expectConnectScreen(page)
  await expect(shareRows(page)).toHaveCount(1)

  await page.reload()
  await expect(shareRows(page)).toHaveCount(1)
  await shareRows(page).click()
  await expectSharePage(page)
})

test('a share can be removed from the list at home', async ({ page }) => {
  await page.goto(`/${shareHash()}`)
  await expectSharePage(page)
  await back(page)

  await page.getByRole('button', { name: 'Remove from list' }).click()
  await expect(sharedWithYou(page)).toBeHidden()
  await page.reload()
  await expectConnectScreen(page)
  await expect(sharedWithYou(page)).toBeHidden()
})

test('a stopped share says so and can be removed', async ({
  page,
  indexer,
}) => {
  indexer.options.sharesRevoked = true
  await page.goto(`/${shareHash()}`)

  await expect(
    page.getByRole('heading', { name: 'Share unavailable' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Remove from list' }).click()
  await expectConnectScreen(page)
  await expect(sharedWithYou(page)).toBeHidden()
})

test('a share link pasted into an open tab opens without a reload', async ({
  page,
}) => {
  await page.goto('/')
  await expectConnectScreen(page)

  await pasteShareLink(page)
  await expectSharePage(page)
})

test('the same link opened twice is listed once', async ({ page }) => {
  await page.goto(`/${shareHash()}`)
  await expectSharePage(page)
  await back(page)
  await pasteShareLink(page)
  await expectSharePage(page)
  await back(page)

  await page.reload()
  await expect(shareRows(page)).toHaveCount(1)
})

test('links opened in two tabs are both kept', async ({ page, context }) => {
  await page.goto('/')
  const other = await context.newPage()
  await fakeIndexer(other)
  await other.goto(`/${shareHash()}`)
  await expectSharePage(other)

  await pasteShareLink(page, 'ab'.repeat(32))
  await expectSharePage(page)
  await back(page)
  await expect(shareRows(page)).toHaveCount(2)
  await page.reload()
  await expect(shareRows(page)).toHaveCount(2)
})

test('a signed-in user opens a share link and returns to their files', async ({
  page,
  indexer,
}) => {
  indexer.options.nextApproval = 'approved'
  await page.goto('/')
  await page.getByRole('textbox').fill(INDEXER_URL)
  await page.getByRole('button', { name: 'Connect' }).click()
  await page.getByRole('button', { name: 'Generate a new phrase' }).click()
  await page.getByRole('button', { name: 'Complete setup' }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()

  await pasteShareLink(page)
  await expectSharePage(page)
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()

  await back(page)
  await expect(
    page.getByText('Drop files here or click to browse'),
  ).toBeVisible()
  await expect(shareRows(page)).toHaveCount(1)
})

test('a link without a valid seed shows the home page', async ({ page }) => {
  await page.goto(`/${shareHash('not-a-seed')}`)

  await expectConnectScreen(page)
  await expect(sharedWithYou(page)).toBeHidden()
})
