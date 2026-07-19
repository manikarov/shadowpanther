"""Strip Season of Discovery content from the parsed chart files.

The source pages in old/ are ShadowPanther's later spreadsheets, which fold SoD
content into the same tables as Classic. This site only wants Classic as of its
final phase, so this step runs between parse_table.py and merge_pvp_pve.py and
removes two things:

  1. SoD rows. Marked by the phase column ("P": "S"), but two rows carry a
     Classic phase while linking a SoD item, so the SoD item-id range is
     checked as well. Every such row was verified to either be SoD-exclusive or
     to have its Classic counterpart present as a separate row.

  2. The TAEP column, and the Tank special value that feeds it. Tank AEP is
     computable for any armor piece, but it only means something in SoD, where
     rogues can tank - so the values are dropped while the items keep their
     rows. PVP and PVE stay, since AEP and MAEP still consume them.

Items that exist in both versions were handled before this step: three rows
(Hakkari Breastplate, Mark of Hakkar, Splinthide Shoulders) had only a SoD
entry and were repointed to their Classic items by hand.

Usage: python classic_only.py            (all parsed chart files)
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# Item ids at or above this are Season of Discovery reprints.
SOD_ID_FLOOR = 200000

# SoD-only metric and the hand-set special value that feeds it: rogue tanking
# doesn't exist in Classic.
DROP_COLUMNS = ["TAEP", "Tank"]


def is_sod(row: dict) -> bool:
    if row.get("P") == "S":
        return True
    item_id = row.get("itemId")
    return bool(item_id) and int(item_id) >= SOD_ID_FLOOR


def chart_files() -> list[Path]:
    return sorted(
        f for pattern in ("*-pvp.json", "*-pve.json") for f in DATA.glob(pattern)
    )


def main() -> None:
    total_rows = total_cols = 0
    for path in chart_files():
        data = json.loads(path.read_text(encoding="utf-8"))
        dropped = cleared = 0
        for section, rows in data.items():
            kept = []
            for row in rows:
                if is_sod(row):
                    dropped += 1
                    continue
                for col in DROP_COLUMNS:
                    if col in row:
                        del row[col]
                        cleared += 1
                kept.append(row)
            data[section] = kept
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        total_rows += dropped
        total_cols += cleared
        if dropped or cleared:
            print(f"  {path.name:24} {dropped:3} SoD-Zeilen entfernt, {cleared:4} Spaltenwerte gelöscht")
    cols = "/".join(DROP_COLUMNS)
    print(f"gesamt: {total_rows} Zeilen entfernt, {total_cols} Werte in {cols} gelöscht")
    print("jetzt merge_pvp_pve.py laufen lassen")


if __name__ == "__main__":
    main()
