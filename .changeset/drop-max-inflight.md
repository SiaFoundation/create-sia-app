---
default: patch
---

Scaffolded apps no longer pass `maxInflight` to uploads and downloads. The storage SDK removed that option and now adapts transfer concurrency to network conditions on its own.
