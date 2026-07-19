"""Fetch Wowhead item icons for every itemId in the chart data.

Builds data/icons.json (itemId -> icon name) and downloads each icon image
into assets/icons/items/. Both are cached, so re-runs only fetch what's new
and the whole thing is resumable if interrupted.

Data + images come from Wowhead (nether.wowhead.com tooltip JSON, images from
wow.zamimg.com), the same source the on-page tooltips already use.
"""

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ICON_DIR = ROOT / "assets" / "icons" / "items"
MAP_FILE = DATA / "icons.json"

TOOLTIP_URL = "https://nether.wowhead.com/classic/tooltip/item/{}"
IMAGE_URL = "https://wow.zamimg.com/images/wow/icons/large/{}.jpg"
HEADERS = {"User-Agent": "Mozilla/5.0 (ShadowPanther reskin icon fetch)"}


# Lookup caches that live in data/ but aren't chart files.
NOT_CHARTS = {"icons.json", "item-ids.json", "craft-ids.json"}


def collect_item_ids() -> set[str]:
    ids: set[str] = set()
    for f in DATA.glob("*.json"):
        if f.name in NOT_CHARTS:
            continue
        data = json.loads(f.read_text(encoding="utf-8"))
        if f.name.startswith("guide-"):
            # Guides: the crafted item of each step (for the recipe icon column).
            for step in data.get("steps", []):
                if step.get("craftId"):
                    ids.add(str(step["craftId"]))
            continue
        # Chart files: one item per row.
        for section in data.values():
            for row in section:
                if row.get("itemId"):
                    ids.add(str(row["itemId"]))
    return ids


def fetch_icon_name(item_id: str) -> str | None:
    req = urllib.request.Request(TOOLTIP_URL.format(item_id), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    icon = payload.get("icon")
    return icon.lower() if icon else None


def download_image(icon: str) -> bool:
    dest = ICON_DIR / f"{icon}.jpg"
    if dest.exists():
        return True
    req = urllib.request.Request(IMAGE_URL.format(icon), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        dest.write_bytes(resp.read())
    return True


def save_map(icon_map: dict[str, str]) -> None:
    MAP_FILE.write_text(
        json.dumps(icon_map, ensure_ascii=False, sort_keys=True, indent=0),
        encoding="utf-8",
    )


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    icon_map: dict[str, str] = {}
    if MAP_FILE.exists():
        icon_map = json.loads(MAP_FILE.read_text(encoding="utf-8"))

    ids = collect_item_ids()
    todo = sorted((i for i in ids if i not in icon_map), key=int)
    print(f"{len(ids)} item ids, {len(icon_map)} cached, {len(todo)} to fetch")

    for n, item_id in enumerate(todo, 1):
        try:
            icon = fetch_icon_name(item_id)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            print(f"  ! tooltip {item_id} failed: {e}")
            continue
        if not icon:
            continue
        icon_map[item_id] = icon
        try:
            download_image(icon)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            print(f"  ! image {icon} ({item_id}) failed: {e}")
        if n % 50 == 0:
            save_map(icon_map)
            print(f"  … {n}/{len(todo)}")
        time.sleep(0.08)

    save_map(icon_map)
    # Backfill any images missing for already-mapped icons.
    missing = 0
    for icon in set(icon_map.values()):
        if not (ICON_DIR / f"{icon}.jpg").exists():
            try:
                download_image(icon)
            except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
                missing += 1
    imgs = len(list(ICON_DIR.glob("*.jpg")))
    print(f"done: {len(icon_map)} ids mapped, {imgs} images, {missing} still missing")


if __name__ == "__main__":
    main()
