"""Parse the main-hand progression page into data/mainhand.json.

Same Excel export as the other charts, so it reuses parse_table.parse - but
this page needs two fixups the generic parser has no business making:

  * its section names carry the faction ("Alliance 21-25 Daggers"), and Excel
    left hard line breaks inside a few of them, and
  * three rows are spreadsheet annotations, not items ("HORDE", "Quest Dagger
    Drought Levels 17-34"). They carry no data at all, so they're dropped.

The sword/mace track is also reshaped. The source calls its first two brackets
"(All Weapons)" and mixes daggers into them - and into "11-15 Swords/Maces" as
well - while repeating every one of those daggers in the dagger section for the
same bracket. That makes the dagger track look like it starts at level 1 and the
sword/mace track like it starts at 11, when really both run 1-60.

So the "(All Weapons)" brackets are renamed to "Swords/Maces" and daggers are
dropped from every sword/mace section - but only where the dagger section for
that same faction and bracket already lists the item (matched on name, item id
and AEP). Anything that would otherwise vanish is kept and reported instead.

The dagger track is flattened the same way. During the quest-dagger drought
(Alliance 17-34, Horde 16-29) the source splits each bracket into a "(Drought)"
section and a "Dungeon Options" section listing the dungeon drops to fall back
on. Both are just daggers for that level range, so they're merged into one
section per bracket - matching the sword/mace track - with the qualifier gone.

Two more fixups run after the structural reshaping, on rows rather than
sections:

  * Random dungeon drops (an "Info" column that's a drop percentage, not a
    quest reward) have no faction restriction - the same boss drops the same
    item for whoever kills it. The source only ever recorded these under
    whichever faction happened to test them (e.g. Cruel Barb only under
    Alliance, Stinging Viper only under Horde), so each one is mirrored into
    the matching section of the other faction if it isn't already there.
  * The exception is a capital-city instance - Stockades (Alliance-side) and
    Ragefire Chasm (Horde-side) - which the other faction can't reasonably
    reach. Drops from those are never mirrored, and any that the source
    listed for the wrong faction anyway (Prison Shank was listed under both)
    are removed from it.

Two items Wowhead confirms as Ragefire Chasm drops but the source never
listed at all - Cursed Felblade and Chanting Blade - are added under Horde
directly, for the same reason.

The faction stays in the section name; the frontend splits the page on that
prefix to build its Alliance/Horde toggle.

Usage: python parse_mainhand.py
"""

import copy
import json
import re
from pathlib import Path

from parse_table import parse

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "old" / "mainhand.htm"
DST = ROOT / "data" / "mainhand.json"

META_KEYS = {"name", "itemId", "wowheadUrl", "rarityColor"}

ALL_WEAPONS_RE = re.compile(r"\(All Weapons\)$")
SECTION_RE = re.compile(r"^(Alliance|Horde) (\d+-\d+) (.+)$")
DUNGEON_RE = re.compile(r"Dungeon Options$")
DROUGHT_RE = re.compile(r"\s*\(Drought\)$")
PERCENT_RE = re.compile(r"^\d+(\.\d+)?%$")
SWORDS = "Swords/Maces"
DAGGER_TYPE = "D"

# Capital-city instances the opposite faction can't reasonably reach: drops
# from these never mirror across factions, and get stripped from whichever
# side the source wrongly listed them under.
FACTION_LOCKED_INSTANCES = {"Sto": "Alliance", "RFC": "Horde"}

# Items Wowhead lists as Ragefire Chasm drops that never made it into this
# page. https://www.wowhead.com/classic/item=14145, .../item=14151 (both
# "Requires Level 13", so they land in both the 11-15 and 16-20 brackets, like
# other borderline items this page already double-lists across brackets).
#
# Cursed Felblade's row is copied from data/swords.json - the source *does*
# carry it there, just never brought it into this page, so Info/Source/the
# special-value score (PVP/PVE) are the spreadsheet's own numbers, not a
# guess. Chanting Blade has no such row anywhere else, so its Info (drop %)
# comes from Wowhead's own kill-count sample, and its special-value score is
# left unset instead of invented - a linear formula can't derive it, and
# there's no spreadsheet entry to read it from.
NEW_HORDE_RFC_ITEMS = [
    {
        "name": "Cursed Felblade",
        "itemId": 14145,
        "wowheadUrl": "https://www.wowhead.com/classic/item=14145",
        "rarityColor": "green",
        "AEP": 56.83846153846154,
        "MAEP": 56.83846153846154,
        "Loc": "RFC",
        "P": 1,
        "Info": "20%",
        "Source": "Taragaman",
        "H": "M",
        "T": "S",
        "Lvl": 13,
        "B": "P",
        "Sp": 2.6,
        "Agi": None,
        "Sta": None,
        "Str": None,
        "AP": None,
        "Sk": None,
        "Crit": None,
        "Hit": None,
        "DPS": 9.038461538461538,
        "Min": 16,
        "Max": 31,
        "Avg": 23.5,
        "PVP": 1,
        "PVE": 1,
        "Special": "Reduce AP proc",
    },
    {
        "name": "Chanting Blade",
        "itemId": 14151,
        "wowheadUrl": "https://www.wowhead.com/classic/item=14151",
        "rarityColor": "green",
        "AEP": 9 + 2 * 13.5 + 1 + 1,
        "MAEP": 9 + 2 * 13.5 + 1 + 0.01,
        "Loc": "RFC",
        "P": 1,
        "Info": "40%",
        "Source": "Jergosh the Invoker",
        "H": "O",
        "T": "D",
        "Lvl": 13,
        "B": "P",
        "Sp": 1.5,
        "Agi": 1,
        "Sta": 1,
        "Str": None,
        "AP": None,
        "Sk": None,
        "Crit": None,
        "Hit": None,
        "DPS": 9,
        "Min": 9,
        "Max": 18,
        "Avg": 13.5,
        "PVP": None,
        "PVE": None,
        "Special": None,
    },
]
NEW_ITEM_BRACKETS = ["11-15", "16-20"]


def clean(text: str) -> str:
    # The Horde half writes "Sword/Maces"; unify it with the Alliance spelling.
    text = re.sub(r"\bSword/Maces\b", "Swords/Maces", text)
    return re.sub(r"\s+", " ", text).strip()


def has_data(row: dict) -> bool:
    return any(v is not None for k, v in row.items() if k not in META_KEYS)


def row_key(row: dict) -> tuple:
    return (row["name"], row["itemId"], row["AEP"])


def bracket(section: str) -> tuple[str, str] | None:
    """(faction, level range) of a section, or None if it isn't shaped that way."""
    m = SECTION_RE.match(section)
    return (m.group(1), m.group(2)) if m else None


def move_daggers(out: dict[str, list[dict]]) -> int:
    """Drop dagger rows from the sword/mace sections, where the dagger sections
    for the same bracket already carry them."""
    listed: dict[tuple[str, str], set[tuple]] = {}
    for section, rows in out.items():
        key = bracket(section)
        if key and SWORDS not in section:
            listed.setdefault(key, set()).update(row_key(r) for r in rows)

    moved = 0
    for section, rows in out.items():
        key = bracket(section)
        if not key or SWORDS not in section:
            continue
        twins = listed.get(key, set())
        kept = []
        for row in rows:
            if row["T"] != DAGGER_TYPE:
                kept.append(row)
            elif row_key(row) in twins:
                moved += 1
            else:
                print(f"  ! kept {row['name']} in {section}: no dagger section lists it")
                kept.append(row)
        out[section] = kept
    return moved


def merge_dungeon_options(out: dict[str, list[dict]]) -> int:
    """Fold each "<bracket> Dungeon Options" section into the dagger section for
    the same bracket and drop the "(Drought)" qualifier, so the dagger track is
    one section per level range like the sword/mace track."""
    extra: dict[tuple[str, str], list[dict]] = {}
    for section, rows in out.items():
        key = bracket(section)
        if key and DUNGEON_RE.search(section):
            extra.setdefault(key, []).extend(rows)

    merged: dict[str, list[dict]] = {}
    folded = 0
    for section, rows in out.items():
        if DUNGEON_RE.search(section):
            continue  # folded into the dagger section below
        # Only the dagger section of that bracket takes them, not the sword one.
        key = bracket(section) if SWORDS not in section else None
        rows = list(rows)
        seen = {row_key(r) for r in rows}
        for row in extra.get(key, []) if key else []:
            if row_key(row) in seen:
                continue  # listed as both a drought option and a dungeon drop
            seen.add(row_key(row))
            rows.append(row)
            folded += 1
        merged[DROUGHT_RE.sub("", section)] = rows

    out.clear()
    out.update(merged)
    return folded


def strip_faction_locked_drops(out: dict[str, list[dict]]) -> int:
    removed = 0
    for section, rows in out.items():
        key = bracket(section)
        if not key:
            continue
        faction = key[0]
        kept = []
        for row in rows:
            home = FACTION_LOCKED_INSTANCES.get(row.get("Loc"))
            if home and home != faction:
                removed += 1
                continue
            kept.append(row)
        out[section] = kept
    return removed


def mirror_dungeon_drops(out: dict[str, list[dict]]) -> int:
    added = 0
    for section in list(out.keys()):
        key = bracket(section)
        if not key:
            continue
        faction, rng = key
        other = "Horde" if faction == "Alliance" else "Alliance"
        rest = section[len(faction) + len(rng) + 2:]
        mirror = f"{other} {rng} {rest}"
        if mirror not in out:
            continue
        have = {r["itemId"] for r in out[mirror]}
        for row in out[section]:
            info = str(row.get("Info") or "")
            if not PERCENT_RE.match(info):
                continue  # a quest reward, not a mob drop - stays faction-bound
            if row.get("Loc") in FACTION_LOCKED_INSTANCES:
                continue
            if row["itemId"] in have:
                continue
            out[mirror].append(copy.deepcopy(row))
            have.add(row["itemId"])
            added += 1
    return added


def add_new_items(out: dict[str, list[dict]]) -> int:
    added = 0
    for item in NEW_HORDE_RFC_ITEMS:
        group = SWORDS if item["T"] != DAGGER_TYPE else "Daggers"
        for rng in NEW_ITEM_BRACKETS:
            section = f"Horde {rng} {group}"
            rows = out.setdefault(section, [])
            if any(r["itemId"] == item["itemId"] for r in rows):
                continue
            rows.append(copy.deepcopy(item))
            added += 1
    return added


def main() -> None:
    sections = parse(SRC)

    out: dict[str, list[dict]] = {}
    dropped = 0
    for section, rows in sections.items():
        kept = []
        for row in rows:
            if not has_data(row):
                dropped += 1
                continue
            row["name"] = clean(row["name"])
            kept.append(row)
        out[ALL_WEAPONS_RE.sub(SWORDS, clean(section))] = kept

    moved = move_daggers(out)
    folded = merge_dungeon_options(out)
    stripped = strip_faction_locked_drops(out)
    mirrored = mirror_dungeon_drops(out)
    inserted = add_new_items(out)

    DST.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    total = sum(len(r) for r in out.values())
    print(
        f"{len(out)} sections, {total} rows ({dropped} annotation rows dropped, "
        f"{moved} daggers left to the dagger track, {folded} dungeon options folded in, "
        f"{stripped} capital-instance drops stripped from the wrong faction, "
        f"{mirrored} dungeon drops mirrored across factions, {inserted} new items added)"
    )
    print(f"Wrote {DST}")


if __name__ == "__main__":
    main()
