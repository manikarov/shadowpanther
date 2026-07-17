import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { ColumnGroup } from "../config/charts";
import type { ColumnWidth } from "../lib/table";
import { SearchIcon } from "./icons";

export interface HasValueFilter {
  columnId: string;
  label: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  initialSort?: SortingState;
  hasValueFilters?: HasValueFilter[];
  columnGroups?: ColumnGroup[];
  numericColumns?: Set<string>;
  /** Numeric columns forced left-aligned (e.g. MAEP, so it hugs AEP as a pair). */
  leftAlign?: Set<string>;
  columnWidths?: Record<string, ColumnWidth>;
  /** Column-group labels switched on from the start. */
  defaultGroups?: string[];
  /** Columns that get extra left padding to set them off from a numeric block. */
  gapBefore?: Set<string>;
  /** Per-column hover explanations, keyed by column id. */
  descriptions?: Record<string, string>;
}

// Metadata-ish columns that stay visually muted regardless of value.
const ALWAYS_DIM_COLUMNS = new Set(["Source"]);

export function DataTable<T>({
  data,
  columns,
  initialSort,
  hasValueFilters,
  columnGroups,
  numericColumns,
  leftAlign,
  columnWidths,
  defaultGroups,
  gapBefore,
  descriptions,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  // Most groups start collapsed - "unnecessary" columns only appear once a chip
  // is switched on; a chart may opt some groups (e.g. Damage) on from the start.
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set(defaultGroups));

  const columnVisibility = useMemo<VisibilityState>(() => {
    const visibility: VisibilityState = {};
    for (const group of columnGroups ?? []) {
      const on = activeGroups.has(group.label);
      for (const columnId of group.columns) visibility[columnId] = on;
    }
    return visibility;
  }, [columnGroups, activeGroups]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function toggleHasValueFilter(columnId: string, checked: boolean) {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== columnId);
      return checked ? [...rest, { id: columnId, value: true }] : rest;
    });
  }

  function toggleGroup(label: string) {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const rowCount = table.getFilteredRowModel().rows.length;

  // Percentage widths that always sum to 100%, so the table can never
  // overflow horizontally no matter how many columns are switched on -
  // "wide" columns (Source, Special, ...) just get more of that 100% share.
  const UNITS: Record<ColumnWidth, number> = { narrow: 1, medium: 2, wide: 4 };
  const unitFor = (columnId: string) =>
    columnId === "name" ? 5 : UNITS[columnWidths?.[columnId] ?? "medium"];
  const visibleColumns = table.getVisibleLeafColumns();
  const totalUnits = visibleColumns.reduce((sum, c) => sum + unitFor(c.id), 0);
  const pctFor = (columnId: string) => `${((unitFor(columnId) / totalUnits) * 100).toFixed(3)}%`;

  return (
    <div className="data-table-wrap">
      <div className="toolbar">
        <div className="search-row">
          <div className="search-box">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
          <span className="count">{rowCount} items</span>
        </div>
        <div className="filters">
          {columnGroups && columnGroups.length > 0 && <span className="flabel">Columns</span>}
          {columnGroups?.map((group) => (
            <button
              key={group.label}
              type="button"
              className={`chip ${activeGroups.has(group.label) ? "on" : ""}`}
              onClick={() => toggleGroup(group.label)}
            >
              {group.label}
            </button>
          ))}
          {hasValueFilters?.map(({ columnId, label }) => (
            <button
              key={columnId}
              type="button"
              className={`chip ${columnFilters.some((f) => f.id === columnId) ? "on" : ""}`}
              onClick={() =>
                toggleHasValueFilter(columnId, !columnFilters.some((f) => f.id === columnId))
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <colgroup>
            {visibleColumns.map((col) => (
              <col key={col.id} style={{ width: pctFor(col.id) }} />
            ))}
          </colgroup>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isNum =
                    numericColumns?.has(header.column.id) && !leftAlign?.has(header.column.id);
                  const width = columnWidths?.[header.column.id];
                  const info = descriptions?.[header.column.id];
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={[
                        header.column.getCanSort() && "sortable",
                        isNum && "num",
                        width && `col-${width}`,
                        gapBefore?.has(header.column.id) && "col-gap",
                        info && "has-info",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="th-label">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                      {header.column.getCanSort() && (
                        <span className="arrow">
                          {{ asc: "▲", desc: "▼" }[header.column.getIsSorted() as string] ?? ""}
                        </span>
                      )}
                      {info && (
                        <span className="col-tip" role="tooltip">
                          {info}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const value = cell.getValue();
                  const isDim = value === null || ALWAYS_DIM_COLUMNS.has(cell.column.id);
                  const isNum =
                    numericColumns?.has(cell.column.id) && !leftAlign?.has(cell.column.id);
                  const width = columnWidths?.[cell.column.id];
                  return (
                    <td
                      key={cell.id}
                      className={[
                        isDim && "dim",
                        isNum && "num",
                        width && `col-${width}`,
                        gapBefore?.has(cell.column.id) && "col-gap",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rowCount === 0 && <p className="empty">No matches.</p>}
      </div>
    </div>
  );
}
