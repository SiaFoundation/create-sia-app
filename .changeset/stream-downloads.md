---
default: minor
---

Downloads in generated apps stream through the SDK's service worker to the browser's download manager instead of being held in the page's memory, and fall back to reading the file in the page where the worker cannot run. Safari visitors on iCloud Private Relay, which the SDK does not work through, see a notice asking them to turn it off.
