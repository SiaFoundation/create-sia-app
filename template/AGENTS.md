# Sia Starter — AI Assistant Guide

This is a starter for apps backed by the [Sia](https://sia.tech) storage network. Read this before writing code: it contains the mental model, the canonical patterns, and the footguns. If you're about to invent a pattern that isn't here, the odds are you shouldn't.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, [`@siafoundation/sia-storage`](https://www.npmjs.com/package/@siafoundation/sia-storage). Linting with oxlint, formatting with oxfmt (no semicolons, single quotes, 2-space indent).

## Types are the source of truth

The SDK's shape lives in its `.d.ts` files — more current and precise than any prose. Before calling an unfamiliar method, read:

- `node_modules/@siafoundation/sia-storage/dist/index.d.ts` — top-level exports.
- `node_modules/@siafoundation/sia-storage/wasm/sia_storage_wasm.d.ts` — WASM-bound classes with full method signatures.

Don't hallucinate methods. If a method isn't in those files, it doesn't exist.

## Core concepts

**Indexer** — A service that coordinates storage: it tracks which hosts hold which encrypted shards, handles payments, and repairs slabs when hosts disappear. **It sees only ciphertext.** Trusted for availability and correctness of the repair/payment flow, _not_ for data privacy. The user picks one on the connect screen; `DEFAULT_INDEXER_URL` in `src/lib/constants.ts` is the suggestion.

**Hosts** — The actual storage providers. The browser talks to them directly over WebTransport for uploads and downloads. Erasure coding means any sufficient subset of hosts is enough to reconstruct a file.

**App** — Identified to the indexer by `APP_ID` (32-byte hex) + `APP_META` in `src/lib/constants.ts`. Apps are namespaces: objects stored under one `APP_ID` aren't visible to another.

**User key** — An `AppKey` instance (the SDK's name for it) derived from the user's 12-word BIP-39 recovery phrase. It's the encryption key and the indexer-auth identity for that user _within_ the app. The store keeps it as `userKeyHex` in `localStorage`, in plain text, so users don't re-enter the phrase every session; a production app should decide its own storage.

**Object** — A file or blob you upload. Represented at rest by a `PinnedObject` handle. Has an ID, a size, one or more slabs, and encrypted metadata.

**Slab / shard** — A file is split into slabs (default ~40 MB each), and each slab is erasure-coded into shards (10 data + 20 parity by default — see `DATA_SHARDS` / `PARITY_SHARDS` in `src/lib/constants.ts`). Shards are what actually ship to hosts.

**Pin** — "This object should persist." An unpinned object is transient. Always `await sdk.pinObject(obj)` after a successful upload, or the indexer will garbage-collect it.

**Metadata** — Encrypted app-defined bytes attached to an object (filename, MIME type, tags, etc.). Call `event.object.metadata()` to read, `pinnedObject.updateMetadata(bytes)` + `sdk.updateObjectMetadata(pinnedObject)` to write. Keep it under a few KB — it's a descriptor, not a payload.

## Auth flow

`src/stores/auth.ts` is the whole state machine. The screens under `src/components/auth/` render its state and call its actions; none of them talk to the indexer. Outside the store, the auth screens only call the SDK's two pure phrase helpers, in `RecoveryScreen`.

```
loading → connect → approve → recovery → connected
```

- **loading / unavailable** — `reconnect()` loads the WASM with `initSia()`; if that fails the step becomes `unavailable`, which offers only **Reload**. With a saved `userKeyHex` it calls `new Builder(indexerUrl, APP_META).connected(key)`: an `Sdk` means `connected`, `undefined` means the indexer no longer knows the key, which is dropped, and the flow goes to `connect`. A key that cannot be parsed is dropped the same way. A thrown error stays on `loading` with the message, a **Reload** button, and **Start over**.
- **connect** — The user enters an indexer URL. `connect(url)` makes a `Builder`, calls `requestConnection()`, stores it as `request`, and starts `request.waitForApproval()` right there. The result of that wait lands later and is ignored if `request` has been replaced in the meantime.
- **approve** — The user opens `approvalUrl` in another tab. When the wait resolves the step becomes `recovery`. If it rejects (denied, expired, or a failed status check) the error is shown with **Request a new link**, which is `connect(indexerUrl)` again, and **Start over**.
- **recovery** — The user generates or enters a phrase; `register(phrase)` calls `request.register()` and finishes with the `Sdk`. A registration error is shown with **Start over** only, because that request cannot register again.
- **connected** — `sdk` is set and the main UI renders. **Sign out** forgets `userKeyHex` and reloads.

`startOver()` is the way back from any failure except a failed SDK load: it drops the request, the saved key, and the error, and shows the connect screen. `busy` is true while an action is talking to the indexer; buttons disable on it and actions refuse to start, so nothing runs twice, including under React StrictMode's double effects in dev.

**Persistence**: Zustand `persist` writes `userKeyHex` and `indexerUrl` to `localStorage` under `sia-auth-<first-16-of-APP_ID>`, keyed by app so scaffolds served from the same localhost origin don't share a session. Everything else, including the live `Sdk`, is rebuilt on each page load.

## Key files

| File                                          | Role                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/constants.ts`                        | `APP_ID`, `APP_NAME`, `APP_META` (`AppMetadata`), default indexer, erasure-coding constants                                                 |
| `src/lib/errors.ts`                           | Turns SDK and indexer errors into the sentences the auth screens show                                                                       |
| `src/stores/auth.ts`                          | The connection state machine: steps, the pending request, the `Sdk`, and every action that talks to the indexer                             |
| `src/stores/toast.ts`                         | Toast notifications (auto-dismiss)                                                                                                          |
| `src/components/auth/AuthFlow.tsx`            | Starts `reconnect()` on mount and renders the screen for the current step                                                                   |
| `src/components/auth/LoadingScreen.tsx`       | The spinner, the reconnect error with **Reload** and **Start over**, and the `unavailable` screen                                           |
| `src/components/auth/ConnectScreen.tsx`       | Indexer URL input, calls `connect(url)`                                                                                                     |
| `src/components/auth/ApproveScreen.tsx`       | Shows the approval link while waiting; on failure offers **Request a new link** or **Start over**                                           |
| `src/components/auth/RecoveryScreen.tsx`      | Generate or enter a phrase, calls `register(phrase)`; on failure offers **Start over**                                                      |
| `src/components/auth/AuthCard.tsx`            | The centered layout every auth screen uses                                                                                                  |
| `src/components/Button.tsx`, `ErrorAlert.tsx` | The shared button styles and the error box                                                                                                  |
| `src/components/upload/UploadZone.tsx`        | **Reference implementation.** Full cycle: dropzone → upload → pin → metadata → list → download. Read this first when building new features. |
| `src/components/Navbar.tsx`                   | Public key + sign out                                                                                                                       |
| `src/components/DevNote.tsx`                  | Amber callout — remove or replace for production                                                                                            |
| `src/types/uint8array-hex.d.ts`               | Ambient types for TC39 `Uint8Array.{toHex,fromHex}` (drop once TS lib ships them)                                                           |

## SDK usage patterns

### Upload → pin → metadata

```ts
import { PinnedObject } from '@siafoundation/sia-storage'
import { DATA_SHARDS, PARITY_SHARDS } from '../../lib/constants'

const object = new PinnedObject()
// The returned object is the one to keep; upload() takes ownership of `object`.
const pinned = await sdk.upload(object, file.stream(), {
  dataShards: DATA_SHARDS,
  parityShards: PARITY_SHARDS,
  onShardUploaded: (p) => {
    // p: { hostKey, shardSize, shardIndex, slabIndex, elapsedMs }
    // shardSize is post-erasure-coding bytes, not source bytes.
  },
})

pinned.updateMetadata(
  new TextEncoder().encode(
    JSON.stringify({ name: file.name, type: file.type, size: file.size }),
  ),
)
await sdk.pinObject(pinned)
await sdk.updateObjectMetadata(pinned)
```

All three calls matter:

1. `upload` writes the encrypted shards to hosts.
2. `pinObject` tells the indexer to keep it (without this, it's eventually GC'd).
3. `updateObjectMetadata` persists the descriptor so other sessions can find it.

### Byte progress (source units, not on-wire units)

`onShardUploaded.shardSize` is on-wire bytes (encoded). To show a progress bar in source-file units, use `encodedSize` as the denominator:

```ts
import { encodedSize } from '@siafoundation/sia-storage'
const encodedTotal = encodedSize(file.size, DATA_SHARDS, PARITY_SHARDS)
const sourceProgress = (bytesUploaded / encodedTotal) * file.size
```

### Download

Returns a `ReadableStream<Uint8Array>`. Buffer or pipe:

```ts
const stream = sdk.download(pinnedObject)
const blob = await new Response(stream).blob()
```

### Delete

```ts
await sdk.deleteObject(objectId)
```

### Share / consume a share URL

```ts
const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const url = sdk.shareObject(pinnedObject, validUntil)
// On the recipient side (can be a different app / no auth needed):
const obj = await sdk.sharedObject(url)
const stream = sdk.download(obj)
```

Share URLs embed the decryption key in the fragment (`#...`) — never sent to the indexer.

### Pack many small files

`sdk.uploadPacked()` batches small files into shared slabs to avoid wasting storage:

```ts
const packed = sdk.uploadPacked()
await packed.add(fileA.stream())
await packed.add(fileB.stream())
for (const obj of await packed.finalize()) await sdk.pinObject(obj)
```

## Syncing with the indexer

`sdk.objectEvents(cursor, limit)` is the one sync primitive. Each `ObjectEvent` has `id`, `updatedAt: Date`, `deleted: boolean`, `object: PinnedObject | undefined`.

Cursor is `{ id: string, after: Date }`. Passing it returns events strictly after that point.

### `updatedAt` bumps

- **User actions from any device using this app key**: `updateObjectMetadata`, `deleteObject`, re-pin.
- **Indexer repairs**: when a host goes offline the indexer migrates shards to healthy hosts and bumps `updatedAt`. Your next poll picks up the repaired state automatically.

Both surface through the same stream, which is why polling `objectEvents` is the pattern every Sia app should implement.

### Cross-device sync

```ts
// Fresh session: no cursor, pull latest N.
const events = await sdk.objectEvents(undefined, 500)
events.forEach(apply)
persistCursor(latest(events))

// Periodic tick: only what changed.
const cursor = loadCursor() // { id, after: Date } or undefined
const events = await sdk.objectEvents(cursor, 200)
events.forEach(apply)
if (events.length) persistCursor(latest(events))
```

Operational tips:

- Persist the cursor in `localStorage` keyed by app key.
- Poll only while the tab is visible (`document.visibilityState === 'visible'`).
- Advance the cursor only after local merge succeeds.
- `event.deleted === true` → evict from local store.

If a specific SDK build rejects the cursor shape (edge cases with `Date` serialization happen), fall back to `undefined` + client-side filter on `event.updatedAt.getTime() > watermarkMs`.

## Gotchas

Things that look right but aren't:

- **Don't persist `Sdk` to storage.** It's a live WASM handle; `reconnect()` rebuilds it with `new Builder(url, APP_META).connected(key)` on each load.
- **Don't forget `pinObject`.** A successful `upload` that isn't pinned is a transient object — the indexer will eventually drop it.
- **Don't stuff large payloads into metadata.** It's a descriptor. Put file bytes in the object, not in metadata.
- **Don't re-bundle or wrap the WASM.** Vite dev needs `optimizeDeps: { exclude: ['@siafoundation/sia-storage'] }` (already set in `vite.config.ts`) because the SDK's `import.meta.url`-relative WASM path breaks under pre-bundling. If you add another bundler (Webpack, Rollup), check the SDK README for the equivalent.
- **A `Builder` is one connection request, and it is spent once anything fails.** `waitForApproval()` rejects when the user denies the request, when it expires, and when a single status check fails (for example a 503 from the indexer); calling it again fails with `must be in requesting_approval state`. After `register()` fails, calling it again fails with `must be in approved state`. Recovering means a new `Builder` and a new `requestConnection()`: **Request a new link** does that at once, **Start over** once the user presses Connect again.
- **Keep the connection flow's SDK calls in the store, not in effects.** `waitForApproval()` starts inside `connect()`, once per request. A component effect would run again whenever the screen remounts, and twice under React StrictMode in dev, and the second call fails. The SDK cannot cancel a wait, so its result is checked against the current `request` before it moves the flow. Reads that are safe to repeat, like `objectEvents` in `UploadZone`, are fine in an effect with a cancel flag.
- **`initSia()` remembers a failed load.** If the WASM fetch fails once, every later call rejects the same way, so the only recovery is a page reload. The loading screen offers one.
- **`onShardUploaded.shardSize` is encoded bytes, not source bytes.** If you sum it, you're measuring on-wire traffic. Use `encodedSize()` for the matching denominator, or scale to source via `(bytes / encodedTotal) * file.size`.
- **Numeric types differ on Node vs browser.** Browser uses `number` (~9 PB safe); Node uses `bigint`. Template is browser-only, so `number` is correct here.
- **Sign out forgets the key and reloads.** `signOut()` clears `userKeyHex` and calls `window.location.reload()`, which is the one sure way to drop the live `Sdk` and its background work. Warn users first: without the phrase they cannot get back in.

## Extending the starter

### Swap out `UploadZone`

`src/App.tsx` renders `<UploadZone />` after auth. Replace it with your own post-auth component. Read `UploadZone.tsx` first — it shows the full upload → pin → metadata → list cycle that most apps will want to reuse in some form.

Access the SDK:

```tsx
const sdk = useAuthStore((s) => s.sdk)
if (!sdk) return null
```

### Add routes

Install `react-router-dom`. Gate routes on `step === 'connected'`; render `<AuthFlow />` otherwise.

### Add fields to file metadata

Extend the `FileMetadata` type in `UploadZone.tsx`, write the extra fields in the upload handler, read them back in `fetchFiles`. Schema is app-owned — do whatever makes sense. Just keep it small.

### Search / filter

Metadata is encrypted at rest but decrypted client-side, so once you've hydrated from `objectEvents` you can filter/sort/search it in memory like any local list. The indexer can't do this for you (it sees ciphertext) — search is always client-side.

### Multi-device updates

Implement the polling pattern from **Syncing with the indexer**. That's how uploads on one device appear on another.

### Change erasure-coding parameters

Edit `DATA_SHARDS` / `PARITY_SHARDS` in `src/lib/constants.ts`. More parity = survives more host failures at the cost of more on-wire bytes. Keep `UploadZone`'s `encodedSize()` call in sync (it already reads from the same constants).

### Change the app ID

`APP_ID` in `src/lib/constants.ts`. Generate with `crypto.getRandomValues(new Uint8Array(32)).toHex()`. **Changing it makes all previously uploaded data invisible to the app** — the app ID is the namespace.

## Commands

```bash
bun install     # Install deps
bun dev         # Vite dev server (WASM loads lazily, ~100ms)
bun run build   # tsc + Vite production build
bun run fmt     # oxfmt, rewrites files
bun run lint    # oxlint
bun run typecheck
bun run check   # format check + lint + typecheck
bun run e2e:install  # once per machine, downloads Chromium
bun run e2e     # Playwright, against the production build
```

After any substantive change, run `bun run fmt`, then `bun run check` and `bun run e2e` (which builds first) before committing.

`e2e/smoke.spec.ts` checks that the app loads to the connect screen with no console errors. Add a Playwright test in `e2e/` for each feature you build; anything that touches storage needs an approved connection, so keep the logic you can unit test pure.

Installs skip package versions published in the last three days (`bunfig.toml`), except `@siafoundation/sia-storage`. The dev server uses port 5173 and the preview server 4173, and each exits instead of moving to another port when that one is taken.
