import type { Page, Route } from '@playwright/test'

/**
 * A stand-in for the indexer's app endpoints, served through Playwright's
 * network interception so the connection flow can be tested without a real
 * account or anyone clicking approve.
 *
 * Response shapes follow the sia.storage backend. Connect returns the approval,
 * status, and register URLs plus an expiry. A denied or expired request answers
 * status checks with 404. Registration returns 204, or 403 "key has no
 * remaining uses" when the account has no app connections left. `/auth/check`
 * returns 204 for a known user key and 401 otherwise. After connecting, the SDK
 * and the upload screen read `/hosts` and `/objects`, answered with empty
 * lists. Connect bodies must carry the four required fields; request
 * signatures are not checked.
 *
 * The SDK checks status once right away and then every 5 seconds, so a change
 * made through `approvals` is picked up within one interval.
 */

// `.test` is reserved and never resolves, so nothing leaks to a real server.
export const INDEXER_URL = 'https://indexer.test'

type Approval = 'pending' | 'approved' | 'denied'

type Options = {
  // How the next connection request will be answered when its status is
  // checked. Change `approvals` for a request that already exists.
  nextApproval: Approval
  // The next request expires immediately, so the SDK gives up on its own.
  nextRequestExpired: boolean
  // The account has no app connections left, so registration is refused.
  outOfConnections: boolean
  // Whether `/auth/check` recognises the saved user key. A successful
  // registration sets it.
  knownUserKey: boolean
  // Simulated outages: the request fails at the network level.
  connectDown: boolean
  statusDown: boolean
  authCheckDown: boolean
}

export async function fakeIndexer(page: Page) {
  const options: Options = {
    nextApproval: 'pending',
    nextRequestExpired: false,
    outOfConnections: false,
    knownUserKey: false,
    connectDown: false,
    statusDown: false,
    authCheckDown: false,
  }
  const requestIds: string[] = []
  const approvals = new Map<string, Approval>()
  const statusChecks = new Map<string, number>()
  let registrations = 0
  let authChecks = 0

  function json(route: Route, body: unknown) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  }

  function fail(route: Route, status: number, message: string) {
    return route.fulfill({ status, contentType: 'text/plain', body: message })
  }

  function connect(route: Route) {
    if (options.connectDown) return route.abort('connectionfailed')
    const body = JSON.parse(route.request().postData() ?? '{}')
    for (const field of ['appID', 'name', 'description', 'serviceURL']) {
      if (!body[field]) return fail(route, 400, `${field} is required`)
    }
    const id = (requestIds.length + 1).toString(16).padStart(32, '0')
    requestIds.push(id)
    approvals.set(id, options.nextApproval)
    const expiresIn = options.nextRequestExpired ? -1 : 10 * 60_000
    return json(route, {
      responseURL: `${INDEXER_URL}/auth/connect/${id}`,
      statusURL: `${INDEXER_URL}/auth/connect/${id}/status`,
      registerURL: `${INDEXER_URL}/auth/connect/${id}/register`,
      expiration: new Date(Date.now() + expiresIn).toISOString(),
    })
  }

  function status(route: Route, id: string) {
    statusChecks.set(id, (statusChecks.get(id) ?? 0) + 1)
    if (options.statusDown) return route.abort('connectionfailed')
    switch (approvals.get(id)) {
      case 'pending':
        return json(route, { approved: false, reconnecting: false })
      case 'approved':
        return json(route, {
          approved: true,
          reconnecting: false,
          userSecret: 'ab'.repeat(32),
        })
      default:
        return fail(route, 404, 'request invalid or expired')
    }
  }

  function register(route: Route) {
    if (options.outOfConnections) {
      return fail(route, 403, 'key has no remaining uses')
    }
    registrations++
    options.knownUserKey = true
    return route.fulfill({ status: 204 })
  }

  function check(route: Route) {
    authChecks++
    if (options.authCheckDown) return route.abort('connectionfailed')
    return options.knownUserKey
      ? route.fulfill({ status: 204 })
      : fail(route, 401, 'account not found')
  }

  await page.route(`${INDEXER_URL}/**`, (route) => {
    const { pathname } = new URL(route.request().url())
    const [, id, action] =
      pathname.match(/^\/auth\/connect\/(\w+)\/(status|register)$/) ?? []
    if (pathname === '/auth/connect') return connect(route)
    if (id && action === 'status') return status(route, id)
    if (action === 'register') return register(route)
    if (pathname === '/auth/check') return check(route)
    if (pathname === '/hosts' || pathname === '/objects') return json(route, [])
    return fail(route, 404, `the fake indexer has no ${pathname}`)
  })

  return {
    options,
    approvals,
    requestIds,
    statusChecks: (id: string) => statusChecks.get(id) ?? 0,
    registrations: () => registrations,
    authChecks: () => authChecks,
  }
}
