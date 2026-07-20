# Data issues — ShadowPanther Classic

*As of 2026-07-20 · Scope: the chart data in `data/`, parsed from `old/`*

Every error found while bringing the original ShadowPanther.net spreadsheets
into this project. The purpose is twofold: make it traceable **why** the data
here departs from the source in places, and keep a record of what is still open.

**Scope note:** sections 1–2 are faults or legacy in the source, section 3 is
faults in our own tooling, section 4 is open. The original site remains the
authority on content — none of this diminishes the work behind it; these are the
ordinary frictions of a dataset hand-maintained in Excel over years.

## Summary

The source is substantively very sound: the AEP/MAEP formula reproduces **every
single one** of the 418 main-hand rows, and all weapon and armor values, exactly
— remarkable for thousands of hand-maintained cells. The errors found are almost
entirely **presentation and consistency faults, not arithmetic ones**: colour
codes in three spellings, one swapped item link, rows carried twice,
faction-locked dungeon drops filed under the wrong side.

The most consequential single finding is the **rarity encoding** — 120 items
displayed as "Common" when they aren't. Fixed by no longer reading rarity from
the source's CSS colours, and taking it from Wowhead directly instead.

---

## 1. Errors in the source data

### 1.1 Rarity

| Finding | Extent | Fix |
|---|---|---|
| The same blue is encoded three ways: `blue`, `rgb(51, 102, 255)` and `#3366FF`. The parser knew only the first two, so everything else fell through to "Common" — including **Cruel Barb** | 37 items (all on the main-hand page, which uses the hex form throughout) | [`fetch_rarity.py`](scripts/fetch_rarity.py) |
| Rows with no colour at all despite not being Common — mostly ones the source never linked in the first place | 76 items (38 epic, 21 rare, 17 uncommon) | same |
| Seven items carry a colour that is set but factually wrong (below) | 7 items | same |

Rather than chase every spelling, [`fetch_rarity.py`](scripts/fetch_rarity.py)
asks Wowhead for the quality of all 1202 item ids and writes it into
`rarityColor`. Cached in `data/rarity.json`; a second run changes 0 rows.

**The seven genuine factual errors** — here the source did set a colour, just
the wrong one. All seven item ids resolve to exactly the right Wowhead entry, so
these are not swapped links:

| Item | Source says | Actually |
|---|---|---|
| Ceremonial Knife (Horde) | Uncommon | Common |
| Gnomish Battle Chicken (30m CD) | Uncommon | Common |
| Gnomish Death Ray (5m CD) | Uncommon | Common |
| Gnomish Net-o-Matic (10m CD) | Uncommon | Common |
| Mithril Mechanical Dragonling (1h) | Rare | Common |
| Sandstalker Ankleguards | Uncommon | **Rare** |
| Jagged Bone Fist | Rare | **Uncommon** |

A further 62 items went from "no value" to an explicit `white` — visually
unchanged, since they already rendered through the Common default.

### 1.2 Wrong item link

| Finding | Extent | Fix |
|---|---|---|
| **Copper Shortsword** carries Copper Mace's id on the main-hand page (2844 instead of 2847). Both rows therefore showed the same icon and the same tooltip | 6 rows | `WRONG_IDS` in [`resolve_item_ids.py`](scripts/resolve_item_ids.py) |

Confirmed against the Wowhead tooltip API: `2844` → Copper Mace, `2847` → Copper
Shortsword.

### 1.3 Faction assignment of dungeon drops

Random drops from instances carry no faction restriction — the same boss drops
the same item for whoever kills it. The source, however, only ever recorded them
under whichever faction happened to test them.

| Item | Instance | Source | Correct |
|---|---|---|---|
| Cruel Barb | Deadmines | Alliance only | both |
| Cookie's Tenderizer | Deadmines | Alliance only | both |
| Stinging Viper | Wailing Caverns | Horde only | both |
| Prison Shank | Stockades | **both** | Alliance only |

Prison Shank is the inverse case: the Stockades sit *inside* Stormwind, so they
are effectively unreachable for the Horde — yet the item was listed under both.

Rather than a list of items, the rule itself lives in
[`parse_mainhand.py`](scripts/parse_mainhand.py): a drop (recognised by a
percentage in `Info` rather than `Q` for quest) counts for both factions, unless
it comes from a **capital-city instance** — the Stockades (Alliance) and Ragefire
Chasm (Horde). Quest rewards are left alone, since the quest itself is
faction-bound. This mirrored 12 rows and removed 2.

### 1.4 Items missing entirely

| Item | Missing from | Fix |
|---|---|---|
| **Cursed Felblade** (RFC, Horde) | the main-hand page — it was present in the sword chart | [`parse_mainhand.py`](scripts/parse_mainhand.py), using the original values from `swords.json` |
| **Chanting Blade** (RFC, Horde) | every chart page | [`parse_mainhand.py`](scripts/parse_mainhand.py) + [`add_extra_items.py`](scripts/add_extra_items.py) |

Chanting Blade's AEP/MAEP are computed with the published formula
([`aep.ts`](web/src/config/aep.ts), also the `/aep` page), not estimated — the
formula was checked beforehand against the Kingsfall worked example documented
there (369.56 / 317.67, both hit exactly).

### 1.5 Rows carried twice

| Finding | Extent |
|---|---|
| Daggers appear both in the dagger sections and in the sword/mace sections of the same level bracket — the source called the latter "(All Weapons)" | 24 rows |
| **Black Menace** appears under Alliance 36-40 as both a drought option and a dungeon option — byte-identical | 1 row |

The effect of the first was misleading: the dagger track looked like it started
at level 1 and the sword/mace track like it started at 11, when in fact both run
1–60. A dagger is only removed from a sword section where the dagger section for
that same bracket already lists it (matched on name, item id and AEP); anything
else would be kept and reported.

### 1.6 Rows that aren't items

| Finding | Extent |
|---|---|
| Table annotations parsed as item rows: `HORDE` (a divider) and `Quest Dagger Drought Levels 17-34` / `16-29` | 3 rows |

Recognisable because they carry **no data value at all**.
Side effect: those rows also held the only explanation of the term "drought" —
the quest-dagger gap between levels 17–34 (Alliance) and 16–29 (Horde), where
almost no quest daggers exist. That is currently stated nowhere on the site
(see 4.4).

### 1.7 Inconsistent naming

| Finding | Extent |
|---|---|
| The Horde half writes `Sword/Maces`, the Alliance half `Swords/Maces` | 12 sections |
| Excel left hard line breaks inside section names (`Alliance 21-25 Dungeon\n  Options`) | 2 sections |
| Item names contain Excel line breaks (`Amulet\n  of Foul Warding`) | **58 items — still open, see 4.1** |

### 1.8 Unlinked item names

| Finding | Extent | Fix |
|---|---|---|
| Rows sit as plain text with no `<a>` in the source — with no item id there is no icon, so they showed the placeholder | 59 names, currently 169 rows | [`resolve_item_ids.py`](scripts/resolve_item_ids.py) |

Resolved through Wowhead's search, with `SEARCH_ALIASES` covering the
abbreviations the source used to save column width (`Lt. Comm. Leather
Shoulders`, `Advr's Shoulders of the Monkey`).

---

## 2. Season of Discovery legacy

The later spreadsheets fold SoD into the same tables as Classic. This site wants
only Classic in its final phase — [`classic_only.py`](scripts/classic_only.py)
removes that between parsing and merging, so it survives a reparse.

| Finding | Extent |
|---|---|
| SoD rows (phase `P` = `S`, plus two rows carrying a Classic phase while linking a SoD item) | 289 rows |
| `TAEP` and `Tank` values — tank AEP is computable for any armor piece, but rogues can only tank in SoD | 2984 values |

### 2.1 The "orange = SoD" false lead

The initial assumption was that SoD items were marked orange in the old tables.
**They are not:** orange is the legendary colour, and the only orange item in the
entire dataset is **Thunderfury**.

Acting on that assumption unchecked would have deleted Thunderfury and kept every
SoD item — precisely the opposite of the goal. Together with 2.2, the reason a
listing was produced before anything was deleted in that step.

### 2.2 Items that exist in both versions

`Embrace of the Lycan` is a Classic item that SoD reworked, so it must not be
deleted along with the rest. Three rows, by contrast, existed **only** as SoD
entries and were repointed by hand to their Classic counterparts (link and all
values): **Hakkari Breastplate**, **Mark of Hakkar**, **Splinthide Shoulders**.

---

## 3. Errors in our own tooling

Listed for completeness, because they surfaced as data errors:

| Finding | Symptom | Fix |
|---|---|---|
| `fetch_icons.py` told chart files from lookup caches using a **denylist**, which went stale twice (`talents-rogue.json`, later `rarity.json`) | `AttributeError: 'str' object has no attribute 'get'` | Replaced with a shape check: a chart file is `{section: [row, …]}`, anything else is recognised rather than enumerated |
| The first version of the faction mirroring appended daggers to **every** section of the same bracket, including `Swords/Maces` | Row count rose to 452 instead of the expected 418 — merging can only lower the total | Target restricted to the dagger track; a follow-up check asserts no swords section still contains `T=D` |

---

## 4. Open items

### 4.1 Line breaks in 58 item names

58 item names still carry the hard line breaks from Excel, e.g.
`"Amulet\n  of Foul Warding"`. This is invisible in the table because HTML
collapses whitespace — **but it breaks search**: search compares with
`.includes()` against the raw value, so searching the full name "amulet of foul
warding" finds nothing, while "amulet" and "of foul warding" each match on their
own.

Mostly affects `armor.json`. [`parse_mainhand.py`](scripts/parse_mainhand.py)
already normalises names; [`parse_table.py`](scripts/parse_table.py) does not do
so for the other charts. The obvious fix is to move that normalisation there —
but it then affects every chart and should be a deliberate decision.

### 4.2 Chanting Blade's drop rate

The 40% recorded comes from Wowhead's own statistics, which rest on **only 10
recorded kills** (4 of 10). That is a very thin sample; the real figure is
probably well below it. For comparison, Cursed Felblade has 9 of 83 kills.

### 4.3 Special values with no source

The "special value" score (the `PVP`/`PVE` columns) is, per
[`aep.ts`](web/src/config/aep.ts), a **hand-assigned number** no formula can
derive. For **Chanting Blade** there is no spreadsheet entry to read it from —
but the item has no proc either, so nothing is missing. For **Cursed Felblade**
(proc: −15 attack power) the original values could be taken from `swords.json`.

Related: **Skull of Impending Doom** is, per the comment in `aep.ts`, the only
item in the whole dataset whose AEP is hand-set and does not follow from the
formula.

### 4.4 The lost explanation of "drought"

See 1.6 — the level ranges of the dagger drought (Alliance 17–34, Horde 16–29)
existed only in the deleted annotation rows. Now that the drought and dungeon
sections have been merged into the ordinary level brackets, the term no longer
appears on the site at all. A footnote under the faction toggle would be the
least intrusive place, if the connection is worth explaining.

### 4.5 Chanting Blade only in the dagger chart

It was added to `daggers.json` (main hand and off hand) and to the main-hand
page. Whether it also belongs in the general `weapons.json`, which holds the
combined weapon lists, is open.

---

## Provenance

Every figure in this document is recomputed from the data, not quoted from
memory. Reproducible via, among others:

```bash
# rarity as it stood before the correction
git show 68b79df:data/armor.json > /tmp/before.json

# full pipeline run; a second run must report 0 changes
python scripts/parse_mainhand.py
python scripts/resolve_item_ids.py
python scripts/fetch_rarity.py
python scripts/fetch_icons.py
```
