import { expect, type Page, test } from '@playwright/test'

import { fakeIndexer, INDEXER_URL } from './fake-indexer'

// Long enough for one approval poll by the SDK, which runs every few seconds.
const POLL = { timeout: 15_000 }

async function connect(page: Page) {
  await page.getByRole('textbox').fill(INDEXER_URL)
  await page.getByRole('button', { name: 'Connect' }).click()
}

async function approvalLink(page: Page) {
  return page.getByRole('link', { name: 'Open Link' }).getAttribute('href')
}

async function completeSetup(page: Page) {
  await page.getByRole('button', { name: 'Generate New Phrase' }).click()
  await page.getByRole('button', { name: 'Complete Setup' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('approving the request leads through the recovery phrase to the upload screen', async ({
  page,
}) => {
  const indexer = await fakeIndexer(page)
  indexer.state.nextApproval = 'approved'

  await connect(page)
  await expect(
    page.getByRole('heading', { name: 'Recovery Phrase' }),
  ).toBeVisible(POLL)
  await completeSetup(page)

  await expect(
    page.getByText('Drop files here or click to browse'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible()
  expect(indexer.state.registrations).toBe(1)
})

test('a returning user reconnects on reload and signing out returns to connect', async ({
  page,
}) => {
  const indexer = await fakeIndexer(page)
  indexer.state.nextApproval = 'approved'
  await connect(page)
  await completeSetup(page)
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible(POLL)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible()
  expect(indexer.requestIds).toHaveLength(1)

  await page.getByRole('button', { name: 'Sign Out' }).click()
  await expect(
    page.getByRole('heading', { name: 'Connect to Indexer' }),
  ).toBeVisible()
})

test('a failed reconnect offers a retry instead of a new connection', async ({
  page,
}) => {
  const indexer = await fakeIndexer(page)
  indexer.state.nextApproval = 'approved'
  await connect(page)
  await completeSetup(page)
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible(POLL)

  indexer.state.checkFails = true
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(
    'Could not reach the indexer to reconnect',
  )

  indexer.state.checkFails = false
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible()
})

test('a failed connection is shown on the connect screen and can be retried', async ({
  page,
}) => {
  const indexer = await fakeIndexer(page)
  indexer.state.connectFails = true

  await connect(page)
  await expect(page.getByRole('alert')).toContainText('Connection failed')
  await expect(
    page.getByRole('heading', { name: 'Connect to Indexer' }),
  ).toBeVisible()

  indexer.state.connectFails = false
  await page.getByRole('button', { name: 'Connect' }).click()
  await expect(page.getByText('Polling for approval')).toBeVisible()
  await expect(page.getByRole('alert')).toBeHidden()
})

test('a denied or expired request offers a new link', async ({ page }) => {
  const indexer = await fakeIndexer(page)
  indexer.state.nextApproval = 'rejected'

  await connect(page)
  await expect(page.getByRole('alert')).toContainText(
    'denied or has expired',
    POLL,
  )
  await expect(page.getByRole('link', { name: 'Open Link' })).toBeHidden()

  indexer.state.nextApproval = 'pending'
  await page.getByRole('button', { name: 'Request new link' }).click()
  await expect(page.getByText('Polling for approval')).toBeVisible()
  await expect(page.getByRole('alert')).toBeHidden()
  expect(await approvalLink(page)).toContain(indexer.requestIds[1])
})

test('a failed approval check offers a new link or a way back', async ({
  page,
}) => {
  const indexer = await fakeIndexer(page)
  indexer.state.nextApproval = 'unreachable'

  await connect(page)
  await expect(page.getByRole('alert')).toContainText(
    'Stopped waiting for approval',
    POLL,
  )

  indexer.state.connectFails = true
  await page.getByRole('button', { name: 'Request new link' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Could not request a new link',
  )

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(
    page.getByRole('heading', { name: 'Connect to Indexer' }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toBeHidden()
})

test('an approval for an abandoned request does not move the flow', async ({
  page,
}) => {
  const indexer = await fakeIndexer(page)

  await connect(page)
  await expect(page.getByText('Polling for approval')).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Connect' }).click()
  await expect(page.getByText('Polling for approval')).toBeVisible()

  const [abandoned, current] = indexer.requestIds
  expect(await approvalLink(page)).toContain(current)

  // The SDK cannot cancel polling, so the abandoned request keeps being
  // checked. Approve it and wait for the next check to pick that up.
  const checksBefore = indexer.statusChecks(abandoned ?? '')
  indexer.setApproval(abandoned ?? '', 'approved')
  await expect
    .poll(() => indexer.statusChecks(abandoned ?? ''), POLL)
    .toBeGreaterThan(checksBefore)
  await page.waitForTimeout(500)

  await expect(
    page.getByRole('heading', { name: 'Approve Connection' }),
  ).toBeVisible()
  await expect(page.getByText('Polling for approval')).toBeVisible()
})

test('an invalid recovery phrase is rejected before registering', async ({
  page,
}) => {
  const indexer = await fakeIndexer(page)
  indexer.state.nextApproval = 'approved'

  await connect(page)
  await page.getByRole('button', { name: 'Enter Existing Phrase' }).click(POLL)
  await page.getByRole('textbox').fill('not a real recovery phrase at all')
  await page.getByRole('button', { name: 'Complete Setup' }).click()

  await expect(page.getByText('Invalid recovery phrase')).toBeVisible()
  expect(indexer.state.registrations).toBe(0)
})

test('a registration error explains the problem and starting over returns to connect', async ({
  page,
}) => {
  const indexer = await fakeIndexer(page)
  indexer.state.nextApproval = 'approved'
  indexer.state.keyExhausted = true

  await connect(page)
  await page.getByRole('button', { name: 'Generate New Phrase' }).click(POLL)
  await page.getByRole('button', { name: 'Complete Setup' }).click()

  await expect(page.getByRole('alert')).toContainText(
    'used all of its app connections',
  )
  await expect(
    page.getByRole('button', { name: 'Complete Setup' }),
  ).toBeHidden()

  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(
    page.getByRole('heading', { name: 'Connect to Indexer' }),
  ).toBeVisible()
})
