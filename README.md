# ShadowPanther Classic

A modern reskin of the classic Rogue data tables from ShadowPanther.net – rebuilt
for private use so the huge charts are enjoyable again on today's screens.

**Live:** https://manikarov.github.io/shadowpanther/

## Credits

All the data, gear ratings and leveling guides originally come from **ShadowPanther**
and his site <https://shadowpanther.net/>. The work of collecting all these weapons,
armor pieces, enchantments and profession routes and maintaining them over years is
entirely his – only the frontend was modernized here. If the content helps you: the
credit belongs to the original site, go check it out.

## What the site does

- **Gear charts** for weapons, daggers, fists, maces, swords, armor and
  enchantments. PVP and PVE values are merged into a single table.
- **Sort** by any column (AEP, DPS, damage, stats …) and **filter** via column
  groups and search.
- **Wowhead links** and rarity colors per item.
- **Powerleveling guides** for Blacksmithing, Leatherworking and Engineering,
  each as a materials list plus a step-by-step route.

## How it's built

The old pages are saved as HTML in `old/`. Python scripts in `scripts/` parse them
into JSON:

- `parse_table.py` – the gear charts
- `merge_pvp_pve.py` – merges the PVP and PVE variants
- `parse_guides.py` – the three profession guides

The frontend lives in `web/` (Vite + React + TypeScript). `sync-data.mjs` copies
the JSON and assets into `web/public/`.

## Running locally

```bash
cd web
npm install
node scripts/sync-data.mjs   # copy data + assets into public/
npm run dev
```

A push to `main` automatically builds and deploys to GitHub Pages.
