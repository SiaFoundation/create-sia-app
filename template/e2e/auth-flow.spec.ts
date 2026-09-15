import { expect, type Page, test as base } from '@playwright/test'

import { fakeIndexer, INDEXER_URL } from './fake-indexer'

// Long enough for the SDK's next approval check, which runs every 5 seconds,
// or for a page load that fetches the WASM module.
const WAIT = { timeout: 15_000 }

// Every test gets its own fake indexer, installed before the first page load,
// and fails on any console error or uncaught exception. Chrome logs one line
// per failed HTTP request, which the failure tests cause on purpose.
const test = base.extend<{ indexer: Awaited<ReturnType<typeof fakeIndexer>> }>({
  indexer: async ({ page }, provide) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().startsWith('Failed to load resource')
      ) {
        errors.push(msg.text())
      }
    })
    page.on('pageerror', (err) => errors.push(err.message))
    const indexer = await fakeIndexer(page)
    await page.goto('/')
    await provide(indexer)
    expect(errors).toEqual([])
  },
})

function connect(page: Page) {
  return page.getByRole('button', { name: 'Connect' }).click()
}

async function completeSetup(page: Page) {
  await page.getByRole('button', { name: 'Generate a new phrase' }).click(WAIT)
  await page.getByRole('button', { name: 'Complete setup' }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

async function approvalLink(page: Page) {
  return page
    .getByRole('link', { name: 'Open approval link' })
    .getAttribute('href')
}

test.beforeEach(async ({ page, indexer }) => {
  expect(indexer.requestIds).toHaveLength(0)
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible(WAIT)
  await page.getByRole('textbox').fill(INDEXER_URL)
})

test('approving the request leads through the recovery phrase to the upload screen', async ({
  page,
  indexer,
}) => {
  indexer.options.nextApproval = 'approved'
  await connect(page)
  await completeSetup(page)

  await expect(
    page.getByText('Drop files here or click to browse'),
  ).toBeVisible()
  expect(indexer.registrations()).toBe(1)
})

test('an existing phrase registers the same way', async ({ page, indexer }) => {
  indexer.options.nextApproval = 'approved'
  await connect(page)
  await page
    .getByRole('button', { name: 'I already have a phrase' })
    .click(WAIT)
  await page
    .getByRole('textbox')
    .fill('glare own entire dish exact open theme family harsh room scrap rose')
  await page.getByRole('button', { name: 'Complete setup' }).click()

  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  expect(indexer.registrations()).toBe(1)
})

test('an invalid phrase is refused before anything is sent', async ({
  page,
  indexer,
}) => {
  indexer.options.nextApproval = 'approved'
  await connect(page)
  await page
    .getByRole('button', { name: 'I already have a phrase' })
    .click(WAIT)
  await page.getByRole('textbox').fill('not a real recovery phrase at all')
  await page.getByRole('button', { name: 'Complete setup' }).click()

  await expect(page.getByText('not a valid 12-word phrase')).toBeVisible()
  await expect(page.getByRole('alert')).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'Complete setup' }),
  ).toBeEnabled()
  expect(indexer.registrations()).toBe(0)
})

test('a returning user reconnects on reload, and signing out forgets the key', async ({
  page,
  indexer,
}) => {
  indexer.options.nextApproval = 'approved'
  await connect(page)
  await completeSetup(page)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible(WAIT)
  expect(indexer.requestIds).toHaveLength(1)
  // One check even under StrictMode, which mounts the flow twice in dev.
  expect(indexer.authChecks()).toBe(1)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible(WAIT)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible(WAIT)
})

test('a key the indexer no longer knows is dropped quietly', async ({
  page,
  indexer,
}) => {
  indexer.options.nextApproval = 'approved'
  await connect(page)
  await completeSetup(page)

  indexer.options.knownUserKey = false
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible(WAIT)
  await expect(page.getByRole('alert')).toBeHidden()
  expect(indexer.requestIds).toHaveLength(1)

  // The key is forgotten, so the next load does not ask the indexer again.
  indexer.options.knownUserKey = true
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible(WAIT)
})

test('a failed reconnect offers a reload or a fresh start', async ({
  page,
  indexer,
}) => {
  indexer.options.nextApproval = 'approved'
  await connect(page)
  await completeSetup(page)

  indexer.options.checkDown = true
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(
    'Could not reconnect',
    WAIT,
  )
  expect(indexer.requestIds).toHaveLength(1)

  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible()
  // Starting over forgets the key, so a reload does not retry the reconnect.
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible(WAIT)
  await expect(page.getByRole('alert')).toBeHidden()
})

test('a failed connection request is shown and can be retried', async ({
  page,
  indexer,
}) => {
  indexer.options.connectDown = true
  await connect(page)
  await expect(page.getByRole('alert')).toContainText(
    'Could not reach the indexer',
  )
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible()

  indexer.options.connectDown = false
  await connect(page)
  await expect(page.getByText('Waiting for approval')).toBeVisible()
  await expect(page.getByRole('alert')).toBeHidden()
})

test('a denied request offers a new link', async ({ page, indexer }) => {
  indexer.options.nextApproval = 'denied'
  await connect(page)
  await expect(page.getByRole('alert')).toContainText(
    'denied or has expired',
    WAIT,
  )
  await expect(
    page.getByRole('link', { name: 'Open approval link' }),
  ).toBeHidden()

  indexer.options.nextApproval = 'pending'
  await page.getByRole('button', { name: 'Request a new link' }).click()
  await expect(page.getByText('Waiting for approval')).toBeVisible()
  await expect(page.getByRole('alert')).toBeHidden()
  expect(await approvalLink(page)).toContain(indexer.requestIds[1])
})

test('an expired request is reported the same way as a denied one', async ({
  page,
  indexer,
}) => {
  indexer.options.nextRequestExpired = true
  await connect(page)
  await expect(page.getByRole('alert')).toContainText(
    'denied or has expired',
    WAIT,
  )
})

test('a failed status check offers a new link or a fresh start', async ({
  page,
  indexer,
}) => {
  indexer.options.statusDown = true
  await connect(page)
  await expect(page.getByRole('alert')).toContainText(
    'Lost contact with the indexer',
    WAIT,
  )

  indexer.options.connectDown = true
  await page.getByRole('button', { name: 'Request a new link' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Could not reach the indexer',
  )

  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toBeHidden()
})

test('an approval for an abandoned request does not move the flow', async ({
  page,
  indexer,
}) => {
  await connect(page)
  await expect(page.getByText('Waiting for approval')).toBeVisible()
  await page.getByRole('button', { name: 'Start over' }).click()
  await page.getByRole('textbox').fill(INDEXER_URL)
  await connect(page)
  await expect(page.getByText('Waiting for approval')).toBeVisible()
  expect(indexer.requestIds).toHaveLength(2)
  const [abandoned, current] = indexer.requestIds as [string, string]
  expect(await approvalLink(page)).toContain(current)

  // The SDK cannot cancel a wait, so the abandoned request is still being
  // checked. Approve it, then wait until the SDK has seen that and the current
  // request has been checked again after it.
  indexer.approvals.set(abandoned, 'approved')
  const seen = indexer.statusChecks(abandoned)
  await expect
    .poll(() => indexer.statusChecks(abandoned), WAIT)
    .toBeGreaterThan(seen)
  const currentSeen = indexer.statusChecks(current)
  await expect
    .poll(() => indexer.statusChecks(current), WAIT)
    .toBeGreaterThan(currentSeen)

  await expect(
    page.getByRole('heading', { name: 'Approve the connection' }),
  ).toBeVisible()
  await expect(page.getByText('Waiting for approval')).toBeVisible()
})

test('when the account has no connections left, setup explains and offers a fresh start', async ({
  page,
  indexer,
}) => {
  indexer.options.nextApproval = 'approved'
  indexer.options.outOfConnections = true
  await connect(page)
  await page.getByRole('button', { name: 'Generate a new phrase' }).click(WAIT)
  await page.getByRole('button', { name: 'Complete setup' }).click()

  await expect(page.getByRole('alert')).toContainText('no app connections left')
  await expect(
    page.getByRole('button', { name: 'Complete setup' }),
  ).toBeHidden()
  await expect(page.getByRole('button', { name: 'Back' })).toBeHidden()

  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible()
})
