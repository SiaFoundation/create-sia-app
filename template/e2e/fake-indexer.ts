import type { Page, Route } from '@playwright/test'

/**
 * A stand-in for the indexer's app endpoints, served through Playwright's
 * network interception so auth tests need no real account and no human to
 * click approve.
 *
 * Response shapes follow the sia.storage backend: connect returns the approval,
 * status, and register URLs; a denied or expired request answers status checks
 * with 404; registration returns 204, or 403 with "key has no remaining uses"
 * when the account has no app connections left; `/auth/check` returns 204 for a
 * known app key and 401 otherwise. After registering or reconnecting, the SDK
 * and the upload screen read `/hosts` and `/objects`, answered with empty lists.
 *
 * The SDK's approval polling checks status immediately and then every few
 * seconds, so a state change on a request is seen within one poll interval.
 */

// `.test` is reserved and never resolves, so nothing leaks to a real server.
export const INDEXER_URL = 'https://indexer.test'

export type ApprovalState = 'pending' | 'approved' | 'rejected' | 'unreachable'

export async function fakeIndexer(page: Page) {
  const approvals = new Map<string, ApprovalState>()
  const statusChecks = new Map<string, number>()
  const requestIds: string[] = []
  const state = {
    connectFails: false,
    nextApproval: 'pending' as ApprovalState,
    keyExhausted: false,
    checkFails: false,
    accountExists: false,
    registrations: 0,
  }

  function fulfillJson(route: Route, body: unknown) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  }

  function fulfillError(route: Route, status: number, message: string) {
    return route.fulfill({ status, contentType: 'text/plain', body: message })
  }

  async function handleStatus(route: Route, id: string) {
    statusChecks.set(id, (statusChecks.get(id) ?? 0) + 1)
    switch (approvals.get(id)) {
      case 'pending':
        return fulfillJson(route, { approved: false, reconnecting: false })
      case 'approved':
        return fulfillJson(route, {
          approved: true,
          reconnecting: false,
          userSecret: 'ab'.repeat(32),
        })
      case 'unreachable':
        return route.abort('connectionfailed')
      default:
        return fulfillError(route, 404, 'request invalid or expired')
    }
  }

  async function handleRegister(route: Route) {
    if (state.keyExhausted) {
      return fulfillError(route, 403, 'key has no remaining uses')
    }
    state.registrations++
    state.accountExists = true
    return route.fulfill({ status: 204 })
  }

  await page.route(`${INDEXER_URL}/**`, async (route) => {
    const { pathname } = new URL(route.request().url())
    const method = route.request().method()
    const match = pathname.match(
      /^\/auth\/connect\/([0-9a-f]+)\/(status|register)$/,
    )

    if (method === 'POST' && pathname === '/auth/connect') {
      if (state.connectFails) return fulfillError(route, 503, 'unavailable')
      const id = (requestIds.length + 1).toString(16).padStart(32, '0')
      requestIds.push(id)
      approvals.set(id, state.nextApproval)
      return fulfillJson(route, {
        responseURL: `${INDEXER_URL}/auth/connect/${id}`,
        statusURL: `${INDEXER_URL}/auth/connect/${id}/status`,
        registerURL: `${INDEXER_URL}/auth/connect/${id}/register`,
        expiration: new Date(Date.now() + 10 * 60_000).toISOString(),
      })
    }
    if (match?.[2] === 'status') return handleStatus(route, match[1] ?? '')
    if (match?.[2] === 'register') return handleRegister(route)
    if (pathname === '/auth/check') {
      if (state.checkFails) return route.abort('connectionfailed')
      return state.accountExists
        ? route.fulfill({ status: 204 })
        : fulfillError(route, 401, 'account not found')
    }
    if (pathname === '/hosts' || pathname === '/objects') {
      return fulfillJson(route, [])
    }
    return fulfillError(route, 404, `fake indexer has no ${method} ${pathname}`)
  })

  return {
    state,
    requestIds,
    setApproval(id: string, approval: ApprovalState) {
      approvals.set(id, approval)
    },
    statusChecks(id: string) {
      return statusChecks.get(id) ?? 0
    },
  }
}
