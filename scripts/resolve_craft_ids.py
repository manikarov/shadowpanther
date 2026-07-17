"""Fill in craftId / craftUrl for guide steps that the parser couldn't link.

Some guide crafts have no Wowhead link in the source (the Engineering guide came
from a spreadsheet with none at all; a few Blacksmithing/Leatherworking rows were
plain text). This resolves those by name:

  1. explicit OVERRIDES (item/spell ids the user supplied) win, then
  2. Wowhead's classic search suggestions endpoint (exact item-name match).

It writes craftId + craftUrl back into data/guide-*.json, caches every
resolution in data/craft-ids.json (so re-runs are offline + deterministic), and
downloads the icon image + records it in data/icons.json like the other icons.
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
CACHE = DATA / "craft-ids.json"
GUIDES = ["guide-blacksmithing", "guide-leatherworking", "guide-engineering"]

SEARCH_URL = "https://www.wowhead.com/classic/search/suggestions-template?q={}"
TOOLTIP_URL = "https://nether.wowhead.com/classic/tooltip/{}/{}"
IMAGE_URL = "https://wow.zamimg.com/images/wow/icons/large/{}.jpg"
HEADERS = {"User-Agent": "Mozilla/5.0 (ShadowPanther reskin craft resolver)"}

# User-supplied ids that win over search. name -> (kind, id).
OVERRIDES: dict[str, tuple[str, int]] = {
    # Blacksmithing
    "Iron Counterweight": ("item", 6043),
    "Mithril Scale Bracers": ("item", 7924),
    "Mithril Coif": ("item", 7931),
    "Imperial Plate Bracers": ("item", 12425),
    # Leatherworking
    "Light Leather": ("item", 2318),
    "Small Leather Ammo Pouch": ("item", 7279),
    "Deviate Scale Cloak": ("spell", 7953),
    "Fine Leather Boots": ("spell", 2158),
    "Dark Leather Boots": ("item", 2315),
    "Nimble Leather Gloves": ("item", 7285),
    "Hillman's Cloak": ("item", 3719),
    "Raptor Hide Belt": ("item", 4456),
    "Dusky Bracers": ("item", 7378),
    # Engineering guide typo: source says "Whirling", the item is "Whirring".
    "Whirling Bronze Gizmo": ("item", 4375),
}

WOWHEAD_ITEM = "https://www.wowhead.com/classic/item={}"
WOWHEAD_SPELL = "https://www.wowhead.com/classic/spell={}"


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def tooltip_icon(kind: str, item_id: int) -> str | None:
    data = get_json(TOOLTIP_URL.format(kind, item_id))
    icon = data.get("icon")
    return icon.lower() if icon else None


def craft_url(kind: str, item_id: int) -> str:
    return (WOWHEAD_SPELL if kind == "spell" else WOWHEAD_ITEM).format(item_id)


def clean_name(name: str) -> str:
    # Drop a trailing "(1-3)" / "(Alternative)" style annotation the parser kept.
    return re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()


def resolve_by_search(name: str) -> dict | None:
    query = clean_name(name)
    data = get_json(SEARCH_URL.format(urllib.parse.quote(query)))
    results = data.get("results", [])
    # type 3 == item; take the exact-name item.
    for r in results:
        if r.get("type") == 3 and r.get("name", "").lower() == query.lower():
            icon = (r.get("icon") or "").lower()
            return {"kind": "item", "id": r["id"], "url": craft_url("item", r["id"]), "icon": icon}
    return None


def resolve(name: str) -> dict | None:
    if name in OVERRIDES:
        kind, item_id = OVERRIDES[name]
        icon = tooltip_icon(kind, item_id)
        return {"kind": kind, "id": item_id, "url": craft_url(kind, item_id), "icon": icon}
    return resolve_by_search(name)


def download_image(icon: str) -> None:
    dest = ICON_DIR / f"{icon}.jpg"
    if dest.exists():
        return
    req = urllib.request.Request(IMAGE_URL.format(icon), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        dest.write_bytes(resp.read())


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    icons = json.loads(ICONS_MAP.read_text(encoding="utf-8")) if ICONS_MAP.exists() else {}

    # Which craft names still need resolving, across all guides.
    guides = {g: json.loads((DATA / f"{g}.json").read_text(encoding="utf-8")) for g in GUIDES}
    needed: set[str] = set()
    for data in guides.values():
        for step in data.get("steps", []):
            if step.get("craft") and not step.get("craftId"):
                needed.add(step["craft"])

    todo = sorted(n for n in needed if n not in cache)
    print(f"{len(needed)} craft names need an id, {len(cache)} cached, {len(todo)} to resolve")

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
        if info.get("icon"):
            try:
                download_image(info["icon"])
                icons[str(info["id"])] = info["icon"]
            except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
                print(f"  ! {name}: icon {info['icon']} failed ({e})")
        print(f"  + {name} -> {info['kind']}={info['id']} ({info.get('icon')})")
        time.sleep(0.1)

    # Apply cached ids back into the guide files.
    filled = 0
    for g, data in guides.items():
        changed = False
        for step in data.get("steps", []):
            name = step.get("craft")
            if name and not step.get("craftId") and name in cache:
                step["craftId"] = cache[name]["id"]
                step["craftUrl"] = cache[name]["url"]
                filled += 1
                changed = True
        if changed:
            (DATA / f"{g}.json").write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
    ICONS_MAP.write_text(json.dumps(icons, ensure_ascii=False, sort_keys=True, indent=0), encoding="utf-8")
    print(f"filled {filled} steps; {len(cache)} cached ids; {len(unresolved)} unresolved")
    if unresolved:
        print("unresolved:", ", ".join(unresolved))


if __name__ == "__main__":
    main()
