# create-sia-app

Scaffold a private, encrypted storage app on the [Sia](https://sia.tech) network. Everything is encrypted in the browser and transferred directly to Sia hosts — no proxies, no gateways, no one but the user can see their data.

## Quick Start

```bash
bunx create-sia-app
```

```
◇  What is your project name?
│  my-sia-app
│
◇  App key setup
│  Generate a new app key
│
ℹ  Generated app key: a1b2c3...
│
◇  Indexer URL
│  https://sia.storage
│
◇  App description (optional)
│  A Sia storage app
│
◇  Project created successfully
│
│  Next steps
│  cd my-sia-app
│  bun dev
│
└  Happy building!
```

## Why Sia

- **Private by default** — All data is encrypted client-side before it leaves the browser. Encryption keys are derived from the user's recovery phrase and never shared.
- **Direct host connections** — Uploads and downloads happen directly between the browser and Sia hosts over WebTransport. There is no middleman that can see or intercept data.
- **No trusted third parties** — The indexer service handles payments and trustlessly repairs data so your app doesn't need to run 24/7, but it never sees the encrypted data. It can't read, modify, or withhold your files.
- **Erasure coded** — Data is split into redundant shards across many hosts. Files survive even if individual hosts go offline.
- **Decentralized** — Storage is provided by a global network of independent hosts competing on price and performance.

## What You Get

- **Full auth flow** — connect to an indexer, approve the connection, set up a recovery phrase
- **File upload** — drag & drop files, track upload progress, list uploaded files
- **Sia SDK** — handles encryption, erasure coding, and direct host transfers in the browser
- **Developer notes** — callout boxes throughout the UI explaining how everything works (remove them when you ship)

## Tech Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Biome, sia-storage

## Learn More

- [Sia Documentation](https://docs.sia.tech)
- [sia-storage](https://www.npmjs.com/package/sia-storage)
