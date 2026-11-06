# Better Inventory Editor

A browser-based CS:GO Legacy inventory and profile editor for the file format used by [mikkokko/csgo_gc](https://github.com/mikkokko/csgo_gc).

## Run locally

- Install Node.js 20 or newer.
- Run `npm install`.
- Run `npm run dev`.
- Run `npm test` for parser/protocol tests.
- Run `npm run build` for a production build in `dist/`.

## Deploy to Vercel

Import this repository into Vercel and use:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

Every push to `main` will trigger a new Vercel deployment if the repository is connected.

## Inventory editor

- Import `inventory.txt` locally.
- Search and filter the built-in starter item catalogue by category.
- Add known items or enter a custom definition index.
- Edit inventory, quality, rarity, level, flags, origin, in-use state, attributes and equipped-state entries.
- Edit default equipment assignments.
- Export a new `inventory.txt` without uploading the source file.
- Preserve unedited/unknown KeyValues fields from the imported inventory.

The built-in catalogue is a starter list, not a complete official item schema. For a much broader catalogue, open **Settings** and load `items_game.txt` from your CS:GO Legacy installation. Optionally load `csgo_english.txt` to resolve localized item names. The schema is parsed locally in your browser. Paint-kit definitions are read from the same schema and can be used when creating items. You can also optionally load the reference editor's `icons.json` manifest to show Steam CDN artwork for supported definitions and paint variants: [icons.json](https://github.com/mikkokko/csgo_invedit/blob/master/icons.json).

## Player and GC configuration

Load `config.txt` to edit the options supported by the original project:

- Competitive, Wingman and Danger Zone ranks/wins
- Player level and XP
- Commendations and VAC status
- Country and currency
- Rarity weights
- Used-item cleanup, App ID override, server-browser filtering, logging, schema path and editor Origin

Unknown config entries are retained. If config changes are made, export and replace **both** `inventory.txt` and `config.txt`.

## Live GC connection

The editor implements protocol v1 for the local WebSocket endpoint `ws://127.0.0.1:13001`.

In your local `csgo_gc` `config.txt`, set the exact website Origin:

```text
"inventory_editor_origin" "https://your-project.vercel.app"
```

Restart the GC after changing the setting. The GC validates the Origin and binds its server to loopback. The browser editor receives an inventory snapshot and can send create, modify and destroy commands. Creates/deletes are treated as pending until the GC confirms them; uncertain requests are not silently retried.

**Browser security caveat:** some browsers may block a hosted HTTPS page from opening a local insecure WebSocket because of mixed-content or local-network access protections. Test the target browser. If it blocks the connection, use offline editing or a local secure bridge. This is not controlled by Vercel.

## Privacy and safety

- Inventory, config and schema files are read locally in the browser.
- No account, database or application backend is used.
- Keep backups of your original files and test exports before using them in-game.
- The editor does not modify your game installation directly.
