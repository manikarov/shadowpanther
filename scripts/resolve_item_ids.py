"""Fill in itemId / wowheadUrl for chart rows that the parser couldn't link.

A number of rows in the source pages are plain text with no <a> at all - the
original spreadsheets simply never linked them. Without an itemId they get no
icon, so they showed the placeholder. This resolves those rows by name:

  1. explicit OVERRIDES win (abbreviated names the search can't match), then
  2. Wowhead's classic search suggestions endpoint (exact item-name match).

It writes itemId + wowheadUrl back into the parsed data/<chart>-p{vp,ve}.json
files, caches every resolution in data/item-ids.json (so re-runs are offline +
deterministic), and records the icon in data/icons.json like the other icons.

Enchantment charts are skipped on purpose: their unlinked rows are enchant
effects, not items, and the frontend gives those the profession icon instead.

Run merge_pvp_pve.py afterwards to regenerate the merged chart files.
"""

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ICON_DIR = ROOT / "assets" / "icons" / "items"
ICONS_MAP = DATA / "icons.json"
CACHE = DATA / "item-ids.json"

SEARCH_URL = "https://www.wowhead.com/classic/search/suggestions-template?q={}"
IMAGE_URL = "https://wow.zamimg.com/images/wow/icons/large/{}.jpg"
WOWHEAD_ITEM = "https://www.wowhead.com/classic/item={}"
HEADERS = {"User-Agent": "Mozilla/5.0 (ShadowPanther reskin item resolver)"}

ITEM_TYPE = 3  # Wowhead's suggestion type for items.

# Rows the source linked to the wrong item -> the id it should carry. These are
# overwritten even though the row already has an id.
WRONG_IDS: dict[str, int] = {
    # The main-hand page gave it Copper Mace's id (2844), so both rows showed
    # the same icon and tooltip.
    "Copper Shortsword": 2847,
}

# Names the search can't match on its own -> the term to search for instead.
# Two kinds: abbreviations the spreadsheet used to fit the column, and
# random-suffix rolls ("... of the Monkey"), which are listed on Wowhead under
# their base item - and share its icon, which is all we need here.
SEARCH_ALIASES: dict[str, str] = {
    "Abyssal Leather Shoulders of Stri.": "Abyssal Leather Shoulders",
    "Advr's Shoulders of the Monkey": "Adventurer's Shoulders",
    "Knight-Lt. Leather Shoulders": "Knight-Lieutenant's Leather Shoulders",
    "Lt. Comm. Leather Shoulders": "Lieutenant Commander's Leather Shoulders",
    "Lt. Comm. Leather Spaulders": "Lieutenant Commander's Leather Spaulders",
    "Mighty Spaulders of the Monkey": "Mighty Spaulders",
    "Supr. Shoulders of the Monkey": "Superior Shoulders",
    "Zand. Shadow Mastery Talisman": "Zandalarian Shadow Mastery Talisman",
    "Zandalarian Shadow Talisman (3)": "Zandalarian Shadow Talisman",
}


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def normalize(name: str) -> str:
    """Collapse the line breaks Excel left inside long names."""
    return re.sub(r"\s+", " ", name).strip()


def search_term(name: str) -> str:
    if name in SEARCH_ALIASES:
        return SEARCH_ALIASES[name]
    # Drop a trailing "(60)" / "(Alliance)" annotation the chart added.
    return re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()


def pick(results: list[dict], term: str) -> dict | None:
    """Exact-name item match, preferring the original Classic item.

    Several names come back twice because Season of Discovery reprinted the
    item under a new id. The reprint carries a "subtitle" and a much higher id,
    so prefer the entry without one; fall back to the lowest id.
    """
    exact = [
        r for r in results
        if r.get("type") == ITEM_TYPE and r.get("name", "").lower() == term.lower()
    ]
    if not exact:
        return None
    classic = [r for r in exact if not r.get("subtitle")]
    return min(classic or exact, key=lambda r: r["id"])


def resolve(name: str) -> dict | None:
    term = search_term(name)
    data = get_json(SEARCH_URL.format(urllib.parse.quote(term)))
    hit = pick(data.get("results", []), term)
    if not hit:
        return None
    return {
        "id": hit["id"],
        "url": WOWHEAD_ITEM.format(hit["id"]),
        "icon": (hit.get("icon") or "").lower(),
        "matched": hit.get("name"),
    }


def download_image(icon: str) -> None:
    dest = ICON_DIR / f"{icon}.jpg"
    if dest.exists():
        return
    req = urllib.request.Request(IMAGE_URL.format(icon), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        dest.write_bytes(resp.read())


def chart_files() -> list[Path]:
    files = sorted(
        f for pattern in ("*-pvp.json", "*-pve.json")
        for f in DATA.glob(pattern)
        if "enchant" not in f.name
    )
    # mainhand isn't PVP/PVE-split, but its quest-reward rows link to the quest
    # rather than the item, so they need resolving too.
    mainhand = DATA / "mainhand.json"
    if mainhand.exists():
        files.append(mainhand)
    return files


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    icons = json.loads(ICONS_MAP.read_text(encoding="utf-8")) if ICONS_MAP.exists() else {}

    files = {f: json.loads(f.read_text(encoding="utf-8")) for f in chart_files()}
    needed: set[str] = set()
    for data in files.values():
        for section in data.values():
            for row in section:
                if row.get("name") and not row.get("itemId"):
                    needed.add(normalize(row["name"]))

    todo = sorted(n for n in needed if n not in cache)
    print(f"{len(needed)} names need an id, {len(cache)} cached, {len(todo)} to resolve")

    unresolved: list[str] = []
    for name in todo:
        try:
            info = resolve(name)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            print(f"  ! {name}: request failed ({e})")
            unresolved.append(name)
            continue
        if not info:
            print(f"  ? {name}: no exact item match")
            unresolved.append(name)
            continue
        cache[name] = info
        if info["icon"]:
            try:
                download_image(info["icon"])
                icons[str(info["id"])] = info["icon"]
            except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
                print(f"  ! {name}: icon {info['icon']} failed ({e})")
        note = "" if info["matched"] == name else f" (matched \"{info['matched']}\")"
        print(f"  + {name} -> {info['id']} {info['icon']}{note}")
        time.sleep(0.1)

    # Apply cached ids back into the parsed chart files.
    filled = corrected = 0
    for path, data in files.items():
        changed = False
        for section in data.values():
            for row in section:
                key = normalize(row.get("name") or "")
                if not key:
                    continue
                fix = WRONG_IDS.get(key)
                if fix and row.get("itemId") != fix:
                    row["itemId"] = fix
                    row["wowheadUrl"] = WOWHEAD_ITEM.format(fix)
                    corrected += 1
                    changed = True
                elif not row.get("itemId") and key in cache:
                    row["itemId"] = cache[key]["id"]
                    row["wowheadUrl"] = cache[key]["url"]
                    filled += 1
                    changed = True
        if changed:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    # Make sure every cached icon is present in the shared map, even on re-runs
    # where nothing new was fetched.
    for info in cache.values():
        if info["icon"]:
            icons[str(info["id"])] = info["icon"]

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
    ICONS_MAP.write_text(json.dumps(icons, ensure_ascii=False, sort_keys=True, indent=0), encoding="utf-8")
    print(
        f"filled {filled} rows; corrected {corrected} wrong ids; "
        f"{len(cache)} cached ids; {len(unresolved)} unresolved"
    )
    if unresolved:
        print("unresolved:", ", ".join(unresolved))


if __name__ == "__main__":
    main()
