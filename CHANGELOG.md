# Changelog
## 0.1.19 (2026-09-09)

### Fixes

- Scaffolded apps no longer pass `maxInflight` to uploads and downloads. The storage SDK removed that option and now adapts transfer concurrency to network conditions on its own.
- Bump @siafoundation/sia-storage to 0.0.14

## 0.1.18 (2026-05-01)

### Fixes

- Add repository metadata to package.json so npm publishes can verify provenance.

## 0.1.17 (2026-04-29)

### Fixes

- Bump @siafoundation/sia-storage to 0.0.9
