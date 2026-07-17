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
import { buildFieldMap, makeGlobalFilter } from "../lib/search";
import type { ColumnWidth } from "../lib/table";
import { FilterIcon, SearchIcon } from "./icons";

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
  /** How a raw cell value reads on screen; used so text search matches the display. */
  formatValue?: (columnId: string, value: unknown) => string;
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
  formatValue,
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

  // `field:value` search: resolve field names from column ids/headers and gate
  // the scoring to the first column (see makeGlobalFilter).
  const columnKey = columns.map((c) => c.id).join("|");
  const globalFilterFn = useMemo(
    () => {
      const fieldMap = buildFieldMap(columns);
      const firstColId = columns[0]?.id ?? "";
      return makeGlobalFilter<T>(fieldMap, firstColId, formatValue);
    },
    // columns are rebuilt each render; key on their stable ids.
    // formatValue is a stable module-level fn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnKey],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, columnVisibility },
    globalFilterFn,
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
              placeholder="Search… e.g. Lvl:>=40  Source:Naxx"
              title="Search a column with field:value (e.g. Lvl:60, AEP:>400, Item:Cruel Barb). Plain text searches all columns."
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
          {hasValueFilters && hasValueFilters.length > 0 && (
            <>
              <span className="filter-sep" aria-hidden="true" />
              <span className="flabel">Rows</span>
            </>
          )}
          {hasValueFilters?.map(({ columnId, label }) => (
            <button
              key={columnId}
              type="button"
              className={`chip chip-rows ${columnFilters.some((f) => f.id === columnId) ? "on" : ""}`}
              title="Row filter: hides rows without this value (not just a column toggle)"
              onClick={() =>
                toggleHasValueFilter(columnId, !columnFilters.some((f) => f.id === columnId))
              }
            >
              <FilterIcon />
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
