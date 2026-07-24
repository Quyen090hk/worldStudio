# World Studio local workspace update

This incremental update adds a user-selected local workspace folder while retaining IndexedDB as the live draft and recovery fallback.

## Included

- Local folder selection and persisted permission state.
- Manual and 30-second debounced background synchronization.
- Latest portable backup plus ten timestamped recovery points.
- Human-readable Markdown mirrors grouped by entry type.
- Safe cleanup of renamed or deleted generated mirrors.
- Local sync status in Settings.
- Lazy loading so backup code does not inflate the initial route.

## Install

Extract the archive into the World Studio project root and replace files with matching paths. Then run:

```powershell
npm run lint
npm test
npm run build
npm run check:bundle
```

Use a current Chrome or Edge browser for direct folder access. Other browsers retain JSON import and export.
