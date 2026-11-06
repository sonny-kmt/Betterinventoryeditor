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

- Start with a new, empty inventory — no files are required to begin adding items.
- Or import an existing `inventory.txt` locally.
- Search and filter the bundled item catalogue by category.
- Add known items or enter a custom definition index.
- Edit inventory, quality, rarity, level, flags, origin, in-use state, attributes and equipped-state entries.
- Edit default equipment assignments.
- Export a new `inventory.txt` without uploading the source file.
- Preserve unedited/unknown KeyValues fields from the imported inventory.

The bundled catalogue is available immediately. You can create a new inventory and add supported items without importing `inventory.txt`, `items_game.txt`, or any other game file. For additional item definitions and paint-kit metadata, you may optionally load `items_game.txt` from a CS:GO Legacy installation and `csgo_english.txt` for localized names. These optional files are parsed locally in your browser. Steam CDN artwork is loaded from the bundled manifest.

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


## Legacy item catalogue and artwork

The built-in catalogue is the default source for adding supported items. An optional local `items_game.txt` import can enrich it with further item definitions, prefab metadata and paint-kit wear bounds. The schema is parsed entirely in the browser and is never uploaded.

A bundled `public/icons.json` artwork index provides real Steam CDN images for supported item definitions, paint kits, stickers, agents, cases and other inventory items. The manifest structure is based on the reference data published by [mikkokko/csgo_invedit](https://github.com/mikkokko/csgo_invedit); image files remain hosted by Steam's static CDN. The editor falls back to category artwork when an item has no matching image.

## Automatic case keys

The Add Item dialog can automatically add a matching key when a case/container is selected. The setting is enabled by default and can be switched off in **Settings**. The editor prefers a specific key whose schema name matches the case (for example, event-specific keys), then falls back to the generic CS:GO Case Key if that definition exists. It does not invent a key when no matching or generic key definition is present.

Offline mode adds both items to the local inventory export. Live mode queues the case and key as separate protocol-v1 create requests and waits for the GC to confirm each assigned item ID before sending the next request. This respects the one-pending-create flow in the current editor connection implementation.
