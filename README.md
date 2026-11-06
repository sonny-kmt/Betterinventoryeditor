# Better Inventory Editor

A Vercel-ready browser editor for the CS:GO Legacy inventory format used by [mikkokko/csgo_gc](https://github.com/mikkokko/csgo_gc).

## Development

- Install Node.js 20 or newer.
- Run `npm install`.
- Run `npm run dev`.
- Run `npm run build` to create the production build in `dist/`.

## Vercel

Import this repository into Vercel. Use the Vite framework preset, with `npm run build` as the build command and `dist` as the output directory.

## Current functionality

- Import `inventory.txt` and optionally `config.txt` locally in the browser.
- Parse and export the KeyValues inventory format.
- Edit item definition index, quality, rarity, level, origin and flags.
- Edit the main player/profile settings represented in `examples/config.txt`.
- Connect to the local `csgo_gc` inventory editor WebSocket endpoint (protocol v1, `ws://127.0.0.1:13001`).
- Receive inventory snapshots and item create/modify/destroy notifications.
- Send item create/modify/destroy commands while connected.

## Live connection setup

In the local `csgo_gc` `config.txt`, set `inventory_editor_origin` to the exact origin of the deployed site, for example:

```text
"inventory_editor_origin" "https://your-project.vercel.app"
```

Restart the GC after changing the setting. The GC validates the WebSocket Origin and listens only on loopback at port 13001.

**Browser security caveat:** a hosted HTTPS page connecting to a local insecure WebSocket (`ws://127.0.0.1`) may be blocked by browser mixed-content or local-network access protections. Test the target browser and local setup. Offline file editing does not depend on this connection.

## Important notes

- Inventory and config files are read and written locally in the browser; this app does not upload them.
- The initial item form accepts a numeric `def_index`. A complete schema-backed searchable item catalogue, item artwork, and richer attribute/equip editors are still to be implemented.
- Profile changes are exported to `config.txt`; when that file is changed, replace both the inventory and config files as instructed by the app.
- Test exported files against a backup of your GC setup before using them in-game.
