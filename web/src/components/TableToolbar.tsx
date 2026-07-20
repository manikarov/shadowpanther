import type { ColumnFiltersState } from "@tanstack/react-table";
import { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from "react";
import type { ColumnGroup } from "../config/charts";
import { FilterIcon, SearchIcon } from "./icons";
import type { HasValueFilter } from "./DataTable";

/** The search + filter state of one or more tables. A page with a single table
 *  lets DataTable own this; a page split into many tables (the levelling
 *  progression, 12 brackets per faction) holds it here instead and drives every
 *  table from one toolbar, so the controls aren't repeated a dozen times. */
export interface TableControls {
  globalFilter: string;
  setGlobalFilter: Dispatch<SetStateAction<string>>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
  activeGroups: Set<string>;
  toggleGroup: (label: string) => void;
}

export function useTableControls(defaultGroups?: string[]): TableControls {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  // Most groups start collapsed - "unnecessary" columns only appear once a chip
  // is switched on; a chart may opt some groups (e.g. Damage) on from the start.
  const groupKey = (defaultGroups ?? []).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => new Set(defaultGroups), [groupKey]);
  const [activeGroups, setActiveGroups] = useState<Set<string>>(initial);

  const toggleGroup = useCallback((label: string) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  return {
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
    activeGroups,
    toggleGroup,
  };
}

export function TableToolbar({
  controls,
  columnGroups,
  hasValueFilters,
  rowCount,
}: {
  controls: TableControls;
  columnGroups?: ColumnGroup[];
  hasValueFilters?: HasValueFilter[];
  rowCount: number;
}) {
  const { globalFilter, setGlobalFilter, columnFilters, setColumnFilters, activeGroups } = controls;

  function toggleHasValueFilter(columnId: string, checked: boolean) {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== columnId);
      return checked ? [...rest, { id: columnId, value: true }] : rest;
    });
  }

  return (
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
            onClick={() => controls.toggleGroup(group.label)}
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
  );
}
