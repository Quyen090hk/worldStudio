# World Studio

World Studio is a local-first React workspace for building fictional worlds. It
combines lore entries, relationship graphs, maps, and chronology in one browser
application.

## Features

- Rich-text entries for characters, locations, organizations, items, and events
- Interactive relationship graph with filtering and local-focus views
- Image-based maps with layers, markers, routes, and entry links
- Timeline records, eras, uncertainty, and relationship-derived ranges
- English and Simplified Chinese interfaces with light and dark themes
- Versioned workspace backup and restore, including map images

Canvas and asset-library routes are currently placeholders.

## Development

Node.js 22 and npm are recommended.

```bash
npm ci
npm run dev
```

The development server prints the local URL after startup.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

The same checks run for pushes and pull requests through GitHub Actions.

## Local data and backups

Structured workspace data is persisted in browser `localStorage`. Map images are
stored in IndexedDB. Clearing site data removes the local workspace.

Use **Settings 鈫� Workspace backup** to export a versioned JSON file. A backup
contains entries, relationships, timeline data, maps, map images, and graph
preferences. Restoring a backup validates IDs and cross-feature references
before replacing the current workspace.

## Production build

```bash
npm run build
npm run preview
```

Production assets are generated in `dist/`. Route modules and graph libraries
are split into on-demand chunks to keep the initial bundle small.
