---
default: minor
---

The CLI asks for an app ID instead of an app key, and new apps name the constant `APP_ID`. New apps also report their own origin to the indexer as the service URL; they previously sent the indexer's URL.
