import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useState } from "react";
import { DataTable } from "../components/DataTable";
import { ItemName } from "../components/ItemName";
import { LevelSectionNav } from "../components/LevelSectionNav";
import { TableToolbar, useTableControls } from "../components/TableToolbar";
import type { ChartConfig } from "../config/charts";
import { COLUMN_INFO } from "../config/glossary";
import { type ColumnWidth, formatCell, hasValueFilter, nullsLastSort } from "../lib/table";
import type { CellValue, ChartData, ItemRecord } from "../types";

const META_KEYS = new Set(["name", "itemId", "wowheadUrl", "rarityColor"]);

// Spell out the terse single-letter headers that the original charts used.
const HEADER_LABELS: Record<string, string> = { H: "Hand", T: "Type", B: "B/PoE" };

// Expand coded cell values into readable labels (the header still keys tooltips
// and glossary lookups by its original id).
const VALUE_LABELS: Record<string, Record<string, string>> = {
  H: { M: "Main-H", O: "One-H", F: "Off-H" },
};

function displayValue(key: string, value: unknown): string {
  const map = VALUE_LABELS[key];
  if (map && typeof value === "string" && map[value]) return map[value];
  return formatCell(value as CellValue);
}

function buildColumns(
  rows: ItemRecord[],
  config: Pick<ChartConfig, "fallbackIcon" | "hideRarity">,
): ColumnDef<ItemRecord, any>[] {
  const dataKeys = Object.keys(rows[0]).filter((k) => !META_KEYS.has(k));

  const nameColumn: ColumnDef<ItemRecord, any> = {
    id: "name",
    header: "Item",
    accessorFn: (row) => row.name,
    cell: ({ row }) => (
      <ItemName
        item={row.original}
        fallbackIcon={config.fallbackIcon}
        showRarity={!config.hideRarity}
      />
    ),
    sortingFn: "alphanumeric",
  };

  const dataColumns: ColumnDef<ItemRecord, any>[] = dataKeys.map((key) => ({
    id: key,
    header: HEADER_LABELS[key] ?? key,
    accessorFn: (row) => row[key],
    cell: (info) => displayValue(key, info.getValue()),
    sortingFn: nullsLastSort,
    filterFn: hasValueFilter,
  }));

  return [nameColumn, ...dataColumns];
}

// A column is right-aligned/numeric-styled only if every value it holds is a
// plain number - text like "17%" or "<1%" (still a "number-ish" column to a
// human) stays left-aligned since it's stored as a string.
function numericColumnIds(rows: ItemRecord[]): Set<string> {
  const keys = Object.keys(rows[0]).filter((k) => !META_KEYS.has(k));
  const ids = new Set<string>();
  for (const key of keys) {
    if (rows.every((r) => r[key] === null || typeof r[key] === "number")) {
      ids.add(key);
    }
  }
  return ids;
}

// With many columns active at once, splitting width evenly would force even
// one-letter columns (H, T, B) and long ones (Source, Special) to the same
// width, wrapping short values mid-character. Size each column by how long
// its actual content gets instead, so only genuinely long text columns wrap.
function columnWidths(rows: ItemRecord[]): Record<string, ColumnWidth> {
  const keys = Object.keys(rows[0]).filter((k) => !META_KEYS.has(k));
  const widths: Record<string, ColumnWidth> = {};
  for (const key of keys) {
    const headerLen = (HEADER_LABELS[key] ?? key).length;
    const maxLen = Math.max(headerLen, ...rows.map((r) => displayValue(key, r[key]).length));
    widths[key] = maxLen <= 3 ? "narrow" : maxLen <= 6 ? "medium" : "wide";
  }
  return widths;
}

// Within a metric cluster (AEP/MAEP…) the first column stays right-aligned and
// the rest flip to left-aligned, so the numbers meet at the shared border and
// read as a tight pair – without forcing a too-narrow width that overflows.
function leftAlignedMetrics(tight?: string[]): Set<string> {
  return new Set((tight ?? []).slice(1));
}

const sectionId = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Section keys are abbreviated ("MH Swords"); spell out the slot so the split is
// self-explanatory and the off-hand table isn't mistaken for a duplicate. The
// faction prefix comes off instead - the toggle above already says which one.
function sectionLabel(name: string): string {
  return name
    .replace(/^MH /, "Main-Hand ")
    .replace(/^OH /, "Off-Hand ")
    .replace(FACTION_PREFIX_RE, "");
}

const HAND_SPLIT_RE = /^(MH|OH) /;

const FACTIONS = ["Alliance", "Horde"] as const;
type Faction = (typeof FACTIONS)[number];
const FACTION_PREFIX_RE = /^(Alliance|Horde) /;

export function ChartPage({ config }: { config: ChartConfig }) {
  const [data, setData] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faction, setFaction] = useState<Faction>("Alliance");
  // Charts split into many small tables drive them all from one toolbar; the
  // per-table match counts come back from the tables so empty ones can go away.
  const shared = config.levelSections;
  const controls = useTableControls(config.defaultGroups);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const reportCount = useCallback((key: string, count: number) => {
    setCounts((prev) => (prev[key] === count ? prev : { ...prev, [key]: count }));
  }, []);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(config.dataUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(String(err)));
  }, [config.dataUrl]);

  if (error) return <p className="error">Failed to load data: {error}</p>;
  if (!data) return <p className="loading">Loading…</p>;

  const allSections = Object.entries(data);
  // One faction's tables at a time - both stacked would be a page twice as long
  // with two of every section.
  const sections = config.factionTabs
    ? allSections.filter(([s]) => s.startsWith(`${faction} `))
    : allSections;
  const hasHandSplit = sections.length > 1 && sections.some(([s]) => HAND_SPLIT_RE.test(s));
  const valueFilters = config.specialColumn
    ? [{ columnId: config.specialColumn, label: `Only with ${config.specialColumn}` }]
    : undefined;

  return (
    <div className={shared ? "page page-shared-toolbar" : "page"}>
      <p className="eyebrow">ShadowPanther Classic</p>
      <h1>{config.label}</h1>
      {config.factionTabs && (
        <div className="faction-tabs" role="tablist" aria-label="Faction">
          {FACTIONS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={faction === name}
              className="faction-tab"
              data-faction={name.toLowerCase()}
              onClick={() => setFaction(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {config.levelSections ? (
        <LevelSectionNav
          sections={sections.map(([section, rows]) => ({
            id: sectionId(section),
            label: sectionLabel(section),
            count: rows.length,
          }))}
        />
      ) : (
        sections.length > 1 && (
          <nav className="section-nav" aria-label="Jump to a table">
            {sections.map(([section, rows]) => (
              <a key={section} href={`#${sectionId(section)}`} className="section-pill">
                {sectionLabel(section)}
                <span className="section-pill-count">{rows.length}</span>
              </a>
            ))}
          </nav>
        )
      )}
      {hasHandSplit && (
        <p className="section-note">
          Each weapon is listed once per slot it can fill. The same weapon is worth less in the
          off-hand, so its AEP/MAEP differ between the tables below.
        </p>
      )}
      {shared && (
        <TableToolbar
          controls={controls}
          columnGroups={config.columnGroups.groups}
          hasValueFilters={valueFilters}
          rowCount={sections.reduce((sum, [s]) => sum + (counts[s] ?? 0), 0)}
        />
      )}
      {sections.map(([section, rows]) => (
        <section
          key={section}
          id={sectionId(section)}
          className="chart-section"
          // A search across a dozen tables would otherwise leave a page of
          // headings each reading "No matches".
          hidden={shared && counts[section] === 0}
        >
          <h2>{sectionLabel(section)}</h2>
          <DataTable
            data={rows}
            columns={buildColumns(rows, config)}
            numericColumns={numericColumnIds(rows)}
            leftAlign={leftAlignedMetrics(config.tightColumns)}
            columnWidths={columnWidths(rows)}
            initialSort={[{ id: "AEP", desc: true }]}
            columnGroups={config.columnGroups.groups}
            defaultGroups={config.defaultGroups}
            gapBefore={config.gapBefore ? new Set(config.gapBefore) : undefined}
            descriptions={COLUMN_INFO}
            formatValue={displayValue}
            hasValueFilters={valueFilters}
            controls={shared ? controls : undefined}
            countKey={shared ? section : undefined}
            onRowCount={reportCount}
          />
        </section>
      ))}
    </div>
  );
}
