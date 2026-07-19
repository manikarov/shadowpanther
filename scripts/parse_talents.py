"""Parse the saved Wowhead talent-calculator page into data/talents-rogue.json.

The guide page in old/ embeds six fully-rendered talent calculators. Their markup
carries everything needed to redraw the trees ourselves: each talent's position
in the 4-column grid, its maximum rank, icon, spell link and - when locked - its
requirement text. The dependency arrows are separate elements with their own
direction and length.

Talents are keyed by (tree, row, col), which is stable across the six calculators;
the per-calculator point distributions become the builds we display. Names and
descriptions are fetched from Wowhead's tooltip API and cached, so re-runs are
offline and deterministic.

Usage: python parse_talents.py
"""

import json
import re
import time
import urllib.error
import urllib.request
from html import unescape
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "old" / "Rogue DPS Talents & Builds Guide – WoW Classic - Wowhead.htm"
DATA = ROOT / "data"
OUT = DATA / "talents-rogue.json"
CACHE = DATA / "talent-spells.json"
ICON_DIR = ROOT / "assets" / "icons" / "talents"
BG_DIR = ROOT / "assets" / "icons" / "talent-backgrounds"

TOOLTIP_URL = "https://nether.wowhead.com/classic/tooltip/spell/{}"
IMAGE_URL = "https://wow.zamimg.com/images/wow/icons/large/{}.jpg"
BACKGROUND_URL = "https://wow.zamimg.com/images/wow/talents/backgrounds/classic/{}.jpg"
HEADERS = {"User-Agent": "Mozilla/5.0 (ShadowPanther reskin talent parser)"}

# The six calculators, keyed by the build code in their "Link" button. Wowhead
# renders them without machine-readable titles, so the names and the page each
# belongs to are recorded here rather than scraped out of the surrounding prose.
BUILDS = {
    "005323105-3210052020050150231": ("combat", "Combat Swords", "The default raid build. Sword Specialization and Weapon Expertise carry it."),
    "005023104-3203052020550100201-05": ("combat", "Combat Daggers", "Same shell, Dagger Specialization instead - take it when your daggers beat your swords."),
    "005323123-0240052020050150231": ("combat", "Combat Expose Armor", "Raid-utility variant: trades personal damage for Improved Expose Armor."),
    "305320115001-3-500253000332121": ("subtlety", "Cold Blood Hemorrhage", "The classic PvP burst build - Cold Blood into a critical Eviscerate."),
    "005320105-320302002-05024303030012": ("subtlety", "Improved Sprint Backstab", "PvP build built around staying on the target with Improved Sprint."),
    "0053201-3203032022-05024303030012": ("subtlety", "Improved Sprint with Improved Kick", "Same idea, trading damage for a guaranteed 2-second silence."),
}

TREE_KEYS = {"Assassination": "assassination", "Combat": "combat", "Subtlety": "subtlety"}

ICON_RE = re.compile(r"icons/(?:medium|large)/([a-z0-9_]+)\.jpg")
SPELL_RE = re.compile(r"spell=(\d+)/([a-z0-9-]+)")


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


# Tooltip lines that are metadata rather than the talent's effect text.
META_LINE = re.compile(
    r"^(Talent|Instant|Passive|Next melee|Melee Range|Channeled"
    r"|\d+(\.\d+)? (sec|min|hour) (cast|cooldown)"
    r"|\d+ (Energy|yd range)"
    r"|Requires .*|Rank \d+|\(.*\))$"
)


def spell_info(spell_id: int) -> dict:
    """Name and plain-text effect description for a talent rank."""
    data = get_json(TOOLTIP_URL.format(spell_id))
    tip = unescape(re.sub(r"<[^>]+>", "\n", data.get("tooltip", "")))
    lines = [l.strip() for l in tip.split("\n") if l.strip()]
    name = data.get("name") or ""
    # Drop the repeated name and the cast-time/cost/requirement lines; what is
    # left is the effect text.
    body = [l for l in lines if l != name and not META_LINE.match(l)]
    # Tooltips pad sentences with non-breaking spaces; collapse all whitespace.
    description = re.sub(r"\s+", " ", " ".join(body).replace("\xa0", " ")).strip()
    return {"name": name, "description": description}


def download(url: str, dest: Path) -> None:
    if dest.exists():
        return
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        dest.write_bytes(resp.read())


def download_icon(icon: str) -> None:
    download(IMAGE_URL.format(icon), ICON_DIR / f"{icon}.jpg")


def arrow_direction(classes: list[str]) -> str:
    for c in classes:
        if c.startswith("ctc-tree-talent-arrow-"):
            return c[len("ctc-tree-talent-arrow-"):]
    return "down"


def parse():
    soup = BeautifulSoup(SOURCE.read_text(encoding="utf-8", errors="replace"), "lxml")
    calcs = soup.select("div.ctc-main")

    trees: dict[str, dict] = {}
    builds: list[dict] = []

    for calc in calcs:
        link = calc.select_one(".ctc-main-status-link a")
        code = link["href"].rsplit("/", 1)[-1] if link else None
        points: dict[str, dict[str, int]] = {}

        for tree_el in calc.select("div.ctc-tree"):
            label = tree_el.select_one(".ctc-tree-header b").get_text(strip=True)
            key = TREE_KEYS[label]
            tree = trees.setdefault(
                key,
                {"key": key, "name": label, "specId": tree_el.get("data-spec-id"), "talents": {}, "arrows": {}},
            )

            for el in tree_el.select(".ctc-tree-talent"):
                row, col = int(el["data-row"]), int(el["data-col"])
                anchor = el.select_one("a[href*=spell]")
                icon_el = el.select_one("ins")
                m = SPELL_RE.search(anchor["href"])
                icon_m = ICON_RE.search(icon_el.get("style") or "")
                slug = m.group(2)
                spell_id = int(m.group(1))

                talent = tree["talents"].setdefault(
                    (row, col),
                    {
                        "slug": slug,
                        "row": row,
                        "col": col,
                        "maxPoints": int(el["data-max-points"]),
                        "icon": icon_m.group(1) if icon_m else None,
                        "spellIds": set(),
                        "requires": None,
                    },
                )
                talent["spellIds"].add(spell_id)
                # Requirement text only renders while the talent is locked, so it
                # shows up in some calculators and not others.
                if el.get("data-error-message") and not talent["requires"]:
                    talent["requires"] = unescape(el["data-error-message"]).replace("<br>", " · ")

                points.setdefault(key, {})[slug] = int(el["data-points"])

            for el in tree_el.select(".ctc-tree-talent-arrow"):
                arrow = {
                    "direction": arrow_direction(el.get("class", [])),
                    "col": int(el["data-col"]),
                    "row": int(el["data-row"]),
                    "size": int(el["data-size"]) if el.get("data-size") else None,
                    "width": int(el["data-width"]) if el.get("data-width") else None,
                    "height": int(el["data-height"]) if el.get("data-height") else None,
                }
                tree["arrows"][el["data-talent"]] = arrow

        if code in BUILDS:
            page, name, note = BUILDS[code]
            builds.append({
                "key": re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-"),
                "name": name,
                "page": page,
                "note": note,
                "wowheadCode": code,
                "wowheadUrl": f"https://www.wowhead.com/classic/talent-calc/rogue/{code}",
                "points": points,
            })
        elif code:
            print(f"  ! unbekannter build-code, uebersprungen: {code}")

    return trees, builds


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    BG_DIR.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    trees, builds = parse()
    print(f"{len(trees)} baeume, {sum(len(t['talents']) for t in trees.values())} talente, {len(builds)} builds")

    # Resolve names/descriptions from the highest rank seen for each talent.
    todo = []
    for tree in trees.values():
        for talent in tree["talents"].values():
            talent["spellId"] = max(talent["spellIds"])
            if str(talent["spellId"]) not in cache:
                todo.append(talent["spellId"])
    print(f"{len(todo)} spell-tooltips zu laden")

    for n, spell_id in enumerate(sorted(set(todo)), 1):
        try:
            cache[str(spell_id)] = spell_info(spell_id)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            print(f"  ! spell {spell_id}: {e}")
        time.sleep(0.08)
        if n % 20 == 0:
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")

    out_trees = []
    missing_icons = 0
    for key in ("assassination", "combat", "subtlety"):
        tree = trees[key]
        talents = []
        for (row, col), talent in sorted(tree["talents"].items()):
            info = cache.get(str(talent["spellId"]), {})
            if talent["icon"]:
                try:
                    download_icon(talent["icon"])
                except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
                    missing_icons += 1
            talents.append({
                "slug": talent["slug"],
                "name": info.get("name") or talent["slug"].replace("-", " ").title(),
                "row": row,
                "col": col,
                "maxPoints": talent["maxPoints"],
                "icon": talent["icon"],
                "spellId": talent["spellId"],
                "spellUrl": f"https://www.wowhead.com/classic/spell={talent['spellId']}",
                "requires": talent["requires"],
                "description": info.get("description") or "",
            })
        spec_id = tree["specId"]
        if spec_id:
            try:
                download(BACKGROUND_URL.format(spec_id), BG_DIR / f"{key}.jpg")
            except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
                print(f"  ! hintergrund {key}: {e}")
        out_trees.append({
            "key": key,
            "name": tree["name"],
            "talents": talents,
            "arrows": list(tree["arrows"].values()),
        })

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
    OUT.write_text(
        json.dumps({"class": "Rogue", "trees": out_trees, "builds": builds}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    icons = len(list(ICON_DIR.glob("*.jpg")))
    print(f"geschrieben: {OUT.name} | {icons} icons | {missing_icons} icon-fehler")


if __name__ == "__main__":
    main()
