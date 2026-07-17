import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { DataTable } from "../components/DataTable";
import { ItemName } from "../components/ItemName";
import type { ChartConfig } from "../config/charts";
import { type ColumnWidth, formatCell, hasValueFilter, nullsLastSort } from "../lib/table";
import type { ChartData, ItemRecord } from "../types";

const META_KEYS = new Set(["name", "itemId", "wowheadUrl", "rarityColor"]);

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
    header: key,
    accessorFn: (row) => row[key],
    cell: (info) => formatCell(info.getValue()),
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
function columnWidths(rows: ItemRecord[], tight?: string[]): Record<string, ColumnWidth> {
  const keys = Object.keys(rows[0]).filter((k) => !META_KEYS.has(k));
  const tightSet = new Set(tight);
  const widths: Record<string, ColumnWidth> = {};
  for (const key of keys) {
    if (tightSet.has(key)) {
      // Headline metrics (AEP/MAEP…) stay narrow so paired values read together
      // instead of drifting apart across a wide column.
      widths[key] = "narrow";
      continue;
    }
    const maxLen = Math.max(key.length, ...rows.map((r) => formatCell(r[key]).length));
    widths[key] = maxLen <= 3 ? "narrow" : maxLen <= 6 ? "medium" : "wide";
  }
  return widths;
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
            columnWidths={columnWidths(rows, config.tightColumns)}
            initialSort={[{ id: "AEP", desc: true }]}
            columnGroups={config.columnGroups.groups}
            defaultGroups={config.defaultGroups}
            gapBefore={config.gapBefore ? new Set(config.gapBefore) : undefined}
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
