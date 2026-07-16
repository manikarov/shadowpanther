"""
Parser for ShadowPanther.net's Excel-exported chart pages ("Webseite komplett" saves).

These pages are a single big HTML table exported from Excel. Sections (e.g. "MH
Swords/Maces/Fists", "MH Daggers", "OH Weapons") are marked by a header row whose
second cell reads "AEP" - the first cell of that row is the section name, and the
following cells are the column headers for that section. Numeric cells carry an
exact `x:num` attribute from Excel, which is more precise than the rounded text
Excel displays, so it's preferred when present.

Usage: python parse_table.py <input.htm> <output.json>
"""
import json
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

WOWHEAD_ITEM_RE = re.compile(r"item=(\d+)")


NUMERIC_RE = re.compile(r"^-?\d+(\.\d+)?$")


def cell_value(td):
    """Return the best-known value for a cell: exact x:num if present, else text
    (coerced to int/float when it's plainly numeric, e.g. "60" or "2.7").

    Percentages (e.g. "17%", "<1%") are the one case where the displayed text
    beats x:num: Excel stores them as a 0-1 fraction (0.17), which would lose
    the "%" meaning if we numericized it - so keep the text as-is instead."""
    text = td.get_text(strip=True).replace("\xa0", "").strip()
    if "%" in text:
        return text or None

    if td.has_attr("x:num") and td["x:num"].strip() not in ("", "-"):
        num = td["x:num"].strip()
        try:
            f = float(num)
            return int(f) if f.is_integer() else f
        except ValueError:
            pass
    if not text:
        return None
    if NUMERIC_RE.match(text):
        f = float(text)
        return int(f) if f.is_integer() else f
    return text


def parse_name_cell(td):
    """Extract weapon/item name, wowhead item id/url, and rarity color from the first cell."""
    link = td.find("a")
    span = td.find("span")
    name = (span or link or td).get_text(strip=True)
    item_id = None
    wowhead_url = None
    if link and link.has_attr("href"):
        wowhead_url = link["href"]
        m = WOWHEAD_ITEM_RE.search(wowhead_url)
        if m:
            item_id = int(m.group(1))
    color = None
    if span and span.has_attr("style"):
        m = re.search(r"color:\s*([^;]+)", span["style"])
        if m:
            color = m.group(1).strip()
    return name, item_id, wowhead_url, color


def parse(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        soup = BeautifulSoup(f, "lxml")

    table = soup.find("table")
    rows = table.find_all("tr")

    sections = {}
    current_section = None
    columns = None

    for row in rows:
        cells = row.find_all("td")
        if not cells:
            continue

        second_text = cells[1].get_text(strip=True) if len(cells) > 1 else ""
        if second_text == "AEP":
            current_section = cells[0].get_text(strip=True)
            columns = [c.get_text(strip=True) for c in cells[1:]]
            sections[current_section] = []
            continue

        if current_section is None:
            continue  # legend/title rows before the first section

        if cells[0].has_attr("colspan"):
            continue  # footer rows (copyright, misaligned-columns spacer)

        name, item_id, wowhead_url, color = parse_name_cell(cells[0])
        if not name:
            continue

        record = {
            "name": name,
            "itemId": item_id,
            "wowheadUrl": wowhead_url,
            "rarityColor": color,
        }
        for col_name, td in zip(columns, cells[1:]):
            record[col_name] = cell_value(td)
        sections[current_section].append(record)

    return sections


def main():
    if len(sys.argv) != 3:
        print("Usage: python parse_table.py <input.htm> <output.json>")
        sys.exit(1)

    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    sections = parse(src)

    dst.parent.mkdir(parents=True, exist_ok=True)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(sections, f, ensure_ascii=False, indent=2)

    for name, rows in sections.items():
        print(f"{name}: {len(rows)} rows")
    print(f"Wrote {dst}")


if __name__ == "__main__":
    main()
