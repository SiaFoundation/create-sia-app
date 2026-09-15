---
default: minor
---

The connection flow in new apps is one state machine in the auth store, with the screens rendering its state. A returning user whose reconnect fails can reload or start over, a saved key the indexer rejects is forgotten, a failed WASM load says to reload, and the app's own address is sent as the service URL.
