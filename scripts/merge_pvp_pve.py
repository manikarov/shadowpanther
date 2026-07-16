"""
Merge a "-pvp.json" and "-pve.json" pair (parsed chart pages) into a single
deduped dataset. The two source pages are the same underlying item pool
scored two ways (AEP = PVP weighting, MAEP = PVE weighting) and lightly
curated per context, so items don't always appear in both files.

Merge key is (name, itemId) together - neither alone is safe. Old-style
random-enchant items (e.g. "... of the Monkey" / "... of the Tiger" /
"... of Power") share ONE itemId across all their suffix rolls, so itemId
alone would collapse distinct items into one. Conversely a handful of
items (Classic vs. SoD-rune reprints, e.g. "Lifeforce Dirk") share a name
across two different itemIds, so name alone isn't safe either. Only when
both match is it truly the same row appearing in both source files.

Usage: python merge_pvp_pve.py <pvp.json> <pve.json> <output.json>
"""
import json
import sys
from pathlib import Path


def item_key(record):
    return (record.get("name"), record.get("itemId"))


def merge_record(pvp_record, pve_record):
    if pvp_record is None:
        return pve_record
    if pve_record is None:
        return pvp_record
    merged = dict(pvp_record)
    for key, value in pve_record.items():
        if merged.get(key) is None and value is not None:
            merged[key] = value
    return merged


def merge(pvp_path, pve_path):
    pvp = json.loads(Path(pvp_path).read_text(encoding="utf-8"))
    pve = json.loads(Path(pve_path).read_text(encoding="utf-8"))

    sections = {}
    for section in dict.fromkeys([*pvp.keys(), *pve.keys()]):
        by_key = {}
        order = []
        for record in pvp.get(section, []):
            k = item_key(record)
            if k not in by_key:
                order.append(k)
            by_key[k] = record
        for record in pve.get(section, []):
            k = item_key(record)
            if k in by_key:
                by_key[k] = merge_record(by_key[k], record)
            else:
                by_key[k] = record
                order.append(k)
        sections[section] = [by_key[k] for k in order]

    return sections


def main():
    if len(sys.argv) != 4:
        print("Usage: python merge_pvp_pve.py <pvp.json> <pve.json> <output.json>")
        sys.exit(1)

    pvp_path, pve_path, out_path = sys.argv[1:4]
    sections = merge(pvp_path, pve_path)

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(sections, ensure_ascii=False, indent=2), encoding="utf-8")

    for name, rows in sections.items():
        print(f"{name}: {len(rows)} rows")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
