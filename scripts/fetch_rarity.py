"""Set every chart row's rarity from Wowhead instead of the spreadsheet's colors.

The source pages encode rarity as a CSS color on the item name, and they do it
inconsistently: the same blue is written as `blue`, `rgb(51, 102, 255)` and
`#3366FF` across pages, and plenty of rows carry no color at all whether they're
common or just uncoloured. Anything the parser doesn't recognise falls through
to "Common", which is how rare items ended up looking white.

Rather than chase every spelling, this asks Wowhead for the item's actual
quality and writes that into `rarityColor`. Rows without an item id (enchant
effects) are left alone.

Caches in data/rarity.json, so re-runs are offline and deterministic.
Run merge_pvp_pve.py afterwards to regenerate the merged chart files.
"""

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

from fetch_icons import chart_rows

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = DATA / "rarity.json"

TOOLTIP_URL = "https://nether.wowhead.com/classic/tooltip/item/{}"
HEADERS = {"User-Agent": "Mozilla/5.0 (ShadowPanther reskin rarity fetch)"}

# Wowhead quality index -> the color name the frontend maps to a hex + label.
QUALITY = {0: "gray", 1: "white", 2: "green", 3: "blue", 4: "purple", 5: "orange"}

def chart_files() -> dict[Path, dict]:
    """Every chart file in data/, recognised by shape - see fetch_icons.chart_rows."""
    files = {}
    for f in sorted(DATA.glob("*.json")):
        if f.name.startswith("guide-"):
            continue
        data = json.loads(f.read_text(encoding="utf-8"))
        if chart_rows(data):
            files[f] = data
    return files


def fetch_quality(item_id: str) -> str | None:
    req = urllib.request.Request(TOOLTIP_URL.format(item_id), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    return QUALITY.get(payload.get("quality"))


def main() -> None:
    cache: dict[str, str] = {}
    if CACHE.exists():
        cache = json.loads(CACHE.read_text(encoding="utf-8"))

    files = chart_files()
    ids = {
        str(row["itemId"])
        for data in files.values()
        for row in chart_rows(data)
        if row.get("itemId")
    }

    todo = sorted((i for i in ids if i not in cache), key=int)
    print(f"{len(ids)} item ids, {len(cache)} cached, {len(todo)} to fetch")

    for n, item_id in enumerate(todo, 1):
        try:
            quality = fetch_quality(item_id)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            print(f"  ! {item_id} failed: {e}")
            continue
        if quality:
            cache[item_id] = quality
        if n % 100 == 0:
            CACHE.write_text(json.dumps(cache, sort_keys=True, indent=0), encoding="utf-8")
            print(f"  … {n}/{len(todo)}")
        time.sleep(0.08)

    CACHE.write_text(json.dumps(cache, sort_keys=True, indent=0), encoding="utf-8")

    changed_rows = 0
    changes: dict[tuple[str, str], set[str]] = {}
    for path, data in files.items():
        touched = False
        for row in chart_rows(data):
            item_id = str(row.get("itemId") or "")
            correct = cache.get(item_id)
            if not correct or row.get("rarityColor") == correct:
                continue
            changes.setdefault((str(row.get("rarityColor")), correct), set()).add(row["name"])
            row["rarityColor"] = correct
            changed_rows += 1
            touched = True
        if touched:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\ncorrected {changed_rows} rows:")
    for (was, now), names in sorted(changes.items(), key=lambda kv: -len(kv[1])):
        sample = ", ".join(sorted(names)[:3])
        print(f"  {was:>9} -> {now:<7} {len(names):>4} items   e.g. {sample}")


if __name__ == "__main__":
    main()
