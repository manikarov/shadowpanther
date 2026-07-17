import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { DataTable } from "../components/DataTable";
import { ItemName } from "../components/ItemName";
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

function displayValue(key: string, value: CellValue): string {
  const map = VALUE_LABELS[key];
  if (map && typeof value === "string" && map[value]) return map[value];
  return formatCell(value);
}

function buildColumns(rows: ItemRecord[]): ColumnDef<ItemRecord, any>[] {
  const dataKeys = Object.keys(rows[0]).filter((k) => !META_KEYS.has(k));

  const nameColumn: ColumnDef<ItemRecord, any> = {
    id: "name",
    header: "Item",
    accessorFn: (row) => row.name,
    cell: ({ row }) => <ItemName item={row.original} />,
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

export function ChartPage({ config }: { config: ChartConfig }) {
  const [data, setData] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="page">
      <p className="eyebrow">ShadowPanther Classic</p>
      <h1>{config.label}</h1>
      {Object.entries(data).map(([section, rows]) => (
        <section key={section} className="chart-section">
          <h2>{section}</h2>
          <DataTable
            data={rows}
            columns={buildColumns(rows)}
            numericColumns={numericColumnIds(rows)}
            leftAlign={leftAlignedMetrics(config.tightColumns)}
            columnWidths={columnWidths(rows)}
            initialSort={[{ id: "AEP", desc: true }]}
            columnGroups={config.columnGroups.groups}
            defaultGroups={config.defaultGroups}
            gapBefore={config.gapBefore ? new Set(config.gapBefore) : undefined}
            descriptions={COLUMN_INFO}
            hasValueFilters={
              config.specialColumn
                ? [{ columnId: config.specialColumn, label: `Only with ${config.specialColumn}` }]
                : undefined
            }
          />
        </section>
      ))}
    </div>
  );
}
