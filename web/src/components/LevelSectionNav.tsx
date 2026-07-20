import { useState } from "react";

export interface SectionLink {
  /** Anchor target of the table. */
  id: string;
  /** Section name with the faction prefix already removed ("21-25 Daggers"). */
  label: string;
  count: number;
}

interface Group {
  name: string;
  items: (SectionLink & { range: string })[];
}

// "21-25 Daggers" -> level range + the weapon category behind it.
const LEVEL_RANGE_RE = /^(\d+)-(\d+)\s+(.+)$/;

const GROUP_ORDER = ["Swords / Maces", "Daggers"];

function categorize(rest: string): string {
  return /sword/i.test(rest) ? "Swords / Maces" : "Daggers";
}

function groupSections(sections: SectionLink[]): Group[] {
  const byName = new Map<string, Group["items"]>();
  const ungrouped: Group["items"] = [];

  for (const section of sections) {
    const match = LEVEL_RANGE_RE.exec(section.label);
    if (!match) {
      ungrouped.push({ ...section, range: section.label });
      continue;
    }
    const [, from, to, rest] = match;
    const group = categorize(rest);
    const bucket = byName.get(group) ?? [];
    bucket.push({ ...section, range: `${from}-${to}` });
    byName.set(group, bucket);
  }

  for (const items of byName.values()) {
    items.sort((a, b) => Number(a.range.split("-")[0]) - Number(b.range.split("-")[0]));
  }

  const groups = GROUP_ORDER.filter((name) => byName.has(name)).map((name) => ({
    name,
    items: byName.get(name)!,
  }));
  if (ungrouped.length) groups.push({ name: "Other", items: ungrouped });
  return groups;
}

/** Jump links for a chart split into many level brackets. Flat, all 28 of them
 *  would out-sprawl the page, so each weapon category expands on demand. */
export function LevelSectionNav({ sections }: { sections: SectionLink[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = groupSections(sections);
  const current = groups.find((g) => g.name === open);

  return (
    <nav className="level-nav" aria-label="Jump to a table">
      <div className="level-nav-tabs">
        {groups.map((group) => (
          <button
            key={group.name}
            type="button"
            className="level-nav-tab"
            aria-expanded={group.name === open}
            onClick={() => setOpen((was) => (was === group.name ? null : group.name))}
          >
            {group.name}
            <span className="section-pill-count">{group.items.length}</span>
            <span className="nav-menu-caret" aria-hidden="true" />
          </button>
        ))}
      </div>
      {current && (
        <div className="level-nav-list">
          {current.items.map((item) => (
            <a key={item.id} href={`#${item.id}`} className="section-pill">
              {item.range}
              <span className="section-pill-count">{item.count}</span>
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
