"""Parse the three ShadowPanther powerleveling guides into ONE normalised shape.

Blacksmithing and Leatherworking are prose "route" pages: a Total-Materials list
followed by step blocks, each introduced by a small float-left table holding the
orange/yellow/green/grey skill thresholds, then `<b>range</b> <a>craft</a>
(materials) x qty` and optional milestone notes between steps.

Engineering is an Excel spreadsheet with far more detail (per-material prices,
alternate mats). We keep only the columns the other two guides also have, so all
three end up in the same table format:

    materials: [{name, qty, itemId, wowheadUrl}]
    steps:     [{range, craft, craftId, craftUrl, qty, materials, note}]

A step with an empty `craft` is a milestone/instruction row (spans the table).
"""

import json
import re
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

OLD = Path(__file__).resolve().parent.parent / "old"
OUT = Path(__file__).resolve().parent.parent / "data"

WOWHEAD_ID = re.compile(r"item=(\d+)")


def link_info(a: Tag):
    href = a.get("href", "")
    m = WOWHEAD_ID.search(href)
    item_id = int(m.group(1)) if m else None
    url = href if href.startswith("http") else None
    return a.get_text(" ", strip=True), item_id, url


# --------------------------------------------------------------------------- #
#  Blacksmithing / Leatherworking  (prose route pages)
# --------------------------------------------------------------------------- #

RANGE_RE = re.compile(r"^\(?(?:ALT|Alt)?\)?\s*(\d+\s*-\s*\d+|\d+)")
QTY_RE = re.compile(r"\bx\s*(\d+)\b", re.IGNORECASE)


def parse_prose_guide(path: Path, profession: str, cap: int):
    soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="replace"), "lxml")
    art = soup.find("div", id="article")

    materials = parse_total_materials(art, cap)
    steps = parse_prose_steps(art)
    return {"profession": profession, "skillCap": cap, "materials": materials, "steps": steps}


def parse_total_materials(art: Tag, cap: int):
    """The materials list lives inside the intro <p>: `<a>Name</a> qty <br>` runs
    between the 'Total Materials' header and the 'Recipes you should try' header."""
    text_html = str(art)
    start = text_html.find("Total Materials")
    end = text_html.find("Recipes you should")
    if end == -1:
        end = text_html.find("Step-by-Step")
    fragment = BeautifulSoup(text_html[start:end], "lxml")

    materials = []
    for a in fragment.find_all("a"):
        name, item_id, url = link_info(a)
        # The quantity is the plain text immediately following the link.
        tail = a.next_sibling
        qty = None
        while isinstance(tail, NavigableString):
            m = re.search(r"\d+", tail)
            if m:
                qty = int(m.group(0))
                break
            tail = tail.next_sibling
        if name:
            materials.append({"name": name, "qty": qty, "itemId": item_id, "wowheadUrl": url})
    return materials


def is_skill_table(node):
    return (
        isinstance(node, Tag)
        and node.name == "table"
        and "float" in (node.get("style") or "")
        and len(node.find_all("td")) == 4
    )


def parse_prose_steps(art: Tag):
    """Walk the article children after the intro <p>. Each float-left skill table
    opens a craft step whose body runs up to the next <br>; the free prose that
    follows (up to the next skill table) becomes one milestone row per paragraph."""
    children = list(art.children)
    intro_p = art.find("p")
    start = children.index(intro_p) + 1 if intro_p in children else 0

    steps = []
    i = start
    while i < len(children):
        node = children[i]
        if not is_skill_table(node):
            i += 1
            continue

        # Craft line: siblings after the table up to the first <br>.
        body = []
        j = i + 1
        while j < len(children):
            c = children[j]
            if isinstance(c, Tag) and c.name == "br":
                j += 1
                break
            body.append(c)
            j += 1
        step = build_step(body)
        if step:
            steps.append(step)

        # Milestone prose: everything up to the next skill table.
        note_nodes = []
        while j < len(children) and not is_skill_table(children[j]):
            note_nodes.append(children[j])
            j += 1
        for para in split_paragraphs(note_nodes):
            steps.append(empty_step(note=para))
        i = j
    return steps


def split_paragraphs(nodes):
    """Turn a run of inline nodes + <br>s into cleaned paragraph strings, one per
    logical line (blank lines from double <br> separate paragraphs)."""
    parts = []
    for n in nodes:
        if isinstance(n, Tag) and n.name == "br":
            parts.append("\n")
        elif isinstance(n, Tag):
            parts.append(n.get_text(" ", strip=False))
        else:
            parts.append(str(n))
    blob = "".join(parts)
    return [clean(p) for p in blob.split("\n") if clean(p)]


def build_step(body):
    """body is a list of nodes forming `<b>range</b> <a>craft</a> (mats) x qty note`.
    Alternate ("(ALT) ...") lines have no craft link and plain-text craft names."""
    links = [n for n in body if isinstance(n, Tag) and n.name == "a"]
    full = clean(
        "".join(n.get_text(" ", strip=False) if isinstance(n, Tag) else str(n) for n in body)
    )
    if not full:
        return None

    is_alt = bool(re.match(r"^\(?\s*(?:ALT|Alt)\b\)?", full))
    full = re.sub(r"^\(?\s*(?:ALT|Alt)\b\)?\s*", "", full)

    m = RANGE_RE.search(full)
    rng = clean(m.group(1)) if m else ""
    after_range = full[m.end():] if m else full

    craft = ""
    craft_id = craft_url = None
    if links:
        craft, craft_id, craft_url = link_info(links[0])
    else:
        # No wowhead link (alternates): craft = text between range and first '('.
        cm = re.match(r"\s*([^(]+?)\s*(?:\(|x\s*\d)", after_range)
        if cm:
            craft = clean(cm.group(1))

    qm = QTY_RE.search(full)
    qty = int(qm.group(1)) if qm else None

    mats = ""
    pm = re.search(r"\(([^()]*)\)", after_range)
    if pm:
        mats = clean(pm.group(1))

    note = ""
    if qm:
        tnote = clean(full[qm.end():])
        note = re.sub(r"^\(|\)$", "", tnote).strip()
    if is_alt:
        note = clean(("(Alternative) " + note).strip())

    if not rng and not craft:
        return empty_step(note=full)

    return {
        "range": rng,
        "craft": craft,
        "craftId": craft_id,
        "craftUrl": craft_url,
        "qty": qty,
        "materials": mats,
        "note": note,
    }


def empty_step(note=""):
    return {
        "range": "",
        "craft": "",
        "craftId": None,
        "craftUrl": None,
        "qty": None,
        "materials": "",
        "note": note,
    }


def clean(s: str) -> str:
    s = re.sub(r"\s+", " ", s or "").strip()
    return re.sub(r"\s+([,)])", r"\1", s)


# --------------------------------------------------------------------------- #
#  Engineering  (Excel spreadsheet)
# --------------------------------------------------------------------------- #

def cells_text(row):
    out = []
    for c in row.find_all(["td", "th"]):
        out.append((clean(c.get_text(" ", strip=True)), c.find("a")))
    return out


def parse_engineering(path: Path, cap: int):
    soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="replace"), "lxml")
    rows = soup.find("table").find_all("tr")

    # Locate the route header row (holds 'Frm' and 'Mk').
    header_idx = None
    for i, r in enumerate(rows):
        texts = [t for t, _ in cells_text(r)]
        if "Frm" in texts and "Mk" in texts:
            header_idx = i
            break

    materials = parse_eng_materials(rows, header_idx)
    steps = parse_eng_steps(rows, header_idx)
    return {"profession": "Engineering", "skillCap": cap, "materials": materials, "steps": steps}


def parse_eng_materials(rows, header_idx):
    """The 'Primary Mats' shopping list sits above the route: qty in col 6, the
    linked material name in col 7. Stops at the first row without a material."""
    materials = []
    for r in rows[:header_idx]:
        cells = cells_text(r)
        if len(cells) < 8:
            continue
        qty_text, _ = cells[6]
        name, a = cells[7]
        if not name or not a or "item=" not in (a.get("href") or ""):
            continue
        _, item_id, url = link_info(a)
        qty = int(qty_text) if qty_text.isdigit() else None
        materials.append({"name": name, "qty": qty, "itemId": item_id, "wowheadUrl": url})
    return materials


def parse_eng_steps(rows, header_idx):
    steps = []
    reached_cap = False
    for r in rows[header_idx + 1:]:
        cells = cells_text(r)
        if len(cells) < 11:
            continue
        ora, yel, gre, gra = (cells[i][0] for i in range(4))
        frm, to = cells[4][0], cells[5][0]
        mk = cells[6][0]
        item_name, item_a = cells[8]
        note = cells[30][0] if len(cells) > 30 else ""

        # Everything past skill 300 is the spreadsheet's statistical appendix
        # ("SKILL UP TABLES" with decimal skill-chance values) — not the route.
        if "." in to or item_name.upper().startswith("SKILL UP"):
            break

        if not item_name and not frm:
            continue

        # Rows with no skill-colour thresholds are "learn <rank>" trainer milestones.
        if not any([ora, yel, gre, gra]):
            if reached_cap:
                break  # optional appendix headers after the route is complete
            if item_name:
                text = f"Learn {item_name}" + (f" ({note})" if note else "")
                steps.append(empty_step(note=clean(text)))
            elif note:
                steps.append(empty_step(note=note))
            continue

        # Primary route steps carry a make-count (Mk); the gray alternate/optional
        # recipes leave it blank. Drop those to match the other guides' density.
        if not mk.isdigit():
            continue

        rng = f"{frm} - {to}" if to and to != frm else frm
        qty = int(mk)

        # Join every material group (Q + Material name) into one comma list.
        mats = []
        for base in (9, 14, 19, 24):
            if base + 1 >= len(cells):
                break
            q, _ = cells[base]
            name, _ = cells[base + 1]
            if name:
                mats.append(f"{q} {name}".strip())
        materials = ", ".join(mats)

        if to.isdigit() and int(to) >= 300:
            reached_cap = True

        craft_id = craft_url = None
        if item_a:
            _, craft_id, craft_url = link_info(item_a)  # spell= links -> id None

        steps.append({
            "range": clean(rng),
            "craft": item_name,
            "craftId": craft_id,
            "craftUrl": craft_url,
            "qty": qty,
            "materials": clean(materials),
            "note": note,
        })
    return steps


# --------------------------------------------------------------------------- #
#  main
# --------------------------------------------------------------------------- #

GUIDES = [
    ("Powerleveling Guide for Classic Blacksmithing - ShadowPanther - Classic.htm",
     "Blacksmithing", 300, "guide-blacksmithing.json"),
    ("Powerleveling Guide for Classic Leatherworking - ShadowPanther - Classic.htm",
     "Leatherworking", 300, "guide-leatherworking.json"),
]


def main():
    for filename, profession, cap, out in GUIDES:
        data = parse_prose_guide(OLD / filename, profession, cap)
        (OUT / out).write_text(json.dumps(data, indent=2), encoding="utf-8")
        print(f"{profession}: {len(data['materials'])} mats, {len(data['steps'])} steps")

    eng = parse_engineering(OLD / "Powerleveling Spreadsheet for Engineering.htm", 300)
    (OUT / "guide-engineering.json").write_text(json.dumps(eng, indent=2), encoding="utf-8")
    print(f"Engineering: {len(eng['materials'])} mats, {len(eng['steps'])} steps")


if __name__ == "__main__":
    main()
