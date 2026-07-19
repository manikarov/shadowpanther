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
- **AEP explainer** (`/aep`) documenting the stat weights behind the AEP and
  MAEP columns, with worked examples. The weights live in
  `web/src/config/aep.ts` and were reverse-engineered from the original
  spreadsheets; they reproduce every AEP/MAEP value in `data/` exactly.

## How it's built

The old pages are saved as HTML in `old/`. Python scripts in `scripts/` parse them
into JSON, in this order:

- `parse_table.py` – the gear charts
- `classic_only.py` – strips Season of Discovery content (see below)
- `merge_pvp_pve.py` – merges the PVP and PVE variants
- `parse_guides.py` – the three profession guides

Three more scripts fill in what the source pages don't carry. They cache every
result, so re-runs are offline and deterministic:

- `resolve_item_ids.py` – finds Wowhead item ids for chart rows the old pages
  left unlinked, by name
- `resolve_craft_ids.py` – the same for guide steps
- `fetch_icons.py` – downloads the item icons into `assets/icons/items/`

The frontend lives in `web/` (Vite + React + TypeScript). `sync-data.mjs` copies
the JSON and assets into `web/public/`.

## Classic only

ShadowPanther's later spreadsheets fold Season of Discovery into the same tables
as Classic, but this site only wants Classic as of its final phase. `classic_only.py`
removes that content between parsing and merging, so it stays gone after a reparse:

- **SoD rows** – identified by the phase column (`P` = `S`) and by the SoD item-id
  range, since a couple of rows carry a Classic phase while linking a SoD item.
- **`TAEP` and `Tank`** – Tank AEP is computable for any armor piece, but rogues
  can only tank in SoD, so the metric and the hand-set special value feeding it
  are dropped. `PVP` and `PVE` stay, because AEP and MAEP still use them.

Items that SoD reworked keep their Classic version: where both existed, the SoD
row was dropped, and three rows that existed *only* as SoD entries (Hakkari
Breastplate, Mark of Hakkar, Splinthide Shoulders) were repointed to their Classic
items with recomputed AEP/MAEP.

## Running locally

```bash
cd web
npm install
node scripts/sync-data.mjs   # copy data + assets into public/
npm run dev
```

A push to `main` automatically builds and deploys to GitHub Pages.
