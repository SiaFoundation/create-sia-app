import { expect, type Page, test as base } from '@playwright/test'

import { fakeIndexer, INDEXER_URL } from './fake-indexer'

type Indexer = Awaited<ReturnType<typeof fakeIndexer>>

// Every test starts on the connect screen with a fake indexer installed and
// its address filled in, and fails on any console error or uncaught exception
// from the app itself. Chrome logs one console error per failed HTTP request,
// which the failure tests cause on purpose, so errors from the fake indexer's
// origin do not count.
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
      const indexer = await fakeIndexer(page)
      await page.goto('/')
      await expectConnectScreen(page)
      await page.getByRole('textbox').fill(INDEXER_URL)
      await provide(indexer)
      expect(errors).toEqual([])
    },
    { auto: true },
  ],
})

function connect(page: Page) {
  return page.getByRole('button', { name: 'Connect' }).click()
}

function expectConnectScreen(page: Page) {
  return expect(
    page.getByRole('heading', { name: 'Connect to Sia' }),
  ).toBeVisible()
}

function expectWaitingForApproval(page: Page) {
  return expect(page.getByText('Waiting for approval')).toBeVisible()
}

function expectSignedIn(page: Page) {
  return expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

// The whole happy path: connect, approve, register with a new phrase.
async function signIn(page: Page, indexer: Indexer) {
  indexer.options.nextApproval = 'approved'
  await connect(page)
  await page.getByRole('button', { name: 'Generate a new phrase' }).click()
  await page.getByRole('button', { name: 'Complete setup' }).click()
  await expectSignedIn(page)
}

const EXISTING_PHRASE =
  'glare own entire dish exact open theme family harsh room scrap rose'

async function enterPhrase(page: Page, phrase: string) {
  await page.getByRole('button', { name: 'I already have a phrase' }).click()
  await page.getByRole('textbox').fill(phrase)
  await page.getByRole('button', { name: 'Complete setup' }).click()
}

function approvalLink(page: Page) {
  return page
    .getByRole('link', { name: 'Open approval link' })
    .getAttribute('href')
}

test('approving the request leads through the recovery phrase to the upload screen', async ({
  page,
  indexer,
}) => {
  await signIn(page, indexer)

  await expect(
    page.getByText('Drop files here or click to browse'),
  ).toBeVisible()
  expect(indexer.registrations()).toBe(1)
})

test('an existing phrase registers the same way', async ({ page, indexer }) => {
  indexer.options.nextApproval = 'approved'
  await connect(page)
  await enterPhrase(page, EXISTING_PHRASE)

  await expectSignedIn(page)
  expect(indexer.registrations()).toBe(1)
})

test('an invalid phrase is refused before anything is sent', async ({
  page,
  indexer,
}) => {
  indexer.options.nextApproval = 'approved'
  await connect(page)
  await page.getByRole('button', { name: 'I already have a phrase' }).click()
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
  await signIn(page, indexer)

  await page.reload()
  await expectSignedIn(page)
  expect(indexer.requestIds).toHaveLength(1)
  // One check even under StrictMode, which mounts the flow twice in dev.
  expect(indexer.authChecks()).toBe(1)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expectConnectScreen(page)
  await page.reload()
  await expectConnectScreen(page)
})

test('a key the indexer no longer knows is forgotten', async ({
  page,
  indexer,
}) => {
  await signIn(page, indexer)

  const keys = [...indexer.registeredKeys]
  indexer.registeredKeys.clear()
  await page.reload()
  await expectConnectScreen(page)
  await expect(page.getByRole('alert')).toBeHidden()
  expect(indexer.requestIds).toHaveLength(1)

  // The key is gone, so the next load does not ask the indexer again.
  for (const key of keys) indexer.registeredKeys.add(key)
  await page.reload()
  await expectConnectScreen(page)
})

test('a failed reconnect offers a reload or a fresh start', async ({
  page,
  indexer,
}) => {
  await signIn(page, indexer)

  indexer.options.authCheckDown = true
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Could not reconnect')
  await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible()
  expect(indexer.requestIds).toHaveLength(1)

  await page.getByRole('button', { name: 'Start over' }).click()
  await expectConnectScreen(page)
  // Starting over forgets the key, so a reload does not retry the reconnect.
  await page.reload()
  await expectConnectScreen(page)
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
  await expectConnectScreen(page)

  indexer.options.connectDown = false
  await connect(page)
  await expectWaitingForApproval(page)
  await expect(page.getByRole('alert')).toBeHidden()
})

test('a denied request offers a new link', async ({ page, indexer }) => {
  indexer.options.nextApproval = 'denied'
  await connect(page)
  await expect(page.getByRole('alert')).toContainText('denied or has expired')
  await expect(
    page.getByRole('link', { name: 'Open approval link' }),
  ).toBeHidden()

  indexer.options.nextApproval = 'pending'
  await page.getByRole('button', { name: 'Request a new link' }).click()
  await expectWaitingForApproval(page)
  await expect(page.getByRole('alert')).toBeHidden()
  expect(await approvalLink(page)).toContain(indexer.requestIds[1])
})

test('an expired request is reported the same way as a denied one', async ({
  page,
  indexer,
}) => {
  indexer.options.nextRequestExpired = true
  await connect(page)
  await expect(page.getByRole('alert')).toContainText('denied or has expired')
})

test('a failed status check offers a new link or a fresh start', async ({
  page,
  indexer,
}) => {
  indexer.options.statusDown = true
  await connect(page)
  await expect(page.getByRole('alert')).toContainText(
    'Lost contact with the indexer',
  )

  indexer.options.connectDown = true
  await page.getByRole('button', { name: 'Request a new link' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Could not reach the indexer',
  )

  await page.getByRole('button', { name: 'Start over' }).click()
  await expectConnectScreen(page)
  await expect(page.getByRole('alert')).toBeHidden()
})

test('an approval for an abandoned request does not move the flow', async ({
  page,
  indexer,
}) => {
  await connect(page)
  await expectWaitingForApproval(page)
  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(page.getByRole('textbox')).toHaveValue(INDEXER_URL)
  await connect(page)
  await expectWaitingForApproval(page)
  expect(indexer.requestIds).toHaveLength(2)
  const [abandoned, current] = indexer.requestIds as [string, string]
  expect(await approvalLink(page)).toContain(current)

  // The SDK cannot cancel a wait, so the abandoned request is still being
  // checked. Approve it, then wait until the fake has answered approved and
  // the current request has been checked once more after that.
  indexer.approvals.set(abandoned, 'approved')
  const seen = indexer.statusChecks(abandoned)
  await expect.poll(() => indexer.statusChecks(abandoned)).toBeGreaterThan(seen)
  const currentSeen = indexer.statusChecks(current)
  await expect
    .poll(() => indexer.statusChecks(current))
    .toBeGreaterThan(currentSeen)

  await expect(
    page.getByRole('heading', { name: 'Approve the connection' }),
  ).toBeVisible()
  await expectWaitingForApproval(page)
})

test('when the account has no connections left, setup explains and offers a fresh start', async ({
  page,
  indexer,
}) => {
  indexer.options.nextApproval = 'approved'
  indexer.options.outOfConnections = true
  await connect(page)
  await page.getByRole('button', { name: 'Generate a new phrase' }).click()
  await page.getByRole('button', { name: 'Complete setup' }).click()

  await expect(page.getByRole('alert')).toContainText('limit of connected apps')
  await expect(
    page.getByRole('button', { name: 'Complete setup' }),
  ).toBeHidden()
  await expect(page.getByRole('button', { name: 'Back' })).toBeHidden()

  await page.getByRole('button', { name: 'Start over' }).click()
  await expectConnectScreen(page)
})

test('a returning account is asked for its phrase first and gets it back', async ({
  page,
  indexer,
}) => {
  indexer.options.nextApproval = 'approved'
  await connect(page)
  await enterPhrase(page, EXISTING_PHRASE)
  await expectSignedIn(page)
  await page.getByRole('button', { name: 'Sign out' }).click()

  await connect(page)
  await expect(page.getByText('has used this app before')).toBeVisible()
  const choices = page.getByRole('button', { name: /phrase/ })
  await expect(choices.first()).toHaveText('I already have a phrase')
  await enterPhrase(page, EXISTING_PHRASE)

  await expectSignedIn(page)
  expect(indexer.registeredKeys.size).toBe(1)
})

test('a phrase that does not match a returning account asks before creating a new one', async ({
  page,
  indexer,
}) => {
  await signIn(page, indexer)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await connect(page)
  const registrations = indexer.registrations()

  await page.getByRole('button', { name: 'Generate a new phrase' }).click()
  await page.getByRole('button', { name: 'Complete setup' }).click()
  await expect(
    page.getByRole('heading', { name: 'This phrase starts a new account' }),
  ).toBeVisible()
  expect(indexer.registrations()).toBe(registrations)

  await page.getByRole('button', { name: 'Use a different phrase' }).click()
  await expect(
    page.getByRole('heading', { name: 'Recovery phrase' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Generate a new phrase' }).click()
  await page.getByRole('button', { name: 'Complete setup' }).click()
  await page.getByRole('button', { name: 'Create a new account' }).click()

  await expectSignedIn(page)
  expect(indexer.registeredKeys.size).toBe(2)
})

test('a corrupt saved key is forgotten instead of reported', async ({
  page,
  indexer,
}) => {
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('sia-auth-'))
    if (!key) throw new Error('no persisted auth state')
    localStorage.setItem(
      key,
      JSON.stringify({
        state: { userKeyHex: 'not hex', indexerUrl: 'https://indexer.test' },
        version: 0,
      }),
    )
  })
  await page.reload()
  await expectConnectScreen(page)
  await expect(page.getByRole('alert')).toBeHidden()
  expect(indexer.authChecks()).toBe(0)
})

test('a failed storage engine load offers only a reload', async ({ page }) => {
  // A truncated module fails to compile, without the network error Chrome
  // would log for a blocked request.
  await page.route('**/*.wasm', (route) =>
    route.fulfill({ status: 200, contentType: 'application/wasm', body: '' }),
  )
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Could not load')
  await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start over' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Connect' })).toBeHidden()
})
