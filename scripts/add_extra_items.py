"""Add items that no ShadowPanther chart page ever listed, so a careful parse
of the source can't surface them either.

Chanting Blade (https://www.wowhead.com/classic/item=14151) is a real,
in-game Ragefire Chasm drop - added to the main-hand progression page by
parse_mainhand.py - but it's absent from the general dagger chart too. This
adds it there, as both a main-hand and off-hand row like every other dagger,
so it isn't only visible on the levelling page.

AEP/MAEP are computed with the formula in web/src/config/aep.ts (also the
`/aep` page), not guessed: the item has no on-hit effect, so nothing needs
the hand-assigned "special value" score that formula can't derive.

Runs after classic_only.py and before merge_pvp_pve.py, patching the split
-pve.json/-pvp.json files - the same files a real parsed row would land in -
so merge, resolve_item_ids, fetch_rarity and fetch_icons all treat it exactly
like a row the parser produced. Idempotent: matched by itemId, so re-running
after a reparse doesn't duplicate it.

Usage: python add_extra_items.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

CHANTING_BLADE_ITEM_ID = 14151

# Shared fields; AEP/MAEP/H are set per hand below.
_CHANTING_BLADE_BASE = {
    "name": "Chanting Blade",
    "itemId": CHANTING_BLADE_ITEM_ID,
    "wowheadUrl": "https://www.wowhead.com/classic/item=14151",
    "rarityColor": "green",
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
}

# Main-hand formula: 1×DPS + 2×AvgDamage + stats.
_MAIN_HAND = {**_CHANTING_BLADE_BASE, "AEP": 9 + 2 * 13.5 + 1 + 1, "MAEP": 9 + 2 * 13.5 + 1 + 0.01}
# Off-hand formula: 3×DPS + (155 − 50×Speed) + stats - no average-damage term.
_OFF_HAND_SPEED_TERM = 155 - 50 * 1.5
_OFF_HAND = {
    **_CHANTING_BLADE_BASE,
    "AEP": 3 * 9 + _OFF_HAND_SPEED_TERM + 1 + 1,
    "MAEP": 3 * 9 + _OFF_HAND_SPEED_TERM + 1 + 0.01,
}

# (chart file stem, section) -> row to ensure is present.
EXTRA_ITEMS: dict[tuple[str, str], dict] = {
    ("daggers-pve", "MH Daggers"): _MAIN_HAND,
    ("daggers-pve", "OH Daggers"): _OFF_HAND,
    ("daggers-pvp", "MH Daggers"): _MAIN_HAND,
    ("daggers-pvp", "OH Daggers"): _OFF_HAND,
}


def main() -> None:
    added = 0
    for (stem, section), row in EXTRA_ITEMS.items():
        path = DATA / f"{stem}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        rows = data.setdefault(section, [])
        if any(r["itemId"] == row["itemId"] for r in rows):
            continue
        rows.append(dict(row))
        added += 1
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"{added} rows added across {len(EXTRA_ITEMS)} (file, section) targets")


if __name__ == "__main__":
    main()
